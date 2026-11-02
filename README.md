# Aurivevents

Event-company operations app — quotes, vendors, client money, crew, run sheets — with a mobile-first UI.
The web app renders as a phone layout everywhere (framed on desktop) so it matches the upcoming mobile app.

**Live:** https://aurivevents.vercel.app/

## How the app is organised
- **Dock:** Home (today: first thing, money tiles, needs attention, coming up, cash weeks) · Events · Vendors ·
  Company (owner) / Reimbursements (staff) · **More**.
- **More** lists every other v5.10 tool, grouped: Work · Clients & sales · People & vendors · Money · Reports ·
  Setup & admin. Each tool screen has a "‹ More" back button. Search finds tools too.
- **Event page:** six numbers + Client / Vendors / Expenses / Changes, and **⋯** for Quote, Budget, Scope, Tasks,
  Crew, Run sheet, Client approvals, Other income, Documents, Activity, Access, Guests, Production, Travel…
- **Forms:** everyday fields first; the rest under **More options** (a TDS rate that will be deducted always stays visible).
- **Settings:** company, team, categories, export, and **All settings** for the full v5.10 settings.
Roles: Owner and Staff first; Event planner, Manager and Accountant are also available. See `js/simple.js`.

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
