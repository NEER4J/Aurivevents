/* ===== nav.js — simple, always-visible navigation =====
   Phone and tablet (under 1100 px): a bottom tab bar with the same four places for everyone in a role,
   plus More (the full menu sheet). Desktop (1100 px and up): the side menu, each place with an icon.
   Nothing here changes what a person may open; it only draws the links the app already allows. */
(function () {
  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IC = {
    home: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>'),
    events: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8.5 3v4M15.5 3v4"/>'),
    mytasks: svg('<path d="M4 6.5 6 8.5l3-3.5M4 13.5l2 2 3-3.5M12 7h8M12 14h8M12 19.5h8"/>'),
    calendar: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8.5 3v4M15.5 3v4M8 14h2M14 14h2M8 17.5h2"/>'),
    week: svg('<path d="M4 6h16M4 12h16M4 18h16M9 6v12M15 6v12"/>'),
    stuck: svg('<path d="M5 21V4h11l-1.5 4L16 12H5"/>'),
    approvals: svg('<path d="M4 12.5 9 17.5 20 6.5"/>'),
    overview: svg('<path d="M4 20V10l8-6 8 6v10"/><path d="M9 20v-5h6v5"/>'),
    cockpit: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 12l4-3M12 7v1M7 12h1M16 12h1"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.2 6.2l2.1 2.1M17.7 15.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 17.8l2.1-2.1M17.7 8.3l2.1-2.1"/>'),
    setup: null, account: svg('<circle cx="12" cy="8" r="4"/><path d="M4 20.5c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>'),
    inbox: svg('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    reimb: svg('<rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="M2.5 10.5h19M6.5 15h3"/>'),
    vendors: svg('<path d="M3 9.5 4.5 4h15L21 9.5"/><path d="M3 9.5c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3"/><path d="M5 12.5V20h14v-7.5"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
    flows: null, more: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    dot: svg('<circle cx="12" cy="12" r="2.5"/>')
  };
  IC.setup = IC.settings; IC.flows = IC.help;
  const icon = k => IC[k] || IC.dot;
  const wide = () => window.innerWidth >= 1100;
  const linkPage = () => /^#?(duty|jobcard|handoff|portal|vendor-link|vendorack|client\/|pay\/|rsvp|family|guestinfo|register|enquire|login)/.test(location.hash.slice(1));

  /* bottom bar: phone and tablet. Same places as the v9.5 phone bar, with plain labels. */
  bar93 = function () {
    let b = document.getElementById('bar93');
    const show = !!currentSession() && !wide() && !linkPage() && !!document.querySelector('.v-page') && !document.querySelector('#app .login');
    document.body.classList.toggle('has93bar', show);
    if (!show) { if (b) b.remove(); return }
    const cur = route(); const n = attnCounts().things; const staff = me().role === 'staff';
    const items = staff
      ? [['home', 'Home'], ['mytasks', 'Tasks'], ['calendar', 'Calendar']]
      : [['home', 'Home'], ['events', 'Events'], ['mytasks', 'Tasks'], ['stuck', 'Attention', n]];
    const on = k => cur === k || (cur === 'event' && k === 'events');
    const html = items.map(([k, l, c]) => `<a href="#${k}" class="${on(k) ? 'on' : ''}" ${on(k) ? 'aria-current="page"' : ''}>${icon(k)}<span>${T(l)}${c ? ` <i>${c}</i>` : ''}</span></a>`).join('')
      + `<button data-act="v7-nav" aria-label="${T('More')}" class="${items.some(([k]) => on(k)) ? '' : 'on'}">${icon('more')}<span>${T('More')}</span></button>`;
    if (!b) { b = document.createElement('nav'); b.id = 'bar93'; b.setAttribute('aria-label', 'Main'); document.body.appendChild(b) }
    if (b.innerHTML !== html) b.innerHTML = html;
  };

  /* side menu: an icon on every place, so it scans like an app */
  function railIcons() {
    document.querySelectorAll('#rail > a[href^="#"]').forEach(a => {
      if (a.querySelector('.ri')) return;
      const k = a.getAttribute('href').slice(1);
      a.insertAdjacentHTML('afterbegin', `<span class="ri">${icon(k)}</span>`);
      const label = [...a.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
      if (label) { const s = document.createElement('span'); s.className = 'rl'; s.textContent = label.textContent; label.replaceWith(s) }
    });
  }
  /* menu sheet rows get the same icons */
  function sheetIcons() {
    document.querySelectorAll('.modal a.v-row.noleft[href^="#"]').forEach(a => {
      if (a.dataset.ic) return; a.dataset.ic = '1';
      a.classList.remove('noleft'); a.insertAdjacentHTML('afterbegin', `<span class="ri">${icon(a.getAttribute('href').slice(1))}</span>`);
    });
  }

  const _render = render;
  render = function () { const r = _render.apply(this, arguments); try { railIcons() } catch (e) { console.error('nav', e) } return r };
  new MutationObserver(() => { try { railIcons(); sheetIcons() } catch (e) {} }).observe(document.body, { childList: true, subtree: true });
  let w0 = window.innerWidth;
  window.addEventListener('resize', () => { if ((w0 >= 1100) !== wide()) { w0 = window.innerWidth; try { bar93() } catch (e) {} } });
})();
