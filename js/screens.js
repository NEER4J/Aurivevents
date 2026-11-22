/* ===== screens.js — the v5.10 look for the v9.5 app =====
   The feature layers (x00–x29) keep every rule, record and action. This layer decides how the main screens
   look, using the v5.10 components: photo ticket cards for events, a photo hero with the six numbers on an
   event, a greeting and "next up" card on Home, vendor directory cards, a grouped More page.
   Every other screen keeps its content and is laid out the same way: titled sections as rounded cards, the
   main action as a pill in the page header, details in a sheet (phone) or a drawer from the right (wider).
   Buttons keep their data-act, so permissions and actions are exactly those of the feature layers. */
(function () {
  const big = () => window.innerWidth >= 760;
  const IMG = 'assets/img/';
  const POOL = { wedding: ['wedding-1', 'wedding-2', 'wedding-3', 'wedding-4', 'wedding-5', 'wedding-6'], corporate: ['corporate-1', 'corporate-2', 'corporate-3', 'corporate-4'], other: ['party-1', 'party-2', 'party-3', 'party-4'] };
  const VCAT = { 'décor': 'v-decor', decor: 'v-decor', catering: 'v-catering', food: 'v-catering', photography: 'v-photography', makeup: 'v-makeup', venue: 'v-venue', music: 'v-music', sound: 'v-music', priest: 'v-priest', transport: 'v-transport' };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h };
  const evImg = e => { if (!e) return IMG + 'party-1.jpg'; if (e.cover) return e.cover; const pool = POOL[e.type] || POOL.other; return IMG + pool[hash(e.id + e.name) % pool.length] + '.jpg' };
  const vImg = cat => IMG + (VCAT[String(cat || '').toLowerCase()] || 'v-other') + '.jpg';
  const dparts = s => { if (!s) return null; const d = new Date(dOf(s) + 'T00:00:00'); if (isNaN(d)) return null; return { d: d.getDate(), m: MON[d.getMonth()], w: DOW[d.getDay()] } };
  const chip = s => { const d = dparts(s); return d ? `<span class="ev-date">${d.w} ${d.d} ${d.m}</span>` : '' };
  const pct = (a, b) => b ? (Math.round(a / b * 1000) / 10).toFixed(1).replace(/\.0$/, '') + '%' : '—';
  const todayLine = () => { const d = new Date(todayStr() + 'T00:00:00'); return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + S.company.name };
  const greet = () => { const h = +nowHM().slice(0, 2); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' };
  const evList = () => S.events.filter(e => !e.history && eventVisible(e));
  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const goIc = '<svg class="tr-go" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';

  /* one lifecycle word for an event, as in v5.10 */
  const STATUS = { enquiry: 'enquiry', quoted: 'enquiry', confirmed: 'confirmed', planning: 'progress', eventweek: 'progress', done: 'done', closed: 'done', lost: 'cancelled', cancelled: 'cancelled' };
  const STATUS_LABEL = { enquiry: 'Enquiry', confirmed: 'Confirmed', progress: 'In progress', done: 'Done', cancelled: 'Cancelled' };
  const statusOf = e => STATUS[e.stage] || 'confirmed';
  const statusPill = e => { const s = statusOf(e); return `<span class="pill ${s === 'cancelled' ? 'bad' : s === 'done' ? 'grey' : s === 'enquiry' ? 'warn' : 'ok'}">${T(STATUS_LABEL[s])}</span>` };
  /* the v9.5 status word (Late, Blocked…) when it adds something */
  const stateWord = e => { try { const [k, l] = eventSt(e); return k === 'late' || k === 'block' ? `<span class="v-st ${k}">${esc(T(l))}</span>` : '' } catch (er) { return '' } };
  const sortSoonest = list => { const t = todayStr(); const up = list.filter(e => (e.endDate || e.startDate) >= t).sort((a, b) => a.startDate.localeCompare(b.startDate)); const past = list.filter(e => (e.endDate || e.startDate) < t).sort((a, b) => b.startDate.localeCompare(a.startDate)); return up.concat(past) };
  const barOf = html => { const d = document.createElement('div'); d.innerHTML = html; const b = d.querySelector('.v-bar'); return b ? b.innerHTML : '' };
  const segOf = html => { const d = document.createElement('div'); d.innerHTML = html; return [...d.querySelectorAll('.v-page > .v-search, .v-page > .v-filters, .v-page > .v-seg')].map(x => x.outerHTML).join('') };

  /* ---------------- Events: photo ticket cards ---------------- */
  const evCard = e => {
    const money = can('profit'); let c = null; try { c = calc(e) } catch (er) {}
    const m = money && c ? (c.contract ? `<div class="ev-money"><span class="num ${c.actual < 0 ? 'neg' : ''}">${inr(c.actual)}</span><span>${pct(c.actual, c.contract)} ${T('margin')}</span></div>` : `<div class="ev-money"><span>— ${T('no contract yet')}</span></div>`) : '';
    return `<div class="card evcard" data-act="open-event" data-id="${e.id}" role="button" tabindex="0"><div class="ev-img" style="background-image:url('${evImg(e)}')">${chip(e.startDate)}</div>
      <div class="ev-body"><div class="ev-top">${statusPill(e)}${stateWord(e)}</div><div class="ev-name">${esc(e.name)}</div><div class="ev-meta">${esc(e.client || '')}${e.client ? ' · ' : ''}${fmtDate(e.startDate)}${e.endDate && e.endDate !== e.startDate ? ' – ' + fmtDate(e.endDate) : ''}${e.city ? ' · ' + esc(e.city) : ''}</div>${m}</div></div>`;
  };
  const _vEvents = vEvents;
  vEvents = function () {
    const orig = _vEvents(); const all = evList(); const f = (S.ui.sfilter || 'all');
    const chips = [['all', 'All'], ['enquiry', 'Enquiry'], ['confirmed', 'Confirmed'], ['progress', 'In progress'], ['done', 'Done'], ['cancelled', 'Cancelled']].filter(([k]) => k === 'all' || all.some(e => statusOf(e) === k));
    const list = sortSoonest(all.filter(e => f === 'all' ? statusOf(e) !== 'cancelled' : statusOf(e) === f));
    const body = `<div class="ev-chips">${chips.map(([k, l]) => `<button class="btn chip ${f === k ? 'on' : ''}" data-act="sc-filter" data-v="${k}">${T(l)}</button>`).join('')}</div>`
      + (list.length ? `<div class="ev-stack">${list.map(evCard).join('')}</div>` : `<div class="ev-empty"><div class="es-t">${all.length ? T('Nothing here') : T('No events yet')}</div><div class="es-s">${all.length ? T('Try another filter.') : T('Add your first event: the client, the date and what they are paying.')}</div></div>`);
    return vFrame({ key: 'events', title: T('Events'), sub: esc(todayLine()), body, bar: barOf(orig) });
  };
  v7act('sc-filter', SESSION, ({ v }) => { S.ui.sfilter = v; saveUI(); render() });

  /* ---------------- Vendors: directory cards ---------------- */
  const _vVendors = vVendors;
  vVendors = function () {
    const orig = _vVendors(); if (!/data-page="vendors"/.test(orig)) return orig;
    const d = document.createElement('div'); d.innerHTML = orig;
    const ids = [...d.querySelectorAll('.v-list [data-act="v8-vendor-dir"][data-id]')].map(x => x.dataset.id);
    const money = can('vendors.amounts') || can('profit');
    const card = id => {
      const v = vendor(id); if (!v) return '';
      const cms = live(S.commitments).filter(c => c.vendorId === v.id && c.status === 'agreed').map(c => ({ c, e: ev(c.eventId) })).filter(x => x.e && eventVisible(x.e)).sort((a, b) => b.e.startDate.localeCompare(a.e.startDate));
      const n = new Set(cms.map(x => x.e.id)).size, avg = cms.length ? Math.round(sum(cms, x => x.c.agreedPaise) / cms.length) : 0;
      let owed = 0; try { owed = sum(cms, x => Math.max(0, commCalc(x.c).outstanding)) } catch (er) {}
      const ph = (v.contacts && v.contacts.phone) || v.phone || '';
      return `<div class="vd-card card" data-vd="${v.id}"><div class="vd-head"><div class="vthumb" style="background-image:url('${vImg(v.category)}')"></div>
        <div class="vd-main" role="button" tabindex="0" data-act="v8-vendor-dir" data-id="${v.id}"><span class="t">${esc(v.name)}</span><div class="vd-sub"><span class="pill grey">${esc(v.category || 'Other')}</span>${ph ? `<span>${esc(ph)}</span>` : ''}</div></div>
        ${can('directory.edit') ? `<button class="btn sm" data-act="edit-dir-vendor" data-id="${v.id}">${T('Edit')}</button>` : ''}</div>
        ${money ? `<div class="vd-stats"><div><span>${T('Events')}</span><b class="num">${n}</b></div><div><span>${T('Avg agreed')}</span><b class="num">${n ? inr(avg) : '—'}</b></div><div><span>${T('Owed now')}</span><b class="num">${inr(owed)}</b></div></div>` : ''}
        ${cms.length ? `<div class="vd-label">${T('Events with them')}</div>${cms.slice(0, 3).map(x => `<a class="vd-ev" data-act="open-event" data-id="${x.e.id}" data-tab="vendors"><b>${esc(x.e.name)}</b>${money ? `<span class="num">${inr(x.c.agreedPaise)}</span>` : '<span></span>'}<small>${fmtDate(x.e.startDate)}${x.e.guests ? ' · ' + x.e.guests + ' ' + T('guests') : ''}${x.c.desc ? ' · ' + esc(x.c.desc) : ''}</small></a>`).join('')}${cms.length > 3 ? `<button class="vd-more" data-act="v8-vendor-dir" data-id="${v.id}">${T('All')} ${cms.length} ›</button>` : ''}` : ''}</div>`;
    };
    const body = ids.length ? `<div class="vd-stack">${ids.map(card).join('')}</div>` : `<div class="ev-empty"><div class="es-t">${S.vendors.length ? T('No vendors match') : T('No vendors yet')}</div><div class="es-s">${T('Everyone you pay — decorator, caterer, photographer. Saved once, reused on every event, with what you paid them each time.')}</div></div>`;
    return vFrame({ key: 'vendors', title: T('Vendors'), sub: T('Your cost history'), seg: segOf(orig), body, bar: barOf(orig) });
  };

  /* ---------------- More: every other screen, grouped ---------------- */
  const TI = d => svg(d);
  const TICON = { Work: TI('<path d="M9 11.5l2.2 2.2L16 9"/><rect x="3.5" y="3.5" width="17" height="17" rx="4"/>'), 'Clients & sales': TI('<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>'), 'People & vendors': TI('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5a6.5 6.5 0 0 1 3 5.5"/>'), Money: TI('<rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="M2.5 10.5h19M6.5 15h3"/>'), Reports: TI('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'), 'Setup & admin': TI('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'), App: TI('<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M11 18.5h2"/>') };
  const GROUPS = [
    ['Work', [['mytasks', 'Tasks', 'What is assigned to you and your team'], ['week', 'Week board', 'Every event in the next seven days, by city'], ['calendar', 'Calendar', 'Events, payments and tasks by date'], ['stuck', 'Needs attention', 'Everything late, blocked or waiting'], ['changed', 'What changed', 'Since you last looked'], ['approvals', 'Sign-offs', 'Spending and changes waiting for approval'], ['reimb', 'Reimbursements', 'Money owed to your team'], ['daypack', 'Event-day pack', 'One page per function for the crew'], ['reminders', 'Reminders', 'Messages queued to go out'], ['inbox', 'Inbox', 'Notifications and messages']]],
    ['Clients & sales', [['clients', 'Clients', 'Contacts, repeat business, preferences'], ['leads', 'Leads & follow-up', 'Enquiries and the next action on each'], ['templates', 'Event templates', 'Start an event from one you have run'], ['statements', 'Client statements', 'All of a client\'s events, and what is still to come'], ['proposals', 'Next-quote proposals', 'Price changes learned from past events'], ['clientview', 'Client view', 'What the client sees on their link']]],
    ['People & vendors', [['vendors', 'Vendors', 'Your cost history with everyone you pay'], ['crew', 'Crew', 'People you deploy, day rates and clashes'], ['mytime', 'My time', 'Hours you spent on each event'], ['jobcard', 'Job cards', 'What each vendor needs to know'], ['sourcing', 'Sourcing network', 'Vendors other planners recommend'], ['inventory', 'Inventory', 'Your own stock and rentals'], ['files', 'All files', 'Every document and photo']]],
    ['Money', [['overview', 'Company', 'Money across every event'], ['cockpit', 'Cockpit', 'What everyone is doing, what is stuck, what cash moved'], ['owed', 'Clients still owe', 'Instalments due and overdue'], ['paydue', 'Payments due to vendors', 'What you owe and when'], ['forecast', 'Forecast & risk', 'Margin, pipeline, cash position'], ['rollups', 'Margin rollups', 'By city, client and month'], ['cash', 'Cash & working capital', 'What is coming in and going out'], ['cashbook', 'Cash book', 'Cash in and out, with vouchers'], ['receipts', 'Receipt review', 'Check bills, duplicates and claims'], ['bank', 'Bank reconciliation', 'Match the bank statement'], ['books', 'For the accountant', 'Payables, exports and GST/TDS'], ['pricebook', 'Price book', 'Rates from your own agreements'], ['fx', 'Multi-currency', 'Foreign-currency receipts']]],
    ['Reports', [['reports', 'Reports', 'Saved reports and scheduled digests'], ['analytics', 'Sales & collections', 'Win rate, turnaround, receivables'], ['segments', 'Profitability by segment', 'Which kinds of event make money'], ['exceptions', 'Exceptions', 'Every alert that needs action'], ['capacity', 'Capacity & risk', 'Workload and concentration'], ['benchmark', 'Benchmarks', 'Compare your rates']]],
    ['Setup & admin', [['settings', 'Setup', 'Company, people, templates, money rules'], ['setup', 'Setup checklist', 'Guided company setup'], ['modules', 'Modules', 'Switch features on or off'], ['automations', 'Automations', 'Reminders that run by themselves'], ['assistant', 'Assistants', 'Drafts from your own data'], ['auditlog', 'Audit log', 'Every change, who and when'], ['health', 'Service health', 'Storage, saves and errors'], ['developer', 'Developer', 'API keys and webhooks'], ['operator', 'Support console', 'Support access you have granted'], ['build', 'For the tech team', 'What is built and how']]]
  ];
  const CORE = new Set(['home', 'events', 'vendors', 'calendar', 'mytasks', 'approvals', 'reimb', 'inbox', 'overview', 'settings', 'crew', 'clients', 'jobcard', 'clientview', 'books', 'build']);
  function allowed(k) {
    let nav = []; try { nav = _navItemsV7().map(x => x[0]) } catch (e) {}
    let sheet = []; try { sheet = navSheetRows().flatMap(g => g[1].map(r => r[0])) } catch (e) {}
    const known = nav.includes(k) || sheet.includes(k) || !!PAGES_EXT[k] || CORE.has(k);
    if (!known) return false;
    if (k === 'vendors' && !can('vendors')) return false;
    if (k === 'overview' && !(can('profit') || me().role === 'manager')) return false;
    if ((k === 'settings' || k === 'build') && !nav.includes(k) && !sheet.includes(k)) return false;
    try { return typeof reachable === 'function' ? reachable(k) : true } catch (e) { return true }
  }
  function counts() { const c = {}; try { _navItemsV7().forEach(x => { if (x[2]) c[x[0]] = x[2] }) } catch (e) {} try { navSheetRows().forEach(g => g[1].forEach(r => { if (r[2]) c[r[0]] = r[2] })) } catch (e) {} return c }
  function toolsFor() { return GROUPS.map(([g, l]) => [g, l.filter(([k]) => allowed(k))]).filter(([, l]) => l.length) }
  function vMore() {
    const cnt = counts();
    const row = (g, k, l, dsc) => `<a class="tool-row" href="#${k}"><span class="tr-ic">${TICON[g]}</span><span class="tr-tx"><b>${esc(T(l))}</b><small>${esc(T(dsc))}</small></span>${cnt[k] ? `<span class="cnt">${esc(String(cnt[k]))}</span>` : ''}${goIc}</a>`;
    const groups = toolsFor().map(([g, list]) => `<section class="ui-group"><div class="v-sec"><span class="eyebrow">${esc(T(g))}</span></div><div class="card tools-card">${list.map(([k, l, dsc]) => row(g, k, l, dsc)).join('')}</div></section>`).join('');
    const app = `<section class="ui-group"><div class="v-sec"><span class="eyebrow">${T('App')}</span></div><div class="card tools-card">
      <div class="tool-row theme-row" style="display:block"><span class="tr-tx"><b>${T('Theme')}</b><small>${T('Light, dark, or follow this device')}</small></span>${window.AURIV_THEME ? AURIV_THEME.seg() : ''}</div>
      ${row('App', 'account', 'Account', 'Sync, company, team access, sign out')}${row('App', 'help', 'Help', 'How it works, questions, words we use')}${allowed('flows') ? row('App', 'flows', 'How it works', 'Each flow, step by step') : ''}</div></section>`;
    const body = `<div class="v-list" data-grouped="1"><button type="button" class="tools-search more-search" data-act="sc-search">${TI('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')}<span>${T('Search everything')}</span></button>${groups}${app}</div>`;
    return vFrame({ key: 'tools', title: T('More'), body });
  }
  addPage('tools', 'More', vMore);
  v7act('sc-search', SESSION, () => { if (window.AURIV_SEARCH) AURIV_SEARCH.open() });

  /* ---------------- sections → cards (every v9.5 screen) ---------------- */
  function group(list) {
    if (!list || list.dataset.grouped) return;
    list.dataset.grouped = '1';
    let card = null;
    [...list.children].forEach(el => {
      if (el.classList.contains('v-sec')) {
        const sec = document.createElement('section'); sec.className = 'ui-group';
        list.insertBefore(sec, el); sec.appendChild(el);
        card = document.createElement('div'); card.className = 'ui-card'; sec.appendChild(card); return;
      }
      if (card) card.appendChild(el); else el.classList.add('ui-lead');
    });
    list.querySelectorAll('.ui-card').forEach(c => { if (!c.children.length) c.parentElement.classList.add('ui-empty-group') });
    const lead = [...list.children].filter(el => el.classList.contains('ui-lead') && /\bv-(row|ban|kv)\b/.test(el.className));
    if (lead.length) { const c = document.createElement('div'); c.className = 'ui-card ui-card-lead'; list.insertBefore(c, lead[0]); lead.forEach(el => { el.classList.remove('ui-lead'); c.appendChild(el) }) }
  }
  /* the screen's main action: a pill in the page header */
  function actions(app) {
    const page = app.querySelector(':scope > .v-page'); const bar = app.querySelector(':scope > .v-bar'); if (!page || !bar) return;
    const top = page.querySelector('.v-top'); if (!top) return;
    let box = top.querySelector('.ui-actions'); if (!box) { box = document.createElement('div'); box.className = 'ui-actions'; top.appendChild(box) }
    [...bar.children].forEach(b => { if (b.classList.contains('v-ib')) b.classList.add('ui-ib'); if (b.classList.contains('btn') && /^\s*\+/.test(b.textContent)) b.classList.add('no-plus'); box.appendChild(b) });
    bar.remove();
  }
  /* page title: the sub line sits above the title, like v5.10 */
  function backRow(app) { app.querySelectorAll('.v-top > a.v-ib[aria-label="Back"]').forEach(b => { const row = document.createElement('div'); row.className = 'pg-backrow'; b.parentElement.insertBefore(row, b.parentElement.firstChild); row.appendChild(b) }) }
  function unescapeTitles(app) { app.querySelectorAll('.v-top .ttl, .pg-sub').forEach(t => { if (/&amp;(amp|lt|gt|quot|#39);/.test(t.innerHTML)) t.innerHTML = t.innerHTML.replace(/&amp;(amp|lt|gt|quot|#39);/g, '&$1;') }) }
  function titles(app) { app.querySelectorAll('.v-top .ttl').forEach(t => { const s = t.querySelector('small'); if (!s) return; const d = document.createElement('div'); d.className = 'pg-sub'; d.innerHTML = s.innerHTML; s.remove(); t.parentElement.insertBefore(d, t.parentElement.firstChild) }) }

  /* ---------------- Home: greeting, next up, coming up ---------------- */
  function home(app) {
    const page = app.querySelector('.v-page[data-page="home"]'); if (!page || page.querySelector('.home-hero')) return;
    const body = page.querySelector('.v-body'); if (!body) return;
    const u = me(); const t = todayStr();
    const evs = sortSoonest(evList().filter(e => isLive(e) && (e.endDate || e.startDate) >= t));
    const next = evs[0];
    let h = `<div class="home-hero"><div class="hh-date">${esc(todayLine())}</div><h1 class="hh-title">${T(greet())}, ${esc(String(u.name).split(' ')[0])}</h1>`;
    if (next) {
      const dp = dparts(next.startDate); const n = daysUntil(dOf(next.startDate));
      h += `<div class="next-card" data-act="open-event" data-id="${esc(next.id)}" role="button" tabindex="0"><span class="nc-photo" style="background-image:url('${evImg(next)}')"></span><span class="nc-shade"></span>
        <div class="nc-in"><div class="nc-top"><span class="glass-pill">${n === 0 ? T('Today') : n === 1 ? T('Tomorrow') : n > 0 ? T('In') + ' ' + n + ' ' + T('days') : T('Happening now')}</span>${dp ? `<span class="nc-date"><b>${dp.d}</b>${dp.m.toUpperCase()}</span>` : ''}</div>
        <div><div class="nc-eyebrow">${T('Next up')} · ${esc(T(STATUS_LABEL[statusOf(next)]))}</div><div class="nc-name">${esc(next.name)}</div><div class="nc-meta">${esc(next.venue || T('Venue to be decided'))}${next.guests ? ' · ' + next.guests + ' ' + T('guests') : ''}</div></div></div></div>`;
      if (evs.length > 1) h += `<div class="sec-label"><span>${T('Coming up')}</span><a href="#events">${T('See all')}</a></div><div class="hscroll">${evs.slice(1, 9).map(e => `<div class="mini-ev" data-act="open-event" data-id="${esc(e.id)}" role="button" tabindex="0"><div class="me-img" style="background-image:url('${evImg(e)}')">${chip(e.startDate)}</div><div class="me-name">${esc(e.name)}</div><div class="me-meta">${esc(T(STATUS_LABEL[statusOf(e)]))}</div></div>`).join('')}</div>`;
    }
    h += '</div>';
    body.insertAdjacentHTML('afterbegin', h);
  }
  /* Home's side panel (cash and people, the accountant's books) becomes part of the page */
  function homePanelIn(app) {
    const p = document.getElementById('panel'); const hp = p && p.querySelector('[data-home-panel]');
    const list = app.querySelector('.v-page[data-page="home"] .v-body > .v-list');
    if (!hp || !list) return;
    const box = document.createElement('div'); box.className = 'v-list';
    let src = hp.querySelector('.v-list') || hp;
    while (src.children.length === 1 && src.firstElementChild.matches('.v-list, .v-body, div:not([class])')) src = src.firstElementChild;
    [...src.children].forEach(el => { if (!el.classList.contains('hd')) box.appendChild(el) });
    group(box);
    [...box.children].forEach(el => list.appendChild(el));
    p.innerHTML = '';
  }

  /* ---------------- Event: photo hero and the six numbers ---------------- */
  function eventPage(app) {
    const page = app.querySelector('.v-page[data-page="event"]'); if (!page || page.querySelector('.ev-hero')) return;
    const e = ev(S.ui.eventId); if (!e) return;
    let c = null; try { c = calc(e) } catch (er) {}
    const days = daysUntil(dOf(e.startDate)); const lk = locked(e);
    const type = ({ wedding: 'Wedding', corporate: 'Corporate', other: 'Event' })[e.type] || 'Event';
    const when = ['done', 'cancelled'].includes(statusOf(e)) ? '' : days > 0 ? ` · ${days} ${T('days to go')}` : days === 0 ? ' · ' + T('Today') : '';
    let word = ''; try { const [k, l] = eventSt(e); if (k) word = `<span class="btn sm evh-st ${k === 'late' ? 'late' : ''}">${esc(T(l))}</span>` } catch (er) {}
    const back = (page.querySelector('.v-top > a.v-ib') || {}).getAttribute ? page.querySelector('.v-top > a.v-ib').getAttribute('href') : '#events';
    const acts = page.querySelector('.v-top .ui-actions');
    const hero = document.createElement('div'); hero.className = 'ev-hero';
    hero.innerHTML = `<span class="evh-photo" style="background-image:url('${evImg(e)}')"></span><span class="evh-shade"></span>
      <div class="evh-top"><a href="${back || '#events'}" class="round-btn" aria-label="${T('Back')}">${svg('<path d="M15 18l-6-6 6-6"/>')}</a></div>
      <div class="evh-bot"><div class="eyebrow">${T(type)} · ${fmtDate(e.startDate)}${e.endDate && e.endDate !== e.startDate ? ' – ' + fmtDate(e.endDate) : ''}${when}</div><h1>${esc(e.name)}</h1>
      <div class="evh-acts"><span class="btn sm evh-st">${esc(T(STATUS_LABEL[statusOf(e)]))}</span>${word}${can('events.edit') && !lk ? `<button class="btn sm" data-act="edit-event">${T('Edit')}</button>` : ''}</div></div>`;
    if (acts) { acts.querySelectorAll('.btn, .v-ib').forEach(b => { b.classList.add('sm'); hero.querySelector('.evh-acts').appendChild(b) }) }
    const sub = document.createElement('div'); sub.className = 'ev-sub';
    sub.textContent = [e.client, e.phone, e.venue || T('Venue to be decided'), e.guests ? e.guests + ' ' + T('guests') : '', (e.functions || []).join(', ')].filter(Boolean).join(' · ');
    page.insertBefore(hero, page.firstChild); hero.after(sub);
    if (c && can('profit')) {
      const cell = (l, v) => `<div class="sn-cell"><div class="sn-l">${T(l)}</div><div class="sn-v num">${v}</div></div>`;
      const six = document.createElement('div'); six.className = 'six';
      six.innerHTML = `<div class="sn-grid">${cell('Contract value', inr(c.contract))}${cell('Received from client', inr(c.received))}${cell('Committed to vendors', inr(c.committed))}${cell('Paid to vendors', inr(c.paid))}${cell('Expenses so far', inr(c.expenses))}${cell('Client still owes', inr(Math.max(0, c.toCome)))}</div>
        <div class="sn-profit"><div class="sp-row sp-main"><div><div class="sp-l">${T('Actual profit')}</div><div class="sp-s">${T('from what you\'ve committed')}</div></div><div class="sp-v"><span class="num">${inr(c.actual)}</span><span class="sp-p">${pct(c.actual, c.contract)}</span></div></div>
        <div class="sp-row"><div><div class="sp-l">${T('Forecast profit')}</div><div class="sp-s">${T('when everything planned is bought')}</div></div><div class="sp-v"><span class="num">${inr(c.forecast)}</span><span class="sp-p">${pct(c.forecast, c.forecastContract || c.contract)}</span></div></div></div>`;
      sub.after(six);
    }
  }

  /* ---------------- Calendar: what is on each day, inside the month grid ---------------- */
  function calendar(app) {
    const grid = app.querySelector('.v-month'); if (!grid || grid.dataset.items) return; grid.dataset.items = '1';
    const evs = evList().filter(e => !['lost', 'cancelled'].includes(e.stage));
    let tasks = []; try { tasks = live(S.tasks).filter(t => t.status !== 'done' && t.due && eventVisible(ev(t.eventId) || {})) } catch (er) {}
    grid.querySelectorAll('button[data-v]').forEach(b => {
      const d = b.dataset.v;
      const on = evs.filter(e => dOf(e.startDate) <= d && d <= dOf(e.endDate || e.startDate));
      const tk = tasks.filter(t => t.due === d);
      if (!on.length && !tk.length) return;
      const late = tk.some(t => { try { return taskOverdue(t) } catch (er) { return false } });
      b.insertAdjacentHTML('beforeend', `<span class="cal-items">${on.slice(0, 2).map(e => `<span class="ci-ev">${esc(e.name)}</span>`).join('')}${on.length > 2 ? `<span class="ci-more">+${on.length - 2} ${T('more')}</span>` : ''}${tk.length ? `<span class="ci-tk ${late ? 'late' : ''}">${tk.length} ${tk.length === 1 ? T('task') : T('tasks')}</span>` : ''}</span>`);
      b.classList.add('has-items');
    });
  }

  /* ---------------- Setup: everyday settings first ---------------- */
  function setupOrder(app) {
    const sl = app.querySelector('.v-page[data-page="settings"] .v-body > .v-list');
    if (sl) [...sl.querySelectorAll(':scope > .ui-group')].filter(g => /^(Sample|Excel import)/i.test((g.querySelector('.eyebrow') || {}).textContent || '')).forEach(g => sl.appendChild(g));
  }

  /* ---------------- long explanations: two lines, then "More" ---------------- */
  function clampText(root) {
    if (!root) return;
    root.querySelectorAll('.v-legacy .small.muted, .v-legacy .muted, .v-legacy .help, .v-legacy .card > .small, .modal .small.muted, .modal .help, .modal p.small').forEach(el => {
      if (el.dataset.cl || el.closest('.clamp') || el.closest('.item') || el.querySelector('button, input, select, textarea, a.btn, .btn') || el.textContent.trim().length < 170) return;
      el.dataset.cl = '1'; el.classList.add('clamp');
      const b = document.createElement('button'); b.type = 'button'; b.className = 'clamp-more'; b.textContent = T('More');
      b.addEventListener('click', ev => { ev.stopPropagation(); const o = el.classList.toggle('open'); b.textContent = o ? T('Less') : T('More') });
      el.after(b);
    });
  }

  /* ---------------- the detail drawer (tablet and desktop) ---------------- */
  function drawer() {
    const p = document.getElementById('panel'); if (!p) return;
    document.body.classList.toggle('drawer-open', big() && !!p.querySelector('.modal:not([data-home-panel])'));
    if (!document.getElementById('scrim')) { const s = document.createElement('div'); s.id = 'scrim'; s.addEventListener('click', () => { try { closeModal() } catch (e) {} }); document.body.appendChild(s) }
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('drawer-open') && !document.body.classList.contains('picker-open')) { try { closeModal() } catch (err) {} } });

  /* in-app sign-in (sample company, phone + code): the v5.10 card */
  function tidyLogin(app) {
    const card = app.querySelector('.login > .card'); if (!card || card.dataset.tidy) return;
    card.dataset.tidy = '1'; card.classList.add('login-card');
    const ws = card.querySelector(':scope > .row:has(#wssel)'); if (ws) ws.classList.add('login-ws');
    card.querySelectorAll('form .ft').forEach(ft => {
      ft.classList.add('login-ft');
      const pri = ft.querySelector('.btn.pri'); if (pri) { pri.classList.add('big'); ft.prepend(pri) }
      const rest = [...ft.querySelectorAll('.btn:not(.pri)')];
      if (rest.length) { const links = document.createElement('div'); links.className = 'login-links'; rest.forEach(b => { b.classList.add('link'); links.appendChild(b) }); ft.appendChild(links) }
    });
    const tr = card.querySelector('.v9-try');
    if (tr) {
      tr.classList.add('login-sample');
      const eb = tr.querySelector('.eyebrow'); if (eb) eb.outerHTML = `<div class="ls-t">${T('Just exploring?')}</div><div class="ls-s">${T('Open the sample company as one of its team. Real sign-in is above.')}</div>`;
      const owner = tr.querySelector('[data-act="login-sample"]'); if (owner) { owner.classList.remove('sm'); owner.classList.add('big') }
      const row = tr.querySelector('.row'); if (row) row.classList.add('ls-roles');
    }
    const foot = card.querySelector(':scope > .meta:last-child'); if (foot) foot.classList.add('login-foot');
    const C = window.AURIV_CLOUD;
    if (C && C.enabled && !C.user && !card.parentElement.querySelector('.login-back')) {
      const back = document.createElement('button'); back.type = 'button'; back.className = 'login-back';
      back.innerHTML = svg('<path d="M15 18l-6-6 6-6"/>') + `<span>${T('Sign in with an account')}</span>`;
      back.addEventListener('click', () => { sessionStorage.removeItem('auriv.localOnly'); location.replace(location.pathname) });
      card.parentElement.insertBefore(back, card);
    }
    card.insertAdjacentHTML('afterbegin', '<div class="brand">Aurivevents</div>');
  }

  function layout() {
    const app = document.getElementById('app'); if (!app) return;
    tidyLogin(app);
    let r = ''; try { r = route() } catch (e) {}
    app.querySelectorAll('.v-page > .v-body > .v-list, .v-page > .v-body > div > .v-list').forEach(group);
    if (big()) homePanelIn(app);
    actions(app); titles(app); unescapeTitles(app); backRow(app);
    if (r === 'home') home(app);
    if (r === 'event') eventPage(app);
    if (r === 'settings') setupOrder(app);
    if (r === 'calendar') calendar(app);
    clampText(app);
    drawer();
  }
  const _render = render; render = function () { const r = _render.apply(this, arguments); try { layout() } catch (e) { console.error('screens', e) } return r };
  const _open = openModal; openModal = function () { const r = _open.apply(this, arguments); try { drawer(); clampText(document.getElementById('panel')); clampText(document.getElementById('modal')) } catch (e) {} return r };
  const _close = closeModal; closeModal = function () { const r = _close.apply(this, arguments); try { drawer() } catch (e) {} return r };
  window.addEventListener('hashchange', () => { const m = document.querySelector('#modal .modal, #panel .modal:not([data-home-panel])'); if (m && !m.querySelector('form, input, textarea, select')) { try { closeModal() } catch (e) {} } });
  let wasBig = big(); window.addEventListener('resize', () => { if (big() !== wasBig) { wasBig = big(); try { render() } catch (e) {} } });

  /* for search: the screens and the event status word */
  window.AURIV_SIMPLE = { on: () => true, statusOf, tools: () => toolsFor().flatMap(([g, l]) => l.map(t => ({ key: t[0], label: t[1], desc: t[2], group: g }))) };
  window.AURIV_VISUAL = { evImg, vImg };
})();
