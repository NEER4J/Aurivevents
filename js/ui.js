/* ===== ui.js — mobile shell: app bar, drawer, floating dock, page transitions ===== */
(function () {
  const ICON = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    events: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M8 14h3"/>',
    mytasks: '<path d="M9 11.5l2.2 2.2L16 9"/><rect x="3.5" y="3.5" width="17" height="17" rx="4"/>',
    approvals: '<path d="M20 6 9 17l-5-5"/>',
    reimb: '<rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="M2.5 10.5h19M6.5 15h3"/>',
    vendors: '<path d="M3 9.5 4.5 4h15L21 9.5"/><path d="M3 9.5c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3"/><path d="M5 12.5V20h14v-7.5"/>',
    crew: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5a6.5 6.5 0 0 1 3 5.5"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    inbox: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    overview: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    _: '<circle cx="12" cy="12" r="8.5"/>'
  };
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ICON._}</svg>`;
  const dev = () => document.getElementById('device');
  const openDrawer = () => dev().classList.add('drawer-open');
  const closeDrawer = () => dev().classList.remove('drawer-open');

  /* The app bar replaces the old in-page "viewing as" strip. */
  topbar = () => '';

  // Drawer controls + "More" tab opens the drawer instead of a modal.
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-ui],[data-act="more-nav"],.side .nav a');
    if (!t) return;
    if (t.matches('[data-act="more-nav"]') || t.dataset.ui === 'drawer') { e.preventDefault(); e.stopPropagation(); openDrawer(); return }
    if (t.dataset.ui === 'drawer-close') { e.preventDefault(); closeDrawer(); return }
    if (t.matches('.side .nav a')) closeDrawer();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer() });

  function initials(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() }

  function decorate() {
    const d = dev(); if (!d) return;
    const tabbar = document.getElementById('tabbar');
    let session = null; try { session = currentSession() } catch (e) {}
    const shell = !!(session && tabbar && tabbar.children.length);
    d.classList.toggle('no-shell', !shell);
    closeDrawer();
    if (!shell) return;
    const u = me();
    // App bar
    document.getElementById('ab-avatar').textContent = initials(u && u.name);
    const n = unread(); const dot = document.querySelector('#ab-inbox .ab-dot'); if (dot) dot.hidden = !n;
    // Tab bar with icons
    [...tabbar.querySelectorAll('a')].forEach(a => {
      if (a.dataset.dec) return;
      const key = a.dataset.act === 'more-nav' ? 'more' : (a.getAttribute('href') || '').slice(1);
      const cnt = a.querySelector('.cnt'); const c = cnt ? cnt.textContent : '';
      if (cnt) cnt.remove();
      const label = ({ Reimbursements: 'Reimburse' })[a.textContent.replace('▾', '').trim()] || a.textContent.replace('▾', '').trim();
      a.innerHTML = `<span class="ti">${svg(key)}${c ? `<b class="tb">${c === '•' ? '' : esc(c)}</b>` : ''}</span><span class="tl">${esc(label)}</span>`;
      a.dataset.dec = '1';
    });
    if (!tabbar.querySelector('a.on')) { let r = ''; try { r = route() } catch (e) {} if (r === 'event') { const h = tabbar.querySelector('a[href="#home"],a[href="#events"]'); if (h) h.classList.add('on') } }
    moveDockIndicator();
    // Drawer footer: cloud account, company switcher, team access
    const foot = document.getElementById('side-account');
    const C = window.AURIV_CLOUD;
    if (foot && !(C && C.user)) foot.innerHTML = installRow() ? `<div class="cloud-card">${installRow()}</div>` : '';
    if (foot && C && C.user) {
      const ws = workspaces(); const sh = C.currentShared();
      const owner = sh ? sh.owner_id === C.user.id : (u && u.role === 'owner' && !S.sample);
      foot.innerHTML = (`<div class="cloud-card">
        <div class="cc-row"><span class="cc-dot"></span><span id="cloud-state">${C.state === 'saving' ? 'Syncing…' : C.state === 'offline' ? 'Offline — will sync later' : 'Synced to cloud'}</span></div>
        <div class="cc-mail">${esc(C.user.email)}${C.isDemo() ? ' · demo account' : ''}</div>
        <label for="ui-ws" class="cc-lbl">Company</label>
        <select id="ui-ws" data-ui-ws>${ws.map(x => `<option value="${esc(x.id)}" ${x.id === WS ? 'selected' : ''}>${esc(x.name)}${C.shared.some(s => s.local_id === x.id) ? ' · team' : ''}</option>`).join('')}</select>
        <div class="row" style="gap:6px">
          ${(owner || sh) && !C.isDemo() ? `<button class="btn sm" data-ui-act="team">${sh ? 'Team access' : 'Share with team'}</button>` : ''}
          <button class="btn sm" data-act="ws-new">+ New company</button>
          ${sh && !owner ? '<button class="btn sm danger" data-ui-act="leave">Leave</button>' : ''}
          ${C.isDemo() ? '<button class="btn sm" data-ui-act="reset-demo">Reset demo</button>' : ''}
          <button class="btn sm" data-ui-act="signout">Sign out</button>
        </div>${installRow()}<div style="display:none">
        </div></div>`);
    }
  }
  /* ---------- install the app (PWA) ---------- */
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function installRow() {
    if (document.documentElement.classList.contains('standalone')) return '';
    if (window.__installPrompt) return '<button class="install-row" data-ui-act="install"><span class="ir-ic"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg></span><span><b>Install the app</b><small>Opens full screen from your home screen</small></span></button>';
    if (isIOS()) return '<button class="install-row" data-ui-act="install-ios"><span class="ir-ic"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5M5 13v8h14v-8"/></svg></span><span><b>Add to Home Screen</b><small>Use it like an app on your iPhone</small></span></button>';
    return '';
  }
  window.addEventListener('beforeinstallprompt', () => setTimeout(() => { try { decorate() } catch (e) {} }, 0));
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-ui-act="install"],[data-ui-act="install-ios"]'); if (!b) return;
    if (b.dataset.uiAct === 'install-ios') { closeDrawer(); return openModal(`${hd('Add to Home Screen')}<ol class="ios-steps"><li>Tap the <b>Share</b> button <span class="muted">(the square with an arrow)</span> in Safari.</li><li>Scroll and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. Aurivevents now opens full screen, like an app.</li></ol><div class="ft"><button class="btn pri" data-act="close">Got it</button></div>`) }
    const pr = window.__installPrompt; if (!pr) return;
    pr.prompt(); const r = await pr.userChoice.catch(() => null); window.__installPrompt = null; document.documentElement.classList.remove('can-install');
    if (r && r.outcome === 'accepted') toast('Installing Aurivevents'); try { decorate() } catch (err) {}
  });

  document.addEventListener('change', e => {
    if (!e.target.matches('[data-ui-ws]')) return;
    closeDrawer(); switchWorkspace(e.target.value);
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ui-act]'); if (!b) return;
    const a = b.dataset.uiAct, C = window.AURIV_CLOUD;
    if (a === 'reset-demo') { if (confirm('Reset the demo company back to its sample data?')) C.resetDemo(); return }
    if (a === 'leave') { if (confirm('Leave ' + S.company.name + '? You will lose access until the owner invites you again.')) C.leave(); return }
    if (a === 'team') { closeDrawer(); teamModal(); return }
    if (a === 'signout') { b.disabled = true; b.textContent = 'Signing out…'; C.signOut(); return }
    if (a === 'share-now') { b.disabled = true; b.textContent = 'Sharing…'; C.shareCurrent().then(() => { toast('Company shared'); teamModal() }).catch(err => { b.disabled = false; b.textContent = 'Share this company'; toast(err.message) }); return }
    if (a === 'rm-member') { if (!confirm('Remove ' + b.dataset.email + ' from this company?')) return; C.removeMember(b.dataset.email).then(() => { toast('Removed'); teamModal() }).catch(err => toast(err.message)); return }
    if (a === 'copy-link') { const t = location.origin + location.pathname; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Link copied'), () => prompt('Copy this link', t)) }
  });

  async function teamModal() {
    const C = window.AURIV_CLOUD; const sh = C.currentShared();
    if (!sh) {
      return openModal(`${hd('Share with your team')}
        <p>Put <b>${esc(S.company.name)}</b> in the cloud so your team can sign in from their own phones. Everyone works on the same events, and changes show up for the others within seconds.</p>
        <div class="note small">What each person can see still follows their role in <b>Settings → Team</b> (owner, planner, manager, staff).</div>
        <div class="ft"><button class="btn" data-act="close">Not now</button><button class="btn pri" data-ui-act="share-now">Share this company</button></div>`);
    }
    openModal(`${hd('Team access')}<div id="team-body" class="boot" style="min-height:120px"><div class="boot-spin"></div></div>`);
    let rows = [];
    try { rows = await C.members() } catch (err) { const tb = document.getElementById('team-body'); if (tb) tb.outerHTML = `<div class="alert small">${esc(err.message)}</div>`; return }
    const tb = document.getElementById('team-body'); if (!tb) return;
    const owner = sh.owner_id === C.user.id;
    const name = id => { const x = S.users.find(u => u.id === id); return x ? `${esc(x.name)} · ${esc((ROLES[x.role] || {}).label || x.role)}` : '<span class="muted">Unknown team member</span>' };
    const linked = new Set(rows.map(r => r.app_user_id));
    const free = S.users.filter(u => u.active !== false && !linked.has(u.id));
    tb.outerHTML = `<div class="list">${rows.map(r => `<div class="item row between" style="flex-wrap:nowrap">
        <div style="min-width:0"><div class="t" style="overflow-wrap:anywhere">${esc(r.email)}</div><div class="meta">${name(r.app_user_id)}</div></div>
        <div class="row" style="gap:6px;flex-wrap:nowrap">${r.user_id ? '<span class="pill ok">Joined</span>' : '<span class="pill warn">Invited</span>'}
        ${owner && r.user_id !== C.user.id ? `<button class="btn sm danger" data-ui-act="rm-member" data-email="${esc(r.email)}" aria-label="Remove">✕</button>` : ''}</div></div>`).join('')}</div>
      ${owner ? (free.length ? `<form id="f-team" style="margin-top:8px"><h3 style="margin-top:12px">Invite someone</h3>
        <label for="tm-email">Their email</label><input id="tm-email" type="email" required placeholder="name@company.com" inputmode="email">
        <label for="tm-user">They are</label><select id="tm-user">${free.map(u => `<option value="${esc(u.id)}">${esc(u.name)} · ${esc((ROLES[u.role] || {}).label || u.role)}</option>`).join('')}</select>
        <div class="help">Not in the list? Add them first under Settings → Team, then come back.</div>
        <div class="ft"><button class="btn" type="button" data-ui-act="copy-link">Copy app link</button><button class="btn pri" type="submit">Send invite</button></div></form>
        <p class="help">They sign up at the app link with this email. The company appears for them automatically.</p>`
      : '<div class="note small" style="margin-top:12px">Everyone on your team already has access. Add more people under Settings → Team.</div>') : '<p class="help">Only the owner can invite or remove people.</p>'}`;
    const f = document.getElementById('f-team');
    if (f) f.addEventListener('submit', e => {
      e.preventDefault(); const em = document.getElementById('tm-email').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(em)) return toast('Enter a valid email');
      C.invite(em, document.getElementById('tm-user').value).then(() => { toast('Invite saved'); teamModal() }).catch(err => toast(err.message));
    });
  }

  /* ---------- floating dock: sliding indicator ---------- */
  function moveDockIndicator() {
    const ind = document.getElementById('dock-ind'), tb = document.getElementById('tabbar'); if (!ind || !tb) return;
    const on = tb.querySelector('a.on');
    if (!on) { ind.style.opacity = '0'; return }
    ind.style.opacity = '1';
    requestAnimationFrame(() => { ind.style.width = on.offsetWidth + 'px'; ind.style.transform = `translateX(${on.offsetLeft}px)` });
  }

  /* ---------- page transitions ---------- */
  const TAB_ORDER = ['home', 'events', 'mytasks', 'approvals', 'more'];
  let lastRoute = null, lastHash = null;
  function transition() {
    let r = ''; try { r = route() } catch (e) {}
    const h = location.hash;
    const app = document.getElementById('app'); if (!app) return;
    if (h === lastHash) { lastRoute = r; return }
    let cls = 'pg-tab';
    if (r === 'event' && lastRoute !== 'event') cls = 'pg-fwd';
    else if (lastRoute === 'event' && r !== 'event') cls = 'pg-back';
    else if (TAB_ORDER.includes(r) && TAB_ORDER.includes(lastRoute)) cls = TAB_ORDER.indexOf(r) > TAB_ORDER.indexOf(lastRoute) ? 'pg-fwd' : 'pg-back';
    if (lastHash === null) cls = 'pg-tab';
    lastRoute = r; lastHash = h;
    [...app.children].slice(0, 14).forEach((c, i) => c.style.setProperty('--i', i));
    app.classList.remove('pg-fwd', 'pg-back', 'pg-tab', 'pg-in'); void app.offsetWidth;
    app.classList.add(cls, 'pg-in');
    clearTimeout(transition.t); transition.t = setTimeout(() => app.classList.remove('pg-fwd', 'pg-back', 'pg-tab', 'pg-in'), 1300);
  }

  /* ---------- bottom sheets: animate out, hide dock while open ---------- */
  const _close = closeModal;
  closeModal = function () {
    const bg = document.querySelector('#modal .modal-bg');
    if (bg && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const ghost = bg.cloneNode(true); ghost.classList.add('modal-ghost'); ghost.removeAttribute('data-act');
      ghost.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      dev().insertBefore(ghost, document.getElementById('modal')); setTimeout(() => ghost.remove(), 320);
    }
    return _close.apply(this, arguments);
  };
  new MutationObserver(() => dev().classList.toggle('modal-open', !!document.querySelector('#modal .modal'))).observe(document.getElementById('modal'), { childList: true });

  const _render = render;
  render = function () { const r = _render.apply(this, arguments); try { decorate() } catch (e) { console.error(e) } try { if (window.AURIV_VISUAL && !dev().classList.contains('no-shell')) AURIV_VISUAL.enhance() } catch (e) { console.error(e) } try { transition() } catch (e) {} return r };

  /* In-place updates (same screen: show all/fewer, ticking, filters) keep the scroll position,
     skip entry animations, and only fade in what is new. */
  let prevHash = null, lastTap = null;
  document.addEventListener('click', e => { lastTap = { el: e.target, at: Date.now() } }, true);
  function anchorInfo(app) {
    if (!lastTap || Date.now() - lastTap.at > 1000 || !app.contains(lastTap.el)) return null;
    const t = lastTap.el.closest('[data-act]') || lastTap.el;
    const cards = [...app.querySelectorAll('.card')]; const card = t.closest('.card');
    return { act: t.dataset && t.dataset.act, idx: card ? cards.indexOf(card) : -1, off: t.getBoundingClientRect().top };
  }
  function restoreAnchor(app, sc, a) {
    if (!a) return;
    const card = a.idx >= 0 ? app.querySelectorAll('.card')[a.idx] : null;
    const el = (card && a.act && card.querySelector(`[data-act="${a.act}"]`)) || (a.act && app.querySelector(`[data-act="${a.act}"]`)) || null;
    if (el) sc.scrollTop += el.getBoundingClientRect().top - a.off;
  }
  const keyOf = el => (el.dataset.id || '') + '|' + el.textContent.replace(/\s+/g, ' ').trim().slice(0, 80);
  const _renderTop = render;
  render = function () {
    const app = document.getElementById('app'), sc = document.getElementById('scroller');
    const same = prevHash !== null && location.hash === prevHash; prevHash = location.hash;
    const top = sc ? sc.scrollTop : 0;
    const anchor = same && app ? anchorInfo(app) : null;
    const before = same && app ? new Set([...app.querySelectorAll('.item, .card, .evcard, tr')].map(keyOf)) : null;
    const r = _renderTop.apply(this, arguments);
    if (same && app) {
      if (sc) { sc.scrollTop = top; restoreAnchor(app, sc, anchor) }
      app.classList.add('no-anim');
      [...app.querySelectorAll('.item, .card, .evcard, tr')].forEach(el => { if (!before.has(keyOf(el)) && !el.parentElement.closest('.appear')) el.classList.add('appear') });
      clearTimeout(render.t); render.t = setTimeout(() => { app.classList.remove('no-anim'); app.querySelectorAll('.appear').forEach(e => e.classList.remove('appear')) }, 700);
    }
    return r;
  };

})();
