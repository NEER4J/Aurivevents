# Aurivevents

Event-company operations app — quotes, vendors, client money, crew, run sheets — with a mobile-first UI.
The web app renders as a phone layout everywhere (framed on desktop) so it matches the upcoming mobile app.

**Live:** https://neer4j.github.io/Aurivevents/

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
Auth is email + password. Each user's data is stored in `public.app_state` (one JSON row per user, protected by RLS)
and synced from the device a moment after every change; the app keeps working offline and catches up when back online.

Set up the database once (creates the table, policies and the demo account):

```bash
supabase login
supabase link --project-ref qbtuodsyoqitukxqlptc
supabase db push
```

…or paste `supabase/migrations/20261101000000_app_state.sql` into the Supabase SQL editor and run it.

**Demo account:** `demo@aurivevents.app` / `AurivDemo#2026` (or tap *Explore the demo* on the sign-in screen).

## Run locally
```bash
python3 -m http.server 8080
```
Then open http://localhost:8080.
