# Aurivevents

Event-company operations app — quotes, vendors, client money, crew, run sheets — with a mobile-first UI.
The web app renders as a phone layout everywhere (framed on desktop) so it matches the upcoming mobile app.

**Live:** https://aurivevents.vercel.app/

## How the app is organised
The v5.10 look (black and white, Google Sans Flex, rounded cards, photo ticket cards, smooth motion) over the v9.5
features, at every width:
- **Phone and tablet:** app bar (search, alerts, avatar) and a floating dock with a sliding indicator —
  Home · Events · Vendors · Company (owner) or Tasks · More. Sheets open from below on a phone, as a drawer on a tablet.
- **Desktop (1100 px and up):** a quiet side menu (Home, Events, Tasks, Calendar, Vendors, Company, Needs attention,
  More, Setup) with your avatar at the bottom; details open in a drawer from the right.
- **Screens:** Home greets you with the next event as a photo card and what is coming up; Events are photo ticket
  cards with status chips; an event opens on a photo hero with the six money numbers and pill tabs; Vendors are
  directory cards with your cost history; More lists every other screen, grouped, with search.
- **Theme:** System, Light or Dark — from the avatar sheet, More › App or Account. Kept on the device.
- **Motion:** screens fade and their sections rise; segmented controls and tab strips slide; sheets and the drawer
  slide away when closed; custom dropdowns open as a picker sheet.

Roles: Owner, Event planner, Manager, Coordinator, Staff and Accountant, each seeing only what they need.

## Install as an app (PWA)
Open the site on a phone → menu → **Install the app** (Android/Chrome) or **Add to Home Screen** (iPhone, Safari).
`sw.js` caches the app so it opens with no signal; expenses added offline show **Waiting to sync** and upload when
the connection returns. When adding new files to the app, add them to the `SHELL` list in `sw.js` and bump `VERSION`.

## Structure
```
index.html            App shell: app bar, dock, theme before first paint
css/app.css           v9.5 base → v3 design system (from v5.10) → sign-in → frame and screens (in that order)
js/config.js          Supabase URL + publishable key + demo credentials
js/cloud.js           Supabase auth gate + cloud sync (loads the app scripts, moves v5.10 data to v9.5 keys)
js/core.js, js/x*.js  App modules, v5.1 → v9.5: rules, records, actions (load order is in js/cloud.js)
js/help.js            Help & tutorials page
js/account.js         Account page: sync, company, team access, theme, install, sign out
js/screens.js         Main screens in the v5.10 look; sections as cards; drawer; calendar items; sign-in card
js/shell.js           App bar, dock, side menu, account sheet, theme, sliding pills, page motion
js/controls.js        Custom dropdowns (picker sheet) and phone-friendly tables
js/search.js          Search everything (/ or ⌘K)
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
