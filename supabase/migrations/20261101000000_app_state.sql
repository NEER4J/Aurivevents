-- Aurivevents cloud storage
-- One row per signed-in user holds that user's full app state (all workspaces), synced from the device.

create extension if not exists pgcrypto;

create table if not exists public.app_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  rev        bigint not null default 0,
  device     text,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "own state: read"   on public.app_state;
drop policy if exists "own state: insert" on public.app_state;
drop policy if exists "own state: update" on public.app_state;
drop policy if exists "own state: delete" on public.app_state;

create policy "own state: read"   on public.app_state for select to authenticated using (auth.uid() = user_id);
create policy "own state: insert" on public.app_state for insert to authenticated with check (auth.uid() = user_id);
create policy "own state: update" on public.app_state for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own state: delete" on public.app_state for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on public.app_state to authenticated;

-- Demo account (email already confirmed): demo@aurivevents.app / AurivDemo#2026
do $$
declare uid uuid;
begin
  select id into uid from auth.users where email = 'demo@aurivevents.app';
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
            'demo@aurivevents.app', crypt('AurivDemo#2026', gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', '{"name":"Demo"}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text,
            jsonb_build_object('sub', uid::text, 'email', 'demo@aurivevents.app', 'email_verified', true),
            'email', now(), now(), now());
  end if;
end $$;
