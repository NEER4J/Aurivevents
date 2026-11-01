/* ===== ui.js — mobile shell: app bar, drawer, icon tab bar ===== */
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
    document.getElementById('ab-sub').innerHTML = esc(S.company.name) + (S.sample ? ' <span class="ab-tag">Sample</span>' : '');
    document.getElementById('ab-avatar').textContent = initials(u && u.name);
    const n = unread(); const dot = document.querySelector('#ab-inbox .ab-dot'); if (dot) dot.hidden = !n;
    // Tab bar with icons
    [...tabbar.querySelectorAll('a')].forEach(a => {
      if (a.dataset.dec) return;
      const key = a.dataset.act === 'more-nav' ? 'more' : (a.getAttribute('href') || '').slice(1);
      const cnt = a.querySelector('.cnt'); const c = cnt ? cnt.textContent : '';
      if (cnt) cnt.remove();
      const label = a.textContent.replace('▾', '').trim();
      a.innerHTML = `<span class="ti">${svg(key)}${c ? `<b class="tb">${c === '•' ? '' : esc(c)}</b>` : ''}</span><span class="tl">${esc(label)}</span>`;
      a.dataset.dec = '1';
    });
    // Drawer footer: cloud account
    const foot = document.getElementById('sidefoot');
    const C = window.AURIV_CLOUD;
    if (foot && C && C.user && !foot.querySelector('.cloud-card')) {
      foot.insertAdjacentHTML('afterbegin', `<div class="cloud-card"><div class="cc-row"><span class="cc-dot"></span><span id="cloud-state">${C.state === 'saving' ? 'Syncing…' : 'Synced to cloud'}</span></div><div class="cc-mail">${esc(C.user.email)}${C.isDemo() ? ' <span class="ab-tag">Demo</span>' : ''}</div>${C.isDemo() ? '<button class="btn sm" data-ui-act="reset-demo">Reset demo data</button>' : ''}</div>`);
    }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ui-act="reset-demo"]'); if (!b) return;
    if (confirm('Reset the demo company back to its sample data?')) window.AURIV_CLOUD.resetDemo();
  });

  const _render = render;
  render = function () { const r = _render.apply(this, arguments); try { decorate() } catch (e) { console.error(e) } return r };
})();
