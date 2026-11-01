-- Aurivevents: shared company workspaces (team access) + file storage
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared company workspaces
-- ---------------------------------------------------------------------------
create table if not exists public.shared_workspaces (
  id         uuid primary key default gen_random_uuid(),
  local_id   text not null unique,               -- the app's workspace id (ws_xxxx)
  name       text not null,
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,  -- that workspace's app state
  rev        bigint not null default 1,           -- bumps on every save (optimistic locking)
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.shared_workspaces(id) on delete cascade,
  email        text not null,                     -- invite is by email (lower-case)
  user_id      uuid references auth.users(id) on delete cascade,  -- filled when they sign in
  app_user_id  text not null,                     -- which team member in the app they are (role comes from the app)
  invited_by   uuid default auth.uid() references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  primary key (workspace_id, email)
);
create index if not exists workspace_members_user_idx on public.workspace_members(user_id);

-- Helpers (security definer avoids RLS recursion between the two tables)
create or replace function public.is_ws_owner(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shared_workspaces w where w.id = ws and w.owner_id = auth.uid());
$$;

create or replace function public.is_ws_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_ws_owner(ws)
      or exists (select 1 from public.workspace_members m where m.workspace_id = ws and m.user_id = auth.uid());
$$;

alter table public.shared_workspaces enable row level security;
alter table public.workspace_members enable row level security;

drop policy if exists "ws: members read"    on public.shared_workspaces;
drop policy if exists "ws: owner creates"   on public.shared_workspaces;
drop policy if exists "ws: owner renames"   on public.shared_workspaces;
drop policy if exists "ws: owner deletes"   on public.shared_workspaces;
create policy "ws: members read"  on public.shared_workspaces for select to authenticated using (public.is_ws_member(id));
create policy "ws: owner creates" on public.shared_workspaces for insert to authenticated with check (owner_id = auth.uid());
create policy "ws: owner renames" on public.shared_workspaces for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "ws: owner deletes" on public.shared_workspaces for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "members: read"         on public.workspace_members;
drop policy if exists "members: owner adds"   on public.workspace_members;
drop policy if exists "members: owner edits"  on public.workspace_members;
drop policy if exists "members: owner removes" on public.workspace_members;
create policy "members: read"          on public.workspace_members for select to authenticated using (public.is_ws_member(workspace_id));
create policy "members: owner adds"    on public.workspace_members for insert to authenticated with check (public.is_ws_owner(workspace_id));
create policy "members: owner edits"   on public.workspace_members for update to authenticated using (public.is_ws_owner(workspace_id)) with check (public.is_ws_owner(workspace_id));
create policy "members: owner removes" on public.workspace_members for delete to authenticated using (public.is_ws_owner(workspace_id) or user_id = auth.uid());

grant select, insert, update, delete on public.shared_workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;

-- Link pending invites to the signed-in user (matched by email)
create or replace function public.claim_invites() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.workspace_members
     set user_id = auth.uid()
   where user_id is null
     and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
  get diagnostics n = row_count;
  return n;
end $$;

-- Save a workspace only if nobody else saved since we last read it.
-- Returns the new rev, or -1 when someone else saved first (client reloads and retries).
create or replace function public.save_workspace(p_id uuid, p_data jsonb, p_base_rev bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare r bigint;
begin
  if not public.is_ws_member(p_id) then
    raise exception 'not a member of this workspace' using errcode = '42501';
  end if;
  update public.shared_workspaces
     set data = p_data, rev = rev + 1, updated_by = auth.uid(), updated_at = now()
   where id = p_id and rev = p_base_rev
  returning rev into r;
  return coalesce(r, -1);
end $$;

grant execute on function public.claim_invites() to authenticated;
grant execute on function public.save_workspace(uuid, jsonb, bigint) to authenticated;
grant execute on function public.is_ws_member(uuid) to authenticated;
grant execute on function public.is_ws_owner(uuid) to authenticated;

-- Live updates when a teammate saves
do $$ begin
  alter publication supabase_realtime add table public.shared_workspaces;
exception when duplicate_object then null; when undefined_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- File storage (documents, photos, receipts)
--   u/<user id>/<workspace>/<file id>   personal workspaces
--   w/<shared workspace uuid>/<file id> shared workspaces
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 15728640)
on conflict (id) do nothing;

create or replace function public.can_access_file(path text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare parts text[] := string_to_array(path, '/');
begin
  if parts[1] = 'u' then
    return parts[2] = auth.uid()::text;
  elsif parts[1] = 'w' and parts[2] ~ '^[0-9a-f-]{36}$' then
    return public.is_ws_member(parts[2]::uuid);
  end if;
  return false;
end $$;
grant execute on function public.can_access_file(text) to authenticated;

drop policy if exists "files: read"   on storage.objects;
drop policy if exists "files: add"    on storage.objects;
drop policy if exists "files: change" on storage.objects;
drop policy if exists "files: remove" on storage.objects;
create policy "files: read"   on storage.objects for select to authenticated using (bucket_id = 'files' and public.can_access_file(name));
create policy "files: add"    on storage.objects for insert to authenticated with check (bucket_id = 'files' and public.can_access_file(name));
create policy "files: change" on storage.objects for update to authenticated using (bucket_id = 'files' and public.can_access_file(name)) with check (bucket_id = 'files' and public.can_access_file(name));
create policy "files: remove" on storage.objects for delete to authenticated using (bucket_id = 'files' and public.can_access_file(name));
