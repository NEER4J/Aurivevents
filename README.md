# Aurivevents

Event-company operations app — quotes, vendors, client money, crew, run sheets — with a mobile-first UI.
The web app renders as a phone layout everywhere (framed on desktop) so it matches the upcoming mobile app.

**Live:** https://aurivevents.vercel.app/

## Basic app (default) and advanced tools
The app follows the *Basic App Build Guide*: Home (events) · New event · Event page with six numbers and
Client money / Vendors / Expenses / Changes · Reimbursements · Vendor directory · Company overview (owner) · Settings.
Two roles: **Owner** (everything) and **Staff** (adds events, vendors, payments and expenses; never sees profit).

Everything else that already exists in the code (quotes, tasks, crew, run sheets, guests, client portal, bank
reconciliation…) is hidden, not deleted. An owner can turn it on per company: **Settings → Advanced tools**.
See `js/simple.js`.

## Install as an app (PWA)
Open the site on a phone → menu → **Install the app** (Android/Chrome) or **Add to Home Screen** (iPhone, Safari).
`sw.js` caches the app so it opens with no signal; expenses added offline show **Waiting to sync** and upload when
the connection returns. When adding new files to the app, add them to the `SHELL` list in `sw.js` and bump `VERSION`.

## Structure
```
index.html            App shell (device frame, app bar, drawer, tab bar)
css/app.css           Design system
js/config.js          Supabase URL + publishable key + demo credentials
js/cloud.js           Supabase auth gate + cloud sync (loads the app scripts)
js/ui.js              Mobile shell behaviour (drawer, icon tab bar, app bar, install)
js/simple.js          Basic app from the build guide (default) + advanced-tools switch
js/visual.js          Photos, hero headers, ticket cards, layout tidying
js/controls.js        Custom dropdowns, phone-friendly tables
sw.js                 Service worker (offline app shell)
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
