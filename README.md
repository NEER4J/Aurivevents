# Aurivevents

Event-company operations app — quotes, vendors, client money, crew, run sheets — with a mobile-first UI.
The web app renders as a phone layout everywhere (framed on desktop) so it matches the upcoming mobile app.

**Live:** https://aurivevents.vercel.app/

## How the app is organised
One layout at three widths, black and white, with red only for anything late:
- **Phone (under 760 px):** page title on top, sections as grouped cards, the main action above a bottom tab bar
  (Home · Events · Tasks · Attention · More). Details open as sheets from below.
- **Tablet (760–1099 px):** the same pages, wider; the main action sits in the page header; details open in a drawer
  from the right.
- **Desktop (1100 px and up):** a side menu with icons, pages up to 1120 px wide, Home as a two-column dashboard,
  details in a drawer from the right (Esc or a click outside closes it).

Features are those of the v9.5 build: status-first Home, tasks, calendar and week board, the change loop with vendors
and clients, crew duties, the owner cockpit, inventory and print jobs, event templates, client statements, margin
rollups, money checks, and the full v5.10 toolset (quotes, vendor orders, payments, guests, production, reports).
Roles: Owner, Event planner, Manager, Coordinator, Staff and Accountant, each seeing only what they need.
The **Account** page holds cloud sync, the company switcher, team access, install and sign out.

## Install as an app (PWA)
Open the site on a phone → menu → **Install the app** (Android/Chrome) or **Add to Home Screen** (iPhone, Safari).
`sw.js` caches the app so it opens with no signal; expenses added offline show **Waiting to sync** and upload when
the connection returns. When adding new files to the app, add them to the `SHELL` list in `sw.js` and bump `VERSION`.

## Structure
```
index.html            App shell (rail and detail drawer are added at boot)
css/app.css           Design system: v9.5 base, then the black-and-white theme and the layout (at the end)
js/config.js          Supabase URL + publishable key + demo credentials
js/cloud.js           Supabase auth gate + cloud sync (loads the app scripts, moves v5.10 data to v9.5 keys)
js/core.js, js/x*.js  App modules, v5.1 → v9.5 (load order is defined in js/cloud.js)
js/help.js            Help & tutorials page
js/account.js         Account page: sync, company, team access, install, sign out
js/nav.js             Bottom tab bar (phone and tablet) and menu icons
js/layout.js          Production layout: sections as cards, header actions, detail drawer, dashboard Home
sw.js                 Service worker (offline app shell)
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
