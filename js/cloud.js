/* =====================================================================
   Aurivevents cloud layer (Supabase)
   - Gates the app behind Supabase Auth (email + password, demo account)
   - Pulls the signed-in user's state into localStorage before the app boots
   - Pushes every change back (debounced) so data follows the user across devices
   The app itself keeps working offline on localStorage; this file only mirrors it.
   ===================================================================== */
(function () {
  'use strict';
  const CFG = window.AURIV_CONFIG || {};
  const PREFIX = 'aurivevents';
  const META_UID = 'auriv.cloud.uid';
  const META_AT = 'auriv.cloud.at';
  const LOCAL_ONLY = 'auriv.localOnly';
  const APP_SCRIPTS = ['core', 'x00_framework', 'x01_access', 'x02_data', 'x03_fixes', 'x04_scope', 'x05_vendors',
    'x06_sales', 'x07_finance', 'x08_crew', 'x09_eventday', 'x10_usability', 'x11_reporting', 'x12_guests',
    'x13_production', 'x14_about', 'x15_v56', 'x16_about56', 'x17_v57', 'x18_v58', 'x19_v59', 'x20_v510',
    'ui', 'x99_boot'];

  const configured = !!(CFG.supabaseUrl && CFG.supabaseKey && window.supabase && window.supabase.createClient);
  const sb = configured ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'auriv.auth' }
  }) : null;

  const CLOUD = window.AURIV_CLOUD = {
    enabled: configured, client: sb, user: null, state: 'idle', dirty: false, lastAt: null,
    isDemo: () => !!(CLOUD.user && CFG.demo && CLOUD.user.email === CFG.demo.email),
    signOut, resetDemo, flush: () => push(true)
  };

  /* ---------------- helpers ---------------- */
  const $app = () => document.getElementById('app');
  const device = () => document.getElementById('device');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const appKeys = () => { const k = []; for (let i = 0; i < localStorage.length; i++) { const n = localStorage.key(i); if (n && n.startsWith(PREFIX)) k.push(n) } return k };
  const rawSet = Storage.prototype.setItem, rawRemove = Storage.prototype.removeItem;
  function clearAppData() { appKeys().forEach(k => rawRemove.call(localStorage, k)); try { Object.keys(sessionStorage).filter(k => k.startsWith(PREFIX)).forEach(k => sessionStorage.removeItem(k)) } catch (e) {} }
  function snapshot() { const o = {}; appKeys().forEach(k => { o[k] = localStorage.getItem(k) }); return o }
  function setState(s) { CLOUD.state = s; const d = device(); if (d) d.dataset.cloud = s; const el = document.getElementById('cloud-state'); if (el) el.textContent = label(s) }
  function label(s) { return { saving: 'Syncing…', synced: 'Synced to cloud', error: 'Sync failed — will retry', offline: 'Offline — will sync later', idle: 'Cloud sync on' }[s] || '' }

  /* ---------------- boot the app scripts in order ---------------- */
  let appLoaded = false;
  function loadApp() {
    if (appLoaded) return; appLoaded = true;
    document.documentElement.classList.remove('auth-mode');
    APP_SCRIPTS.forEach(n => { const s = document.createElement('script'); s.src = 'js/' + n + '.js'; s.async = false; document.body.appendChild(s) });
    const t = setInterval(() => { if (window.__ready) { clearInterval(t); afterReady() } }, 60);
  }

  function afterReady() {
    if (!CLOUD.user) return;
    // Supabase is the identity: open the in-app session as the workspace owner so there is no second sign-in.
    try {
      if (typeof currentSession === 'function' && !currentSession()) {
        const owner = (S.users || []).find(u => u.role === 'owner' && u.active !== false) || (S.users || [])[0];
        if (owner) { startSession(owner.id, CLOUD.isDemo() ? 'sample' : 'cloud'); if (!location.hash || location.hash === '#') location.hash = 'home'; render() }
      }
    } catch (e) { console.error(e) }
    // Sign out also ends the cloud session.
    if (typeof ACTS === 'object') ACTS['signout'] = () => signOut();
    watchStorage();
    setState(navigator.onLine ? 'synced' : 'offline');
    if (!localStorage.getItem(META_AT) || CLOUD.firstRun) push(true);
  }

  /* ---------------- sync ---------------- */
  let timer = null;
  function watchStorage() {
    const mark = k => { if (typeof k === 'string' && k.startsWith(PREFIX)) { CLOUD.dirty = true; clearTimeout(timer); timer = setTimeout(() => push(), 1500) } };
    Storage.prototype.setItem = function (k, v) { rawSet.call(this, k, v); if (this === localStorage) mark(k) };
    Storage.prototype.removeItem = function (k) { rawRemove.call(this, k); if (this === localStorage) mark(k) };
    window.addEventListener('online', () => { if (CLOUD.dirty) push(); else setState('synced') });
    window.addEventListener('offline', () => setState('offline'));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { if (CLOUD.dirty) push(true) } else checkRemote() });
    window.addEventListener('pagehide', () => { if (CLOUD.dirty) push(true) });
  }

  let pushing = null;
  async function push(now) {
    if (!CLOUD.user) return;
    if (!navigator.onLine) { setState('offline'); return }
    if (pushing) { if (now) await pushing; else { clearTimeout(timer); timer = setTimeout(() => push(), 1500); return } }
    CLOUD.dirty = false; setState('saving');
    const at = new Date().toISOString();
    pushing = sb.from('app_state').upsert({ user_id: CLOUD.user.id, data: snapshot(), updated_at: at, device: navigator.userAgent.slice(0, 120) })
      .then(({ error }) => {
        if (error) throw error;
        CLOUD.lastAt = at; rawSet.call(localStorage, META_AT, at); setState('synced');
      })
      .catch(e => { console.error('cloud push', e); CLOUD.dirty = true; setState('error'); clearTimeout(timer); timer = setTimeout(() => push(), 8000) })
      .finally(() => { pushing = null });
    return pushing;
  }

  async function pull(user) {
    const { data, error } = await sb.from('app_state').select('data,updated_at').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    const sameUser = localStorage.getItem(META_UID) === user.id;
    if (data && data.data && Object.keys(data.data).length) {
      const localAt = sameUser ? localStorage.getItem(META_AT) : null;
      // Keep local only if it is the same user's newer unsynced copy.
      if (!(localAt && localAt > data.updated_at)) {
        clearAppData();
        Object.entries(data.data).forEach(([k, v]) => { if (k.startsWith(PREFIX) && typeof v === 'string') rawSet.call(localStorage, k, v) });
        rawSet.call(localStorage, META_AT, data.updated_at);
      } else CLOUD.firstRun = true;
    } else {
      if (!sameUser) clearAppData();
      rawRemove.call(localStorage, META_AT);
      CLOUD.firstRun = true;
    }
    rawSet.call(localStorage, META_UID, user.id);
  }

  async function checkRemote() {
    if (!CLOUD.user || CLOUD.dirty || pushing || !navigator.onLine) return;
    const { data } = await sb.from('app_state').select('updated_at').eq('user_id', CLOUD.user.id).maybeSingle();
    const mine = localStorage.getItem(META_AT);
    if (data && mine && data.updated_at > mine && !document.querySelector('.modal')) {
      await pull(CLOUD.user);
      location.reload();
    }
  }

  async function signOut() {
    try { if (CLOUD.dirty) await push(true) } catch (e) {}
    try { if (typeof endSession === 'function') endSession('signed out') } catch (e) {}
    await sb.auth.signOut();
    clearAppData(); rawRemove.call(localStorage, META_UID); rawRemove.call(localStorage, META_AT);
    sessionStorage.clear();
    location.replace(location.pathname);
  }

  async function resetDemo() {
    if (!CLOUD.isDemo()) return;
    await sb.from('app_state').delete().eq('user_id', CLOUD.user.id);
    clearAppData(); rawRemove.call(localStorage, META_AT); sessionStorage.clear();
    location.replace(location.pathname);
  }

  /* ---------------- auth screen ---------------- */
  const AUTH = { mode: 'signin', busy: false, msg: '', kind: '' };
  function renderAuth() {
    document.documentElement.classList.add('auth-mode');
    const signup = AUTH.mode === 'signup';
    $app().innerHTML = `
    <div class="auth">
      <div class="auth-hero">
        <div class="auth-mark"><img src="assets/icon.svg" alt=""></div>
        <h1>${signup ? 'Create your account' : 'Welcome back'}</h1>
        <p class="muted">${signup ? 'Start running your events with clear margins.' : 'Sign in to pick up where you left off.'}</p>
      </div>
      <form id="auth-form" class="auth-form" novalidate>
        <label for="au-email">Email</label>
        <input id="au-email" type="email" autocomplete="email" inputmode="email" placeholder="you@company.com" required>
        <label for="au-pass">Password</label>
        <input id="au-pass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="${signup ? 'At least 6 characters' : 'Your password'}" minlength="6" required>
        ${AUTH.msg ? `<div class="auth-msg ${AUTH.kind}">${esc(AUTH.msg)}</div>` : ''}
        <button class="btn pri big" type="submit" ${AUTH.busy ? 'disabled' : ''}>${AUTH.busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
      </form>
      ${CFG.demo ? `<div class="auth-or"><span>or</span></div>
      <button class="btn big auth-demo" type="button" id="au-demo" ${AUTH.busy ? 'disabled' : ''}>
        <span class="ad-ic"><svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg></span>
        <span><b>Explore the demo</b><small>A sample event company, fully loaded</small></span>
      </button>` : ''}
      <p class="auth-switch">${signup ? 'Already have an account?' : 'New to Aurivevents?'} <a href="#" id="au-toggle">${signup ? 'Sign in' : 'Create an account'}</a></p>
      <p class="auth-local"><a href="#" id="au-local">Continue without an account</a> · data stays on this device</p>
    </div>`;
    const f = document.getElementById('auth-form');
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('au-email').value.trim(), password = document.getElementById('au-pass').value;
      if (!/^\S+@\S+\.\S+$/.test(email)) return flash('Enter a valid email address.', 'bad');
      if (password.length < 6) return flash('Password must be at least 6 characters.', 'bad');
      busy(true);
      if (signup) {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
        if (error) return busy(false, error.message, 'bad');
        if (!data.session) { AUTH.mode = 'signin'; return busy(false, 'Check your inbox to confirm your email, then sign in.', 'ok') }
        return enter(data.session.user);
      }
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return busy(false, /confirm/i.test(error.message) ? 'Please confirm your email first — check your inbox.' : error.message, 'bad');
      enter(data.user);
    });
    const demo = document.getElementById('au-demo');
    if (demo) demo.addEventListener('click', async () => {
      busy(true);
      const { data, error } = await sb.auth.signInWithPassword(CFG.demo);
      if (error) return busy(false, 'The demo account is not available right now (' + error.message + ').', 'bad');
      enter(data.user);
    });
    document.getElementById('au-toggle').addEventListener('click', e => { e.preventDefault(); AUTH.mode = signup ? 'signin' : 'signup'; AUTH.msg = ''; renderAuth() });
    document.getElementById('au-local').addEventListener('click', e => { e.preventDefault(); sessionStorage.setItem(LOCAL_ONLY, '1'); if (localStorage.getItem(META_UID)) { clearAppData(); rawRemove.call(localStorage, META_UID); rawRemove.call(localStorage, META_AT) } loadApp() });
  }
  function flash(msg, kind) { AUTH.msg = msg; AUTH.kind = kind; renderAuth() }
  function busy(b, msg, kind) { AUTH.busy = b; if (msg !== undefined) { AUTH.msg = msg; AUTH.kind = kind } else if (b) AUTH.msg = ''; renderAuth() }

  async function enter(user) {
    CLOUD.user = user;
    try { await pull(user) }
    catch (e) {
      console.error(e);
      if (/app_state/.test(e.message || '')) { await sb.auth.signOut(); CLOUD.user = null; return busy(false, 'Cloud database is not set up yet (run the Supabase migration).', 'bad') }
      // Network trouble: fall back to whatever is on the device and sync later.
    }
    sessionStorage.removeItem(LOCAL_ONLY);
    if (!location.hash || location.hash === '#') history.replaceState(null, '', '#home');
    loadApp();
  }

  /* ---------------- start ---------------- */
  async function start() {
    const hash = location.hash || '';
    // Public links (client portal, RSVP, vendor acknowledgements, payments…) open without an account.
    const publicLink = /^#(vendorack|enquire|client\/|portal\/|pay\/|jobcard\/|rsvp|family|guestinfo|register)/.test(hash);
    if (!configured || publicLink || sessionStorage.getItem(LOCAL_ONLY)) return loadApp();
    let session = null;
    try { session = (await sb.auth.getSession()).data.session } catch (e) {}
    if (session) {
      CLOUD.user = session.user;
      try { await pull(session.user) } catch (e) { console.warn('pull failed, using device copy', e) }
      return loadApp();
    }
    renderAuth();
  }
  start();
})();
