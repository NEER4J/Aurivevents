/* ===== shell.js — app bar, floating dock, side menu, theme, motion =====
   Phone and tablet: the app bar on top and the floating dock (with its sliding indicator) at the bottom.
   Desktop (1100+): the side menu replaces the dock. The avatar opens the account sheet (theme, account,
   switch user, help, sign out). Screens fade in and their sections rise; sheets slide away when closed;
   re-drawing the same screen keeps the scroll position and only animates what is new. */
(function () {
  const P = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICON = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    events: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M8 14h3"/>',
    mytasks: '<path d="M9 11.5l2.2 2.2L16 9"/><rect x="3.5" y="3.5" width="17" height="17" rx="4"/>',
    approvals: '<path d="M20 6 9 17l-5-5"/>',
    reimb: '<rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="M2.5 10.5h19M6.5 15h3"/>',
    vendors: '<path d="M3 9.5 4.5 4h15L21 9.5"/><path d="M3 9.5c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3"/><path d="M5 12.5V20h14v-7.5"/>',
    crew: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5a6.5 6.5 0 0 1 3 5.5"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h2M14.5 13.5h2M7.5 17h2"/>',
    week: '<path d="M4 6h16M4 12h16M4 18h16M9 6v12M15 6v12"/>',
    stuck: '<path d="M5 21V4h11l-1.5 4L16 12H5"/>',
    inbox: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    overview: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    cockpit: '<circle cx="12" cy="12" r="8.5"/><path d="M12 12l4-3M12 6.5v1M6.5 12h1M16.5 12h1"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.2 6.2l2.1 2.1M17.7 15.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 17.8l2.1-2.1M17.7 8.3l2.1-2.1"/>',
    account: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.8"/><circle cx="12" cy="17.3" r=".6" fill="currentColor"/>',
    tools: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    switch: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>', out: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    auto: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    clients: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    _: '<circle cx="12" cy="12" r="2.5"/>'
  };
  ICON.setup = ICON.settings; ICON.flows = ICON.help;
  const icon = k => P(ICON[k] || ICON._);
  const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const wide = () => window.innerWidth >= 1100;
  const LINK = /^#?(duty|jobcard\/|handoff|portal|vendor-link|vendorack|client\/|pay\/|rsvp|family|guestinfo|register|enquire)/;

  /* ---------------- theme: system · light · dark, kept on this device ---------------- */
  const TK = 'auriv.theme';
  const themeNow = () => { try { return localStorage.getItem(TK) || 'system' } catch (e) { return 'system' } };
  function applyTheme(t) {
    const root = document.documentElement;
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => { if (t === 'system') { m.content = /dark/.test(m.media) ? '#000000' : '#F4F4F4' } else m.content = dark ? '#000000' : '#F4F4F4' });
    document.querySelectorAll('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
  }
  function setTheme(t) { try { if (t === 'system') localStorage.removeItem(TK); else localStorage.setItem(TK, t) } catch (e) {} applyTheme(t) }
  const seg = () => `<div class="theme-seg" role="group" aria-label="Theme">${[['system', 'System', 'auto'], ['light', 'Light', 'sun'], ['dark', 'Dark', 'moon']].map(([k, l, i]) => `<button type="button" data-theme-set="${k}" aria-pressed="${themeNow() === k}">${icon(i)}<span>${l}</span></button>`).join('')}</div>`;
  document.addEventListener('click', e => { const b = e.target.closest('[data-theme-set]'); if (b) { e.preventDefault(); e.stopPropagation(); setTheme(b.dataset.themeSet) } }, true);
  applyTheme(themeNow());
  window.AURIV_THEME = { get: themeNow, set: setTheme, seg };

  /* ---------------- the v9.5 phone bar gives way to the dock ---------------- */
  bar93 = function () { const b = document.getElementById('bar93'); if (b) b.remove(); document.body.classList.remove('has93bar') };

  /* ---------------- dock ---------------- */
  function dockItems() {
    const u = me(); const items = [['home', 'Home']];
    if (u.role === 'staff') items.push(['mytasks', 'Tasks'], ['calendar', 'Calendar']);
    else { items.push(['events', 'Events']); if (can('vendors')) items.push(['vendors', 'Vendors']); if (can('profit')) items.push(['overview', 'Company']); else items.push(['mytasks', 'Tasks']) }
    items.push(['tools', 'More']);
    return items.filter(([k]) => k === 'tools' || k === 'home' || (typeof reachable !== 'function' || reachable(k)));
  }
  function dock(r) {
    const bar = document.getElementById('dockbar'); if (!bar) return;
    const items = dockItems(); const keys = items.map(x => x[0]);
    const act = r === 'event' ? 'events' : r === 'vendor' ? 'vendors' : keys.includes(r) ? r : 'tools';
    let att = 0; try { att = attnCounts().things } catch (e) {}
    const html = items.map(([k, l]) => `<a href="#${k}" class="${act === k ? 'on' : ''}" ${act === k ? 'aria-current="page"' : ''} aria-label="${T(l)}"><span class="ti">${icon(k)}${k === 'tools' && att ? '<i class="tb"></i>' : ''}</span><span class="tl">${T(l)}</span></a>`).join('');
    if (bar.dataset.h !== html) { bar.innerHTML = html; bar.dataset.h = html }
    moveInd();
  }
  function moveInd() {
    const ind = document.getElementById('dock-ind'), bar = document.getElementById('dockbar'); if (!ind || !bar) return;
    const on = bar.querySelector('a.on'); if (!on) { ind.style.opacity = '0'; return }
    ind.style.opacity = '1';
    requestAnimationFrame(() => { ind.style.width = on.offsetWidth + 'px'; ind.style.transform = `translateX(${on.offsetLeft}px)` });
  }
  window.addEventListener('resize', moveInd);

  /* ---------------- side menu (desktop): a short, calm list ---------------- */
  function railItems() {
    const u = me(); const ok = k => typeof reachable !== 'function' || reachable(k);
    let att = 0; try { att = attnCounts().things } catch (e) {}
    let signoffs = ''; try { const n = navSheetRows().flatMap(g => g[1]).find(r => r[0] === 'approvals'); signoffs = n && n[2] || '' } catch (e) {}
    const plan = [['home', 'Home'], ['events', 'Events'], ['mytasks', 'Tasks'], ['calendar', 'Calendar'], ['week', 'Week board'], ['stuck', 'Needs attention', att], ['approvals', 'Sign-offs', signoffs]];
    const biz = []; if (can('vendors')) biz.push(['vendors', 'Vendors']); biz.push(['clients', 'Clients'], ['crew', 'Crew'], ['reimb', 'Reimbursements']); if (can('profit') || u.role === 'manager') biz.push(['overview', 'Company']);
    const rest = [['tools', 'More']]; if (u.role === 'owner') rest.push(['settings', 'Setup']);
    return [['Work', plan.filter(([k]) => k === 'home' || ok(k))], ['People & money', biz.filter(([k]) => ok(k) && (k !== 'clients' || can('client') || can('profit')) && (k !== 'crew' || can('crew.manage') || can('crew.assign') || can('profit')))], ['', rest.filter(([k]) => k === 'tools' || ok(k))]].filter(g => g[1].length);
  }
  renderRail = function () {
    const r = document.getElementById('rail'); if (!r) return;
    if (!currentSession() || document.querySelector('#app .login')) { r.innerHTML = ''; return }
    let cur = ''; try { cur = route() } catch (e) {}
    const groups = railItems(); const keys = groups.flatMap(g => g[1].map(x => x[0]));
    const on = k => cur === k || (cur === 'event' && k === 'events') || (cur === 'vendor' && k === 'vendors') || (k === 'tools' && !keys.includes(cur) && cur !== 'event' && cur !== 'vendor');
    const link = ([k, l, c]) => `<a href="#${k}" class="${on(k) ? 'on' : ''}"><span class="ri">${icon(k)}</span><span class="rl">${esc(T(l))}</span>${c ? `<span class="cnt">${c}</span>` : ''}</a>`;
    const u = me();
    let un = 0; try { un = unread() } catch (e) {}
    r.innerHTML = `<div class="rail-brand">Aurivevents<small>${esc(S.company.name)}</small></div>
      <div class="rail-tools"><button type="button" class="rail-search" data-act="sc-search">${icon('search')}<span>${T('Search')}</span><kbd>⌘K</kbd></button><a href="#inbox" class="rail-inbox ${cur === 'inbox' ? 'on' : ''}" aria-label="${T('Inbox')}">${icon('inbox')}${un ? '<i></i>' : ''}</a></div>
      ${groups.map(([l, items], i) => `${i ? '<div class="rail-sep"></div>' : ''}${l ? `<div class="rail-grp">${esc(T(l))}</div>` : ''}<nav class="rail-nav">${items.map(link).join('')}</nav>`).join('')}
      <button type="button" class="rail-me" id="rail-me"><span class="rm-av">${esc(initials(u.name))}</span><span class="rm-tx"><b>${esc(u.name)}</b><small>${esc(ROLES[u.role].label)}</small></span></button>`;
  };
  function rail() { try { renderRail() } catch (e) { console.error('rail', e) } }

  /* ---------------- app bar and account sheet ---------------- */
  function appbar() {
    const av = document.getElementById('ab-avatar'); const u = me(); if (av && u) av.textContent = initials(u.name);
    let n = 0; try { n = unread() } catch (e) {}
    const dot = document.querySelector('#ab-inbox .ab-dot'); if (dot) dot.hidden = !n;
  }
  function accountSheet() {
    const u = me(); const C = window.AURIV_CLOUD || {};
    const row = (k, l, s, attrs) => `<a class="tool-row" ${attrs}><span class="tr-ic">${icon(k)}</span><span class="tr-tx"><b>${esc(T(l))}</b>${s ? `<small>${esc(s)}</small>` : ''}</span><svg class="tr-go" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></a>`;
    openModal(`${hd('')}<div class="acct-sheet"><div class="ac-head"><span class="ac-av">${esc(initials(u.name))}</span><div><div class="ac-name">${esc(u.name)}</div><div class="ac-sub">${esc(ROLES[u.role].label)} · ${esc(S.company.name)}${C.user ? ' · ' + esc(C.user.email) : ''}</div></div></div>
      ${seg()}
      <div class="card tools-card" style="background:var(--fill)">${row('account', 'Account & sync', C.user ? 'Company, team access, install' : 'This device only', 'href="#account"')}${row('switch', 'Switch user', 'Open the app as someone else on the team', 'href="#" data-act="switch-user"')}${row('help', 'Help', 'How it works, questions, words we use', 'href="#help"')}${row('out', 'Sign out', '', 'href="#" data-act="signout"')}</div></div>`);
  }
  document.addEventListener('click', e => {
    const av = e.target.closest('#ab-avatar, #rail-me'); if (av) { e.preventDefault(); accountSheet(); setTimeout(() => thumbs(false), 30); return }
    const a = e.target.closest('.acct-sheet a[href^="#"]:not([data-act])'); if (a) setTimeout(() => { try { closeModal() } catch (er) {} }, 0);
  });

  /* ---------------- sheets: slide away when closed; the dock steps aside while one is open ---------------- */
  const _close = closeModal;
  closeModal = function () {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const bg = document.querySelector('#modal .modal-bg');
      if (bg) { const g = bg.cloneNode(true); g.classList.add('modal-ghost'); g.removeAttribute('data-act'); g.querySelectorAll('[id]').forEach(n => n.removeAttribute('id')); document.body.appendChild(g); setTimeout(() => g.remove(), 320) }
      const pm = document.querySelector('#panel .modal:not([data-home-panel])');
      if (pm && document.body.classList.contains('drawer-open')) { const g = document.createElement('div'); g.className = 'panel-ghost'; g.appendChild(pm.cloneNode(true)); g.querySelectorAll('[id]').forEach(n => n.removeAttribute('id')); g.scrollTop = document.getElementById('panel').scrollTop; document.body.appendChild(g); setTimeout(() => g.remove(), 440) }
    }
    return _close.apply(this, arguments);
  };
  new MutationObserver(() => document.body.classList.toggle('modal-open', !!document.querySelector('#modal .modal'))).observe(document.getElementById('modal'), { childList: true });

  /* ---------------- screen entry: fade, sections rise in turn ---------------- */
  let lastHash = null, lastTap = null;
  document.addEventListener('click', e => { lastTap = { el: e.target, at: Date.now() } }, true);
  const ANIM = '.ui-group, .ui-lead, .ui-card-lead, .evcard, .vd-card, .home-hero > *, .six, .v-legacy > *';
  const keyOf = el => (el.dataset.id || '') + '|' + el.textContent.replace(/\s+/g, ' ').trim().slice(0, 80);
  function motion(same, before, y) {
    const app = document.getElementById('app'); if (!app) return;
    app.classList.remove('pg-in', 'no-anim'); void app.offsetWidth;
    if (!same) {
      [...app.querySelectorAll(ANIM)].slice(0, 16).forEach((el, i) => el.style.setProperty('--i', i));
      app.classList.add('pg-in'); clearTimeout(motion.t); motion.t = setTimeout(() => app.classList.remove('pg-in'), 1400);
      return;
    }
    window.scrollTo(0, y);
    app.classList.add('no-anim');
    [...app.querySelectorAll('.v-row, .v-ban, .evcard, .vd-card, .item, tr')].forEach(el => { if (!before.has(keyOf(el))) el.classList.add('appear') });
    clearTimeout(motion.t); motion.t = setTimeout(() => { app.classList.remove('no-anim'); app.querySelectorAll('.appear').forEach(x => x.classList.remove('appear')) }, 700);
  }

  /* ---------------- sliding pill under every segmented control and tab strip ---------------- */
  const SEGS = '.v-seg, .theme-seg';
  const prevPos = {};
  function thumbs(animate) {
    document.querySelectorAll(SEGS).forEach((c, i) => {
      const a = [...c.children].find(x => x.matches('[aria-pressed="true"], [aria-selected="true"], .on'));
      let t = c.querySelector(':scope > .seg-thumb');
      if (!a) { if (t) t.style.opacity = '0'; return }
      if (!t) { t = document.createElement('span'); t.className = 'seg-thumb'; c.insertBefore(t, c.firstChild) }
      c.classList.add('has-thumb');
      const pos = { x: a.offsetLeft, y: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight };
      const k = (c.closest('.modal') ? 'm|' : location.hash.split('/')[0] + '|') + c.className.split(' ')[0] + '|' + i;
      const prev = prevPos[k];
      const set = p => { t.style.transform = `translate(${p.x}px,${p.y}px)`; t.style.width = p.w + 'px'; t.style.height = p.h + 'px' };
      t.style.transition = 'none';
      if (prev && animate && (prev.x !== pos.x || prev.y !== pos.y || prev.w !== pos.w)) { set(prev); t.style.opacity = '1'; void t.offsetWidth; t.style.transition = ''; set(pos) }
      else { set(pos); t.style.opacity = '1'; void t.offsetWidth; t.style.transition = '' }
      prevPos[k] = pos;
    });
  }
  window.addEventListener('resize', () => thumbs(false));
  document.addEventListener('click', e => { if (e.target.closest('[data-theme-set]')) setTimeout(() => thumbs(true), 0) });
  new MutationObserver(() => { if (document.querySelector('#modal .theme-seg, #panel .theme-seg')) thumbs(false) }).observe(document.body, { childList: true, subtree: false });
  window.AURIV_THUMBS = thumbs;

  /* ---------------- after every draw ---------------- */
  const _render = render;
  render = function () {
    const app = document.getElementById('app');
    const same = lastHash !== null && location.hash === lastHash; lastHash = location.hash;
    const y = window.scrollY;
    const before = same && app ? new Set([...app.querySelectorAll('.v-row, .v-ban, .evcard, .vd-card, .item, tr')].map(keyOf)) : null;
    const out = _render.apply(this, arguments);
    try {
      let r = ''; try { r = route() } catch (e) {}
      const login = !!document.querySelector('#app .login') || document.documentElement.classList.contains('auth-mode');
      const shell = !!currentSession() && !login && !LINK.test(location.hash);
      document.body.classList.toggle('no-shell', !shell);
      document.body.dataset.route = shell ? r : '';
      if (shell) { appbar(); dock(r); rail() }
      if (!same && shell) window.scrollTo(0, 0);
      motion(same, before, y);
      thumbs(true);
    } catch (e) { console.error('shell', e) }
    return out;
  };
})();
