# Aurivevents

Event-company operations app — quotes, vendors, client money, crew, run sheets — with a mobile-first UI.
The web app renders as a phone layout everywhere (framed on desktop) so it matches the upcoming mobile app.

**Live:** https://aurivevents.vercel.app/

## Structure
```
index.html            App shell (device frame, app bar, drawer, tab bar)
css/app.css           Design system
js/config.js          Supabase URL + publishable key + demo credentials
js/cloud.js           Supabase auth gate + cloud sync (loads the app scripts)
js/ui.js              Mobile shell behaviour (drawer, icon tab bar, app bar)
js/core.js, js/x*.js  App modules (load order is defined in js/cloud.js)
supabase/             Supabase CLI project (migrations)
```

## Supabase
- **Auth:** email + password, sign-up with email confirmation, forgot / reset password, demo account.
- **Personal data:** `public.app_state`, one JSON row per user (RLS: only you).
- **Team companies:** an owner taps *Share with team* in the menu; the company moves to `public.shared_workspaces`.
  The owner invites teammates by email and picks which team member (role) they are. Teammates sign up with that
  email and the company appears for them. Saves use optimistic locking (`save_workspace` RPC) and Realtime pushes
  changes to everyone within seconds.
- **Files** (documents, photos, receipts): Storage bucket `files`, private, per-user / per-company folders.
- Works offline; changes sync when the connection returns.

### Database setup
Run both migrations in order (SQL editor, or `supabase db push`):
1. `supabase/migrations/20261101000000_app_state.sql` — personal data + demo account
2. `supabase/migrations/20261102000000_team_and_files.sql` — team companies, realtime, file storage

**Demo account:** `demo@aurivevents.app` / `AurivDemo#2026` (or tap *Explore the demo*).

### Auth settings (Supabase dashboard → Authentication → URL Configuration)
- Site URL: `https://aurivevents.vercel.app/`
- Redirect URLs: `https://aurivevents.vercel.app/**`, `http://localhost:8080/**`

## Deploy
Hosted on Vercel (static, no build step): every push to `main` deploys to https://aurivevents.vercel.app.

## Run locally
```bash
python3 -m http.server 8080
```
Then open http://localhost:8080.
