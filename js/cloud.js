/* =====================================================================
   Aurivevents cloud layer (Supabase)
   - Auth gate: email + password, sign up, forgot / reset password, demo account
   - Personal data: one JSON row per user (app_state)
   - Shared company workspaces: one row per company (shared_workspaces), saved with
     optimistic locking (save_workspace RPC) and pushed live to teammates (Realtime)
   - Files (documents, photos): Supabase Storage bucket "files"
   The app keeps working offline on localStorage/IndexedDB; this file mirrors it.
   ===================================================================== */
(function () {
  'use strict';
  const CFG = window.AURIV_CONFIG || {};
  const PFX = 'aurivevents';
  const WS_LIST = 'aurivevents.v510.workspaces';
  const M = { uid: 'auriv.cloud.uid', at: 'auriv.cloud.at', shared: 'auriv.cloud.shared', rev: l => 'auriv.cloud.rev.' + l, dirty: l => 'auriv.cloud.dirty.' + l, fileq: 'auriv.cloud.fileq' };
  const LOCAL_ONLY = 'auriv.localOnly';
  const APP_SCRIPTS = ['core', 'x00_framework', 'x01_access', 'x02_data', 'x03_fixes', 'x04_scope', 'x05_vendors',
    'x06_sales', 'x07_finance', 'x08_crew', 'x09_eventday', 'x10_usability', 'x11_reporting', 'x12_guests',
    'x13_production', 'x14_about', 'x15_v56', 'x16_about56', 'x17_v57', 'x18_v58', 'x19_v59', 'x20_v510',
    'ui', 'x99_boot'];

  const initialHash = location.hash || '';
  const recovering = /type=recovery/.test(initialHash);
  const authError = (initialHash.match(/error_description=([^&]+)/) || [])[1];

  const configured = !!(CFG.supabaseUrl && CFG.supabaseKey && window.supabase && window.supabase.createClient);
  const sb = configured ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'auriv.auth', flowType: 'implicit' }
  }) : null;

  const CLOUD = window.AURIV_CLOUD = {
    enabled: configured, client: sb, user: null, state: 'idle', shared: [],
    isDemo: () => !!(CLOUD.user && CFG.demo && CLOUD.user.email === CFG.demo.email),
    signOut, resetDemo, flush: () => push(true),
    currentShared: () => byLid[curWS()] || null,
    shareCurrent, members, invite, removeMember, leave
  };
  let byLid = {};

  /* ---------------- helpers ---------------- */
  const $app = () => document.getElementById('app');
  const device = () => document.getElementById('device');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rawSet = Storage.prototype.setItem, rawRemove = Storage.prototype.removeItem;
  const lsGet = k => localStorage.getItem(k), lsSet = (k, v) => rawSet.call(localStorage, k, v), lsDel = k => rawRemove.call(localStorage, k);
  const curWS = () => { try { return WS } catch (e) { return null } };
  const skip = k => /\.prev$/.test(k) || k === 'aurivevents.probe';
  const lidOf = k => { const m = k.match(/^aurivevents\.(?:v510|pack)\.([^.]+)/); return m ? m[1] : null };
  const bucketOf = k => { const l = lidOf(k); return l && byLid[l] ? l : 'me' };
  function appKeys() { const k = []; for (let i = 0; i < localStorage.length; i++) { const n = localStorage.key(i); if (n && n.startsWith(PFX)) k.push(n) } return k }
  const keysOfLid = lid => appKeys().filter(k => lidOf(k) === lid);
  function snapshot(bucket) { const o = {}; appKeys().forEach(k => { if (!skip(k) && bucketOf(k) === bucket) o[k] = lsGet(k) }); return o }
  function snapshotLid(lid) { const o = {}; keysOfLid(lid).forEach(k => { if (!skip(k)) o[k] = lsGet(k) }); return o }
  function writeData(obj) { Object.entries(obj || {}).forEach(([k, v]) => { if (k.startsWith(PFX) && typeof v === 'string') lsSet(k, v) }) }
  function clearAppData() {
    appKeys().forEach(lsDel);
    Object.keys(localStorage).filter(k => k.startsWith('auriv.cloud.')).forEach(lsDel);
    try { Object.keys(sessionStorage).filter(k => k.startsWith(PFX)).forEach(k => sessionStorage.removeItem(k)) } catch (e) {}
  }
  function setState(s) { CLOUD.state = s; const d = device(); if (d) d.dataset.cloud = s; const el = document.getElementById('cloud-state'); if (el) el.textContent = label(s) }
  function label(s) { return { saving: 'Syncing…', synced: 'Synced to cloud', error: 'Sync failed — retrying', offline: 'Offline — will sync later', idle: 'Cloud sync on' }[s] || '' }
  function toastSafe(m) { try { toast(m) } catch (e) {} }
  const modalOpen = () => !!document.querySelector('.modal');
  function rebuildIndex() { byLid = {}; CLOUD.shared.forEach(w => { byLid[w.local_id] = w }) }

  /* ---------------- boot the app scripts in order ---------------- */
  let appLoaded = false;
  function loadApp() {
    if (appLoaded) return; appLoaded = true;
    document.documentElement.classList.remove('auth-mode');
    APP_SCRIPTS.forEach(n => { const s = document.createElement('script'); s.src = 'js/' + n + '.js'; s.async = false; document.body.appendChild(s) });
    const t = setInterval(() => { if (window.__ready) { clearInterval(t); afterReady() } }, 60);
  }

  /* Supabase is the identity: open the in-app session as the right team member, no second sign-in. */
  function appUserFor(lid) {
    const w = byLid[lid];
    const users = (S.users || []).filter(u => u.active !== false);
    if (w) return w.app_user_id && users.find(u => u.id === w.app_user_id) ? w.app_user_id : null;
    const owner = users.find(u => u.role === 'owner') || users[0];
    return owner ? owner.id : null;
  }
  function ensureSession() {
    if (!CLOUD.user || typeof currentSession !== 'function') return;
    if (/^#(vendorack|enquire|client\/|portal\/|pay\/|jobcard\/|rsvp|family|guestinfo|register)/.test(location.hash)) return;
    try { if (!currentSession()) { const id = appUserFor(curWS()); if (id) startSession(id, CLOUD.isDemo() ? 'sample' : 'cloud') } } catch (e) { console.error(e) }
  }

  function afterReady() {
    if (!CLOUD.user) return;
    const _render = render;
    render = function () { ensureSession(); return _render.apply(this, arguments) };
    if (typeof ACTS === 'object') ACTS['signout'] = () => signOut();
    if (!location.hash || location.hash === '#') location.hash = 'home';
    render();
    hookFiles();
    watchStorage();
    subscribeRealtime();
    setState(navigator.onLine ? 'synced' : 'offline');
    if (CLOUD.firstRun) dirty.add('me');
    Object.keys(byLid).forEach(l => { if (lsGet(M.dirty(l))) dirty.add(l) });
    if (dirty.size) push(true);
    reconcileFiles(curWS());
    flushFileQueue();
  }

  /* ---------------- pull ---------------- */
  async function pull(user) {
    try { await sb.rpc('claim_invites') } catch (e) {}
    const sameUser = lsGet(M.uid) === user.id;
    if (!sameUser) clearAppData();

    const mine = await sb.from('app_state').select('data,updated_at').eq('user_id', user.id).maybeSingle();
    if (mine.error) throw mine.error;
    const mem = await sb.from('workspace_members').select('workspace_id,app_user_id').eq('user_id', user.id);
    const ws = await sb.from('shared_workspaces').select('id,local_id,name,owner_id,rev,data,updated_at');
    const memRows = mem.error ? [] : mem.data || [];
    const wsRows = ws.error ? [] : ws.data || [];
    CLOUD.shared = wsRows.map(w => ({ id: w.id, local_id: w.local_id, name: w.name, owner_id: w.owner_id, rev: w.rev, app_user_id: (memRows.find(m => m.workspace_id === w.id) || {}).app_user_id || null }));
    rebuildIndex();

    // Personal data
    const row = mine.data;
    if (row && row.data && Object.keys(row.data).length) {
      const localAt = sameUser ? lsGet(M.at) : null;
      if (!(localAt && localAt > row.updated_at)) {
        appKeys().filter(k => bucketOf(k) === 'me').forEach(lsDel);
        Object.entries(row.data).forEach(([k, v]) => { if (bucketOf(k) === 'me' && typeof v === 'string') lsSet(k, v) });
        lsSet(M.at, row.updated_at);
      } else CLOUD.firstRun = true;
    } else { lsDel(M.at); CLOUD.firstRun = true }

    // Shared company workspaces
    wsRows.forEach(w => {
      const base = +lsGet(M.rev(w.local_id)) || 0;
      const pending = lsGet(M.dirty(w.local_id));
      if (!(pending && base === w.rev)) { keysOfLid(w.local_id).forEach(lsDel); writeData(w.data); lsSet(M.rev(w.local_id), String(w.rev)); lsDel(M.dirty(w.local_id)) }
    });
    // Workspaces this user lost access to
    let before = []; try { before = JSON.parse(lsGet(M.shared) || '[]') } catch (e) {}
    const gone = before.filter(l => !byLid[l]);
    gone.forEach(l => { keysOfLid(l).forEach(lsDel); lsDel(M.rev(l)); lsDel(M.dirty(l)) });
    lsSet(M.shared, JSON.stringify(Object.keys(byLid)));
    // Workspace list: include shared companies (first, if this user has nothing of their own yet)
    let list = []; try { list = JSON.parse(lsGet(WS_LIST) || '[]') } catch (e) {}
    list = list.filter(x => !gone.includes(x.id));
    CLOUD.shared.forEach(w => { const ex = list.find(x => x.id === w.local_id); if (ex) ex.name = w.name; else list.push({ id: w.local_id, name: w.name, createdAt: new Date().toISOString(), shared: true }) });
    if (list.length) lsSet(WS_LIST, JSON.stringify(list));
    lsSet(M.uid, user.id);
  }

  async function applyRemote(w, why) {
    const { data, error } = await sb.from('shared_workspaces').select('rev,data,name').eq('id', w.id).maybeSingle();
    if (error || !data) return;
    keysOfLid(w.local_id).forEach(lsDel); writeData(data.data);
    w.rev = data.rev; lsSet(M.rev(w.local_id), String(data.rev)); lsDel(M.dirty(w.local_id)); dirty.delete(w.local_id);
    if (curWS() === w.local_id) { try { reloadFromStorage(); render() } catch (e) { console.error(e) } if (why) toastSafe(why) }
  }

  /* ---------------- push ---------------- */
  const dirty = new Set();
  let timer = null, pushing = null;
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(() => push(), ms || 1500) }
  function watchStorage() {
    const mark = k => {
      if (typeof k !== 'string' || !k.startsWith(PFX) || skip(k)) return;
      const b = bucketOf(k); dirty.add(b); if (b !== 'me') lsSet(M.dirty(b), '1'); schedule();
    };
    Storage.prototype.setItem = function (k, v) { rawSet.call(this, k, v); if (this === localStorage) mark(k) };
    Storage.prototype.removeItem = function (k) { rawRemove.call(this, k); if (this === localStorage) mark(k) };
    window.addEventListener('online', () => { flushFileQueue(); if (dirty.size) push(); else setState('synced') });
    window.addEventListener('offline', () => setState('offline'));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { if (dirty.size) push(true) } else checkRemote() });
    window.addEventListener('pagehide', () => { if (dirty.size) push(true) });
  }

  async function push(now) {
    if (!CLOUD.user) return;
    if (!navigator.onLine) { setState('offline'); return }
    if (pushing) { if (now) { await pushing; if (dirty.size) return push(true) } else schedule(); return }
    if (!dirty.size) return;
    const buckets = [...dirty]; dirty.clear(); setState('saving');
    let failed = false;
    pushing = (async () => {
      for (const b of buckets) {
        try { if (b === 'me') await pushMe(); else await pushShared(b) }
        catch (e) { console.error('cloud push', b, e); dirty.add(b); failed = true }
      }
    })();
    try { await pushing } finally { pushing = null }
    if (failed) { setState('error'); schedule(8000) } else setState(dirty.size ? 'saving' : 'synced');
  }

  async function pushMe() {
    const at = new Date().toISOString();
    const { error } = await sb.from('app_state').upsert({ user_id: CLOUD.user.id, data: snapshot('me'), updated_at: at, device: navigator.userAgent.slice(0, 120) });
    if (error) throw error;
    lsSet(M.at, at);
  }

  async function pushShared(lid) {
    const w = byLid[lid]; if (!w) return;
    const base = +lsGet(M.rev(lid)) || w.rev;
    const { data, error } = await sb.rpc('save_workspace', { p_id: w.id, p_data: snapshot(lid), p_base_rev: base });
    if (error) throw error;
    if (data === -1) { await applyRemote(w, 'A teammate saved changes at the same time. You are seeing the latest — please redo your last change.'); return }
    w.rev = data; lsSet(M.rev(lid), String(data)); lsDel(M.dirty(lid));
  }

  async function checkRemote() {
    if (!CLOUD.user || !navigator.onLine) return;
    // Shared workspaces: catch up on anything missed while in the background
    const { data } = await sb.from('shared_workspaces').select('id,local_id,rev');
    (data || []).forEach(r => { const w = byLid[r.local_id]; if (w && r.rev > (+lsGet(M.rev(r.local_id)) || 0) && !dirty.has(r.local_id) && !modalOpen()) applyRemote(w, 'Updated with your team’s latest changes') });
    // Personal data changed on another device
    if (dirty.has('me') || pushing || modalOpen()) return;
    const me = await sb.from('app_state').select('updated_at').eq('user_id', CLOUD.user.id).maybeSingle();
    const mine = lsGet(M.at);
    if (me.data && mine && me.data.updated_at > mine && !(byLid[curWS()])) { await pull(CLOUD.user); location.reload() }
  }

  function subscribeRealtime() {
    if (!CLOUD.shared.length) return;
    try {
      sb.channel('auriv-ws').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shared_workspaces' }, pl => {
        const n = pl.new || {}; const w = byLid[n.local_id]; if (!w) return;
        if (n.rev <= (+lsGet(M.rev(w.local_id)) || 0) || dirty.has(w.local_id)) return;
        const apply = () => { if (modalOpen()) return setTimeout(apply, 2500); applyRemote(w, (n.updated_by && n.updated_by !== CLOUD.user.id) ? 'Updated by a teammate' : '') };
        apply();
      }).subscribe();
    } catch (e) { console.warn('realtime', e) }
  }

  /* ---------------- files (Supabase Storage) ---------------- */
  const BUCKET = 'files';
  const fdir = lid => byLid[lid] ? `w/${byLid[lid].id}` : `u/${CLOUD.user.id}/${lid}`;
  const fpath = (lid, id) => `${fdir(lid)}/${id}`;
  function fileQueue() { try { return JSON.parse(lsGet(M.fileq) || '[]') } catch (e) { return [] } }
  function setFileQueue(q) { lsSet(M.fileq, JSON.stringify(q.slice(-500))) }
  async function upFile(lid, id, data) {
    const { error } = await sb.storage.from(BUCKET).upload(fpath(lid, id), new Blob([data], { type: 'text/plain' }), { upsert: true });
    if (error) throw error;
  }
  function queueFile(op, lid, id) { const q = fileQueue().filter(x => !(x.lid === lid && x.id === id)); q.push({ op, lid, id }); setFileQueue(q) }
  async function flushFileQueue() {
    if (!CLOUD.user || !navigator.onLine) return;
    const q = fileQueue(); if (!q.length) return; const left = [];
    for (const it of q) {
      try {
        if (it.op === 'put') { const v = await IDB.get('files', it.lid + ':' + it.id); if (v) await upFile(it.lid, it.id, v) }
        else { const { error } = await sb.storage.from(BUCKET).remove([fpath(it.lid, it.id)]); if (error) throw error }
      } catch (e) { left.push(it) }
    }
    setFileQueue(left);
  }
  async function reconcileFiles(lid) {
    if (!CLOUD.user || !lid || !navigator.onLine) return;
    try {
      const { data: remote, error } = await sb.storage.from(BUCKET).list(fdir(lid), { limit: 1000 });
      if (error) throw error;
      const names = new Set((remote || []).filter(o => o.id || o.metadata).map(o => o.name));
      const rows = await IDB.all('files');
      const local = new Map(rows.filter(r => typeof r.key === 'string' && r.key.startsWith(lid + ':')).map(r => [r.key.slice(lid.length + 1), r.val]));
      const pendingDel = new Set(fileQueue().filter(x => x.op === 'del' && x.lid === lid).map(x => x.id));
      let got = 0;
      for (const name of names) {
        if (local.has(name) || pendingDel.has(name)) continue;
        const { data: blob, error: e2 } = await sb.storage.from(BUCKET).download(fpath(lid, name));
        if (e2 || !blob) continue;
        const txt = await blob.text();
        await IDB.put('files', lid + ':' + name, txt);
        if (curWS() === lid) FILES[name] = txt;
        got++;
      }
      for (const [id, val] of local) { if (!names.has(id) && typeof val === 'string') { try { await upFile(lid, id, val) } catch (e) { queueFile('put', lid, id) } } }
      if (got && curWS() === lid && !modalOpen()) render();
    } catch (e) { console.warn('file sync', e) }
  }
  function hookFiles() {
    const _put = putFile, _drop = dropFile, _load = loadFiles;
    putFile = function (id, data) {
      const lid = curWS(); const r = _put.apply(this, arguments);
      if (typeof data === 'string') upFile(lid, id, data).catch(() => queueFile('put', lid, id));
      return r;
    };
    dropFile = function (id) {
      const lid = curWS(); const r = _drop.apply(this, arguments);
      sb.storage.from(BUCKET).remove([fpath(lid, id)]).then(({ error }) => { if (error) queueFile('del', lid, id) }).catch(() => queueFile('del', lid, id));
      return r;
    };
    loadFiles = async function () { const r = await _load.apply(this, arguments); reconcileFiles(curWS()); return r };
  }

  /* ---------------- team: share a company, invite, remove ---------------- */
  async function shareCurrent() {
    const lid = curWS();
    if (!lid || lid === 'ws_sample' || S.sample) throw new Error('The sample company cannot be shared. Create your own company first.');
    if (byLid[lid]) return byLid[lid];
    await push(true);
    const { data: w, error } = await sb.from('shared_workspaces').insert({ local_id: lid, name: S.company.name, owner_id: CLOUD.user.id, data: snapshotLid(lid), rev: 1 }).select('id,local_id,name,owner_id,rev').single();
    if (error) throw error;
    const meId = me().id;
    const m = await sb.from('workspace_members').insert({ workspace_id: w.id, email: CLOUD.user.email.toLowerCase(), user_id: CLOUD.user.id, app_user_id: meId });
    if (m.error) throw m.error;
    w.app_user_id = meId; CLOUD.shared.push(w); rebuildIndex();
    lsSet(M.rev(lid), '1'); lsSet(M.shared, JSON.stringify(Object.keys(byLid)));
    dirty.add('me'); push(true); // personal copy no longer carries this company
    subscribeRealtime();
    // move this company's files to the shared folder
    const rows = await IDB.all('files');
    for (const r of rows) if (typeof r.key === 'string' && r.key.startsWith(lid + ':')) { try { await upFile(lid, r.key.slice(lid.length + 1), r.val) } catch (e) { queueFile('put', lid, r.key.slice(lid.length + 1)) } }
    return w;
  }
  async function members() {
    const w = byLid[curWS()]; if (!w) return [];
    const { data, error } = await sb.from('workspace_members').select('email,user_id,app_user_id,created_at').eq('workspace_id', w.id).order('created_at');
    if (error) throw error; return data || [];
  }
  async function invite(email, appUserId) {
    const w = byLid[curWS()]; if (!w) throw new Error('Share the company first');
    const { error } = await sb.from('workspace_members').upsert({ workspace_id: w.id, email: email.trim().toLowerCase(), app_user_id: appUserId });
    if (error) throw error;
  }
  async function removeMember(email) {
    const w = byLid[curWS()]; if (!w) return;
    const { error } = await sb.from('workspace_members').delete().eq('workspace_id', w.id).eq('email', email);
    if (error) throw error;
  }
  async function leave() {
    const w = byLid[curWS()]; if (!w || w.owner_id === CLOUD.user.id) return;
    await sb.from('workspace_members').delete().eq('workspace_id', w.id).eq('user_id', CLOUD.user.id);
    keysOfLid(w.local_id).forEach(lsDel); lsDel(M.rev(w.local_id));
    let list = []; try { list = JSON.parse(lsGet(WS_LIST) || '[]') } catch (e) {}
    lsSet(WS_LIST, JSON.stringify(list.filter(x => x.id !== w.local_id)));
    sessionStorage.clear(); location.reload();
  }

  /* ---------------- sign out / demo reset ---------------- */
  async function signOut() {
    try { if (dirty.size) await push(true) } catch (e) {}
    try { if (typeof endSession === 'function') endSession('signed out') } catch (e) {}
    await sb.auth.signOut();
    clearAppData(); sessionStorage.clear();
    try { indexedDB.deleteDatabase('aurivevents55') } catch (e) {}
    location.replace(location.pathname);
  }
  async function resetDemo() {
    if (!CLOUD.isDemo()) return;
    await sb.from('app_state').delete().eq('user_id', CLOUD.user.id);
    clearAppData(); sessionStorage.clear();
    location.replace(location.pathname);
  }

  /* ---------------- auth screens ---------------- */
  const AUTH = { mode: 'signin', busy: false, msg: '', kind: '' };
  const eyeBtn = `<button type="button" class="pw-eye" aria-label="Show password" data-eye><svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button>`;
  function renderAuth() {
    document.documentElement.classList.add('auth-mode');
    const m = AUTH.mode;
    const head = {
      signin: ['Welcome back', 'Sign in to pick up where you left off.'],
      signup: ['Create your account', 'Start running your events with clear margins.'],
      forgot: ['Reset your password', 'We’ll email you a link to choose a new one.'],
      newpass: ['Choose a new password', 'You’re almost back in.']
    }[m];
    const msg = AUTH.msg ? `<div class="auth-msg ${AUTH.kind}">${esc(AUTH.msg)}</div>` : '';
    const btn = t => `<button class="btn pri big" type="submit" ${AUTH.busy ? 'disabled' : ''}>${AUTH.busy ? 'Please wait…' : t}</button>`;
    let form;
    if (m === 'forgot') form = `<label for="au-email">Email</label><input id="au-email" type="email" autocomplete="email" inputmode="email" placeholder="you@company.com" value="${esc(AUTH.email || '')}">${msg}${btn('Send reset link')}`;
    else if (m === 'newpass') form = `<label for="au-pass">New password</label><div class="pw"><input id="au-pass" type="password" autocomplete="new-password" placeholder="At least 6 characters" minlength="6">${eyeBtn}</div>${msg}${btn('Save and continue')}`;
    else form = `<label for="au-email">Email</label><input id="au-email" type="email" autocomplete="email" inputmode="email" placeholder="you@company.com" value="${esc(AUTH.email || '')}">
      <div class="row between" style="margin:12px 0 6px"><label for="au-pass" style="margin:0">Password</label>${m === 'signin' ? '<a href="#" id="au-forgot" class="small" style="font-weight:700">Forgot password?</a>' : ''}</div>
      <div class="pw"><input id="au-pass" type="password" autocomplete="${m === 'signup' ? 'new-password' : 'current-password'}" placeholder="${m === 'signup' ? 'At least 6 characters' : 'Your password'}" minlength="6">${eyeBtn}</div>
      ${msg}${btn(m === 'signup' ? 'Create account' : 'Sign in')}`;
    $app().innerHTML = `
    <div class="auth">
      <div class="auth-hero">
        <div class="auth-mark"><img src="assets/icon.svg" alt=""></div>
        <h1>${head[0]}</h1><p class="muted">${head[1]}</p>
      </div>
      <form id="auth-form" class="auth-form" novalidate>${form}</form>
      ${(m === 'signin' || m === 'signup') && CFG.demo ? `<div class="auth-or"><span>or</span></div>
      <button class="btn big auth-demo" type="button" id="au-demo" ${AUTH.busy ? 'disabled' : ''}>
        <span class="ad-ic"><svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg></span>
        <span><b>Explore the demo</b><small>A sample event company, fully loaded</small></span>
      </button>` : ''}
      ${m === 'newpass' ? '' : `<p class="auth-switch">${m === 'signup' ? 'Already have an account?' : m === 'forgot' ? 'Remembered it?' : 'New to Aurivevents?'} <a href="#" id="au-toggle">${m === 'signin' ? 'Create an account' : 'Sign in'}</a></p>
      <p class="auth-local"><a href="#" id="au-local">Continue without an account</a> · data stays on this device</p>`}
    </div>`;
    wireAuth();
  }
  function wireAuth() {
    const m = AUTH.mode, F = id => document.getElementById(id);
    const val = id => (F(id) ? F(id).value : '');
    document.querySelectorAll('[data-eye]').forEach(b => b.addEventListener('click', () => { const i = b.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password' }));
    F('auth-form').addEventListener('submit', async e => {
      e.preventDefault();
      const email = val('au-email').trim(), password = val('au-pass');
      AUTH.email = email;
      if (m !== 'newpass' && !/^\S+@\S+\.\S+$/.test(email)) return flash('Enter a valid email address.', 'bad');
      if (m !== 'forgot' && password.length < 6) return flash('Password must be at least 6 characters.', 'bad');
      busy(true);
      if (m === 'forgot') {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        if (error) return busy(false, error.message, 'bad');
        AUTH.mode = 'signin'; return busy(false, 'If that email has an account, a reset link is on its way.', 'ok');
      }
      if (m === 'newpass') {
        const { data, error } = await sb.auth.updateUser({ password });
        if (error) return busy(false, error.message, 'bad');
        return enter(data.user);
      }
      if (m === 'signup') {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
        if (error) return busy(false, error.message, 'bad');
        if (!data.session) { AUTH.mode = 'signin'; return busy(false, 'Almost there — check your inbox and confirm your email, then sign in.', 'ok') }
        return enter(data.session.user);
      }
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return busy(false, /confirm/i.test(error.message) ? 'Please confirm your email first — check your inbox.' : /invalid/i.test(error.message) ? 'Wrong email or password.' : error.message, 'bad');
      enter(data.user);
    });
    const demo = F('au-demo');
    if (demo) demo.addEventListener('click', async () => {
      busy(true);
      const { data, error } = await sb.auth.signInWithPassword(CFG.demo);
      if (error) return busy(false, 'The demo account is not available right now (' + error.message + ').', 'bad');
      enter(data.user);
    });
    if (F('au-forgot')) F('au-forgot').addEventListener('click', e => { e.preventDefault(); AUTH.email = val('au-email').trim(); AUTH.mode = 'forgot'; AUTH.msg = ''; renderAuth() });
    if (F('au-toggle')) F('au-toggle').addEventListener('click', e => { e.preventDefault(); AUTH.email = val('au-email').trim(); AUTH.mode = m === 'signin' ? 'signup' : 'signin'; AUTH.msg = ''; renderAuth() });
    if (F('au-local')) F('au-local').addEventListener('click', e => { e.preventDefault(); sessionStorage.setItem(LOCAL_ONLY, '1'); if (lsGet(M.uid)) clearAppData(); loadApp() });
  }
  function flash(msg, kind) { AUTH.msg = msg; AUTH.kind = kind; renderAuth() }
  function busy(b, msg, kind) { AUTH.busy = b; if (msg !== undefined) { AUTH.msg = msg; AUTH.kind = kind } else if (b) AUTH.msg = ''; renderAuth() }

  async function enter(user) {
    CLOUD.user = user;
    try { await pull(user) }
    catch (e) {
      console.error(e);
      if (/app_state|schema cache|does not exist/.test(e.message || '')) { await sb.auth.signOut(); CLOUD.user = null; return busy(false, 'Cloud database is not set up yet (run the Supabase migrations).', 'bad') }
    }
    sessionStorage.removeItem(LOCAL_ONLY);
    if (!location.hash || location.hash === '#' || /access_token|type=/.test(location.hash)) history.replaceState(null, '', location.pathname + '#home');
    loadApp();
  }

  /* ---------------- start ---------------- */
  async function start() {
    const publicLink = /^#(vendorack|enquire|client\/|portal\/|pay\/|jobcard\/|rsvp|family|guestinfo|register)/.test(initialHash);
    if (!configured || publicLink) return loadApp();
    let session = null;
    try { session = (await sb.auth.getSession()).data.session } catch (e) {}
    if (/access_token|error_description|type=/.test(location.hash)) history.replaceState(null, '', location.pathname + (recovering ? '' : '#home'));
    if (recovering && session) { AUTH.mode = 'newpass'; return renderAuth() }
    if (session) {
      CLOUD.user = session.user;
      try { await pull(session.user) } catch (e) { console.warn('pull failed, using device copy', e) }
      return loadApp();
    }
    if (sessionStorage.getItem(LOCAL_ONLY)) return loadApp();
    if (authError) { AUTH.msg = decodeURIComponent(authError.replace(/\+/g, ' ')) + ' — please try again.'; AUTH.kind = 'bad' }
    renderAuth();
  }
  start();
})();
