/* ===== simple.js — the app's front door =====
   The basics from the build guide come first:
     Home (events) · Event page (six numbers + Client / Vendors / Expenses / Changes)
     Reimbursements · Vendor directory · Company (owner) · Settings · Help
   Everything else from v5.10 is one tap away, organised:
     More (dock) → tools grouped as Work · Clients & sales · Money · Reports · Setup & admin
     Event page → "⋯" segment → Quote, Budget, Tasks, Crew, Run sheet, Guests, Documents…
     Forms → extra fields under "More options"; Settings → "All settings". */
(function () {
  const on = () => true;
  const SIMPLE_ROUTES = ['home', 'events', 'event', 'reimb', 'vendors', 'overview', 'settings', 'help', 'tools'];
  const STATUS = { enquiry: 'enquiry', quoted: 'enquiry', confirmed: 'confirmed', planning: 'progress', eventweek: 'progress', done: 'done', closed: 'done', lost: 'cancelled', cancelled: 'cancelled' };
  const STATUS_LABEL = { enquiry: 'Enquiry', confirmed: 'Confirmed', progress: 'In progress', done: 'Done', cancelled: 'Cancelled' };
  const statusOf = e => STATUS[e.stage] || 'confirmed';
  const statusPill = e => { const s = statusOf(e); return `<span class="pill ${s === 'cancelled' ? 'bad' : s === 'done' ? 'grey' : s === 'enquiry' ? 'warn' : 'ok'}">${STATUS_LABEL[s]}</span>` };
  const pct = (a, b) => b ? (Math.round(a / b * 1000) / 10).toFixed(1).replace(/\.0$/, '') + '%' : '—';
  const isOwnerish = () => can('profit');
  const evList = () => S.events.filter(e => !e.history && eventVisible(e));

  /* ---------------- navigation: the guide's screens only ---------------- */
  const _nav = navItems;
  navItems = function () {
    const n = _nav();
    if (!on()) return n;
    const by = {}; n.forEach(x => by[x[0]] = x);
    const out = [['home', 'Home', ''], ['events', 'Events', '']];
    out.push(['reimb', 'Reimbursements', (by.reimb || [])[2] || '']);
    if (can('vendors')) out.push(['vendors', 'Vendors', '']);
    if (can('profit')) out.push(['overview', 'Company', '']);
    out.push(['tools', 'All tools', toolBadge()]);
    if (me().role === 'owner') out.push(['settings', 'Settings', '']);
    out.push(['help', 'Help', '']);
    return out;
  };
  const _route = route;
  route = function () {
    const r = _route();
    // every v5.10 screen this person may open (role-gated by the original menu) is reachable again
    const h = (location.hash || '').replace('#', '').split('/')[0];
    if (r === 'home' && h && h !== 'home' && _nav().some(x => x[0] === h)) return h;
    return r;
  };

  /* ---------------- More: every other tool, organised ---------------- */
  const TOOL_GROUPS = [
    ['Work', [['reimb', 'Reimbursements', 'Money owed to your team'], ['mytasks', 'My tasks', 'What is assigned to you'], ['approvals', 'Sign-offs', 'Spending and changes waiting for approval'], ['calendar', 'Calendar', 'Events, payments and tasks by date'], ['daypack', 'Event-day pack', 'One page per function for the crew'], ['inbox', 'Inbox', 'Notifications and messages']]],
    ['Clients & sales', [['clients', 'Clients', 'Contacts, repeat business, preferences'], ['leads', 'Leads & follow-up', 'Enquiries and the next action on each'], ['proposals', 'Next-quote proposals', 'Price changes learned from past events'], ['clientview', 'Client view', 'What the client sees on their link']]],
    ['People & vendors', [['crew', 'Crew', 'People you deploy, day rates and clashes'], ['mytime', 'My time', 'Hours you spent on each event'], ['jobcard', 'Job cards', 'What each vendor needs to know'], ['sourcing', 'Sourcing network', 'Vendors other planners recommend'], ['inventory', 'Inventory', 'Your own stock and rentals'], ['files', 'All files', 'Every document and photo']]],
    ['Money', [['receipts', 'Receipt review', 'Check bills, duplicates and claims'], ['cashbook', 'Cash book', 'Cash in and out, with vouchers'], ['cash', 'Cash & working capital', 'What is coming in and going out'], ['bank', 'Bank reconciliation', 'Match the bank statement'], ['books', 'For the accountant', 'Payables, exports and GST/TDS'], ['pricebook', 'Price book', 'Rates from your own agreements'], ['fx', 'Multi-currency', 'Foreign-currency receipts']]],
    ['Reports', [['company-full', 'Full company report', 'Cash weeks, planners, pipeline'], ['reports', 'Reports', 'Saved reports and scheduled digests'], ['analytics', 'Sales & collections', 'Win rate, turnaround, receivables'], ['segments', 'Profitability by segment', 'Which kinds of event make money'], ['exceptions', 'Exceptions', 'Every alert that needs action'], ['capacity', 'Capacity & risk', 'Workload and concentration'], ['benchmark', 'Benchmarks', 'Compare your rates']]],
    ['Setup & admin', [['modules', 'Modules', 'Switch features on or off'], ['automations', 'Automations', 'Reminders that run by themselves'], ['assistant', 'Assistants', 'Drafts from your own data'], ['setup', 'Setup checklist', 'Guided company setup'], ['auditlog', 'Audit log', 'Every change, who and when'], ['health', 'Service health', 'Storage, saves and errors'], ['developer', 'Developer', 'API keys and webhooks'], ['operator', 'Support console', 'Support access you have granted'], ['build', 'For the tech team', 'What is built and how']]]
  ];
  const EXTRA_PAGES = { reimb: () => true, 'company-full': () => can('profit') };
  function toolsFor() {
    const allowed = new Set(_nav().map(x => x[0]));
    const counts = {}; _nav().forEach(x => counts[x[0]] = x[2]);
    return TOOL_GROUPS.map(([g, list]) => [g, list.filter(([k]) => allowed.has(k) || (EXTRA_PAGES[k] && EXTRA_PAGES[k]())).map(t => t.concat([counts[t[0]] || '']))]).filter(([, l]) => l.length);
  }
  function toolBadge() { try { return toolsFor().some(([, l]) => l.some(t => t[3])) ? '•' : '' } catch (e) { return '' } }
  const TOOL_KEYS = () => new Set(TOOL_GROUPS.flatMap(([, l]) => l.map(t => t[0])));
  const TI = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const TICON = { Work: TI('<path d="M9 11.5l2.2 2.2L16 9"/><rect x="3.5" y="3.5" width="17" height="17" rx="4"/>'), 'Clients & sales': TI('<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>'), 'People & vendors': TI('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5a6.5 6.5 0 0 1 3 5.5"/>'), Money: TI('<rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="M2.5 10.5h19M6.5 15h3"/>'), Reports: TI('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'), 'Setup & admin': TI('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>') };
  function vTools() {
    const groups = toolsFor();
    return `<div class="row between pg-head"><h1>More</h1></div>
      <button type="button" class="tools-search" data-act="s-search">${TI('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')}<span>Search everything</span></button>
      ${groups.map(([g, list]) => `<div class="sec-label"><span>${g}</span></div><div class="card tools-card">${list.map(([k, l, d, c]) => `<a class="tool-row" href="#${k}"><span class="tr-ic">${TICON[g]}</span><span class="tr-tx"><b>${esc(l)}</b><small>${esc(d)}</small></span>${c ? `<span class="cnt">${esc(String(c))}</span>` : ''}<svg class="tr-go" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></a>`).join('')}</div>`).join('')}
      <div class="sec-label"><span>App</span></div><div class="card tools-card">${me().role === 'owner' ? `<a class="tool-row" href="#settings"><span class="tr-ic">${TICON['Setup & admin']}</span><span class="tr-tx"><b>Settings</b><small>Company, team, categories, export</small></span><svg class="tr-go" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></a>` : ''}<a class="tool-row" href="#help"><span class="tr-ic">${TI('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.8"/>')}</span><span class="tr-tx"><b>Help</b><small>How it works, questions, words we use</small></span><svg class="tr-go" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></a></div>`;
  }
  act('s-search', () => { if (window.AURIV_SEARCH) AURIV_SEARCH.open() });

  /* ---------------- two roles: staff do the work, never see profit ---------------- */
  const STAFF_CAPS = ['events.edit', 'vendors', 'vendors.amounts', 'payments', 'expenses', 'directory.edit', 'docs.view'].concat((CAPS.staff || []));
  const _can = can;
  can = function (cap) {
    if (on()) { const u = me(); if (u && u.role === 'staff') return STAFF_CAPS.includes(cap) }
    return _can(cap);
  };
  const _vis = eventVisible;
  eventVisible = function (e) {
    if (on()) { const u = me(); if (u && u.role === 'staff') return !e.history }
    return _vis(e);
  };

  /* ---------------- Home: the list of events ---------------- */
  function sortSoonest(list) {
    const t = todayStr();
    const up = list.filter(e => (e.endDate || e.startDate) >= t).sort((a, b) => a.startDate.localeCompare(b.startDate));
    const past = list.filter(e => (e.endDate || e.startDate) < t).sort((a, b) => b.startDate.localeCompare(a.startDate));
    return up.concat(past);
  }
  function vSimpleHome() {
    const owner = isOwnerish();
    const all = evList();
    const f = S.ui.sfilter || 'all';
    const chips = [['all', 'All'], ['confirmed', 'Confirmed'], ['progress', 'In progress'], ['done', 'Done']];
    if (all.some(e => statusOf(e) === 'enquiry')) chips.splice(1, 0, ['enquiry', 'Enquiry']);
    if (all.some(e => statusOf(e) === 'cancelled')) chips.push(['cancelled', 'Cancelled']);
    const list = sortSoonest(all.filter(e => f === 'all' ? statusOf(e) !== 'cancelled' : statusOf(e) === f));
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    const card = e => {
      const c = calc(e);
      return `<div class="card" data-act="open-event" data-id="${e.id}"><div class="row between"><div>${statusPill(e)}<div class="t">${esc(e.name)}</div><div class="meta">${esc(e.client || '')} · ${fmtDate(e.startDate)}${e.endDate && e.endDate !== e.startDate ? ' – ' + fmtDate(e.endDate) : ''}</div></div>${owner ? `<div style="text-align:right"><div class="num">${c.contract ? inr(c.actual) : '—'}</div><div class="small muted">${c.contract ? pct(c.actual, c.contract) + ' margin' : 'no contract yet'}</div></div>` : ''}</div></div>`;
    };
    return `<div class="simple-home">
      <div class="sh-date">${esc(today)} · ${esc(S.company.name)}</div>
      <div class="row between pg-head"><h1>Events</h1>${can('events.edit') ? '<button class="btn pri" data-act="new-event">+ New event</button>' : ''}</div>
      <div class="chips sh-chips">${chips.map(([k, l]) => `<button class="btn chip ${f === k ? 'on' : ''}" data-act="sfilter" data-v="${k}">${l}</button>`).join('')}</div>
      ${list.length ? `<div class="stack">${list.map(card).join('')}</div>`
        : `<div class="card empty-state"><div class="es-t">${all.length ? 'Nothing here' : 'No events yet'}</div><div class="es-s">${all.length ? 'Try another filter.' : 'Add your first event: the client, the date and what they are paying.'}</div>${!all.length && can('events.edit') ? '<button class="btn pri" data-act="new-event">+ New event</button><a class="es-link" href="#help">How it works</a>' : ''}</div>`}
    </div>`;
  }
  act('sfilter', ({ v }) => { S.ui.sfilter = v; save(); render() });

  /* ---------------- Home: today — money, risk, what needs you ---------------- */
  function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
  const pillOf = k => k === 'bad' ? 'bad' : 'warn';
  function vToday() {
    const u = me(); const r = u.role; const owner = can('profit');
    let att = []; try { att = attention() } catch (e) {}
    const first = att[0];
    const live = evList().filter(isLive);
    const tile = (l, v, sub, href, dark) => `<a class="card stat t-tile${dark ? ' soft' : ''}" href="${href}"><div class="lbl">${l}</div><div class="val num">${v}</div><div class="sub">${sub}</div></a>`;
    let tiles = '';
    if (owner) {
      const pipeline = evList().filter(e => stageIdx(e.stage) < 2 && e.stage !== 'lost');
      const owe = sum(live, e => Math.max(0, calc(e).toCome)), prof = sum(live, e => calc(e).forecast);
      const pipe = sum(pipeline, e => { try { return quoteTotals(e).price || e.contractPaise || 0 } catch (er) { return e.contractPaise || 0 } });
      const reimb = sum(live_(S.expenses).filter(x => x.source === 'own' && !x.settlementId && x.status !== 'declined'), x => x.amountPaise);
      tiles = tile('Clients still owe', inr(owe), 'Across live events', '#overview') + tile('Forecast profit', inr(prof), 'Live events', '#overview', true) + tile('In the pipeline', inr(pipe), `${pipeline.length} enquir${pipeline.length === 1 ? 'y' : 'ies'}`, '#events') + tile('Reimbursements', inr(reimb), 'Owed to your team', '#reimb');
    } else {
      let od = 0, owed = 0; try { od = myTasks().filter(taskOverdue).length } catch (e) {} try { owed = sum(owedTo(S.ui.userId), x => x.amountPaise) } catch (e) {}
      tiles = tile('My tasks overdue', od, 'Tap to see your tasks', '#mytasks') + tile('You are owed', inr(owed), 'From your own pocket', '#reimb', true);
    }
    const showAll = !!S.ui.attAll, list = showAll ? att : att.slice(0, 4);
    const attRow = a => `<div class="item"><span class="pill ${pillOf(a.kind)}">${esc(a.tag)}</span><div class="t" style="margin-top:6px">${esc(a.e.name)}</div><div class="meta">${esc(a.txt)}</div><button class="btn sm" style="margin-top:8px" data-act="open-event" data-id="${a.e.id}" data-tab="${a.tab || ''}">Review</button></div>`;
    const up = sortSoonest(evList().filter(e => isLive(e) && (e.endDate || e.startDate) >= todayStr())).slice(0, 3);
    let cash = '';
    if (owner) {
      let cc = { inn: 0, out: 0, uns: 0 }, weeks = []; try { cc = cashCarry(); weeks = cashWeeks(4) } catch (e) {}
      const net = (i, o) => `<b class="num ${i - o < 0 ? 'neg' : ''}">${i - o < 0 ? '−' : ''}${inr(Math.abs(i - o))}</b>`;
      const row = (l, i, o, strong) => `<div class="cw-row${strong ? ' strong' : ''}"><span>${l}</span><span class="num">${i == null ? '—' : inr(i)}</span><span class="num">${inr(o)}</span>${i == null ? `<b class="num neg">−${inr(o)}</b>` : net(i, o)}</div>`;
      cash = `<div class="sec-label"><span>Next 4 weeks: cash</span><a href="#company-full">8-week view</a></div>
        <div class="card cw"><div class="cw-row head"><span>Week of</span><span>In</span><span>Out</span><span>Net</span></div>
        ${cc.inn || cc.out ? row('Overdue', cc.inn, cc.out, true) : ''}${cc.uns ? row('No date yet', null, cc.uns, true) : ''}${weeks.map(w => row(fmtShort(w.from), w.inn, w.out)).join('')}</div>`;
    }
    return `<div class="sh-date">${esc(new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }))} · ${esc(S.company.name)}</div>
      <h1 class="today-h">${greet()}, ${esc(String(u.name).split(' ')[0])}</h1>
      ${first ? `<div class="card first-thing" data-act="open-event" data-id="${first.e.id}" data-tab="${first.tab || ''}" role="button" tabindex="0"><div class="ft-top"><span class="ft-k">First thing</span><span class="pill ${pillOf(first.kind)}">${esc(first.tag)}</span></div><div class="ft-t">${esc(first.e.name)}</div><div class="ft-s">${esc(first.txt)}</div></div>` : `<div class="card first-thing calm"><div class="ft-t">All clear</div><div class="ft-s">Nothing needs you right now.</div></div>`}
      <div class="grid g2 t-tiles">${tiles}</div>
      ${att.length ? `<div class="sec-label"><span>Needs attention</span><span class="pill">${att.length}</span></div><div class="card"><div class="list">${list.map(attRow).join('')}</div>${att.length > 4 ? `<button class="btn sm" style="margin-top:12px" data-act="s-att">${showAll ? 'Show fewer' : `Show all ${att.length}`}</button>` : ''}</div>` : ''}
      <div class="sec-label"><span>Coming up</span><span class="sl-acts">${can('events.edit') ? '<button class="btn sm" data-act="new-event">+ New event</button>' : ''}<a href="#events">All events</a></span></div>
      ${up.length ? `<div class="stack">${up.map(e => { const c = calc(e); return `<div class="card" data-act="open-event" data-id="${e.id}"><div class="row between"><div>${statusPill(e)}<div class="t">${esc(e.name)}</div><div class="meta">${esc(e.client || '')} · ${fmtDate(e.startDate)}</div></div>${owner ? `<div style="text-align:right"><div class="num">${c.contract ? inr(c.actual) : '—'}</div><div class="small muted">${c.contract ? pct(c.actual, c.contract) + ' margin' : ''}</div></div>` : ''}</div></div>` }).join('')}</div>`
        : `<div class="card empty-state"><div class="es-t">No upcoming events</div><div class="es-s">Add your next event: the client, the date and what they are paying.</div>${can('events.edit') ? '<button class="btn pri" data-act="new-event">+ New event</button><a class="es-link" href="#help">How it works</a>' : ''}</div>`}
      ${cash}`;
  }
  const live_ = l => l.filter(x => !x.voided);
  act('s-att', () => { S.ui.attAll = !S.ui.attAll; save(); render() });

  /* ---------------- New event (Screen 3) ---------------- */
  const WEDDING_FNS = ['Engagement', 'Haldi', 'Mehendi', 'Sangeet', 'Wedding', 'Reception'];
  function mSimpleEvent() {
    openModal(`${hd('New event')}<form id="f-se" novalidate>
      <label for="se-n">Event name</label><input id="se-n" placeholder="Ananya & Rahul wedding" autocomplete="off">
      <label for="se-cl">Client</label><select id="se-cl"><option value="">New client…</option>${S.clients.map(c => `<option value="${c.id}">${esc(c.name)}${c.phone ? ' · ' + esc(c.phone) : ''}</option>`).join('')}</select>
      <div id="se-new" class="two"><input id="se-c" placeholder="Client name" autocomplete="off"><input id="se-p" placeholder="Phone" inputmode="tel" autocomplete="off"></div>
      <label>Type</label><div class="chips" id="se-type">${[['wedding', 'Wedding'], ['corporate', 'Corporate'], ['other', 'Other']].map(([v, l], i) => `<button type="button" class="btn chip ${i ? '' : 'on'}" data-v="${v}">${l}</button>`).join('')}</div>
      <div id="se-fns"><label>Functions</label><div class="chips" id="se-fnchips">${WEDDING_FNS.map(f => `<button type="button" class="btn chip" data-fn="${f}">${f}</button>`).join('')}</div>
        <input id="se-fx" placeholder="Add your own, comma separated" autocomplete="off"></div>
      <div class="two"><div><label for="se-d">Date</label><input id="se-d" type="date" value="${addDays(todayStr(), 60)}"></div><div><label for="se-e">End date <span class="muted">(optional)</span></label><input id="se-e" type="date"></div></div>
      <label for="se-v">Venue</label><input id="se-v" placeholder="Grand Pavilion Hall, Kakkanad" autocomplete="off">
      <div class="two"><div><label for="se-g">Expected guests</label><input id="se-g" inputmode="numeric" placeholder="400"></div><div><label for="se-cv">Contract value (₹)</label><input id="se-cv" inputmode="decimal" placeholder="30,00,000"></div></div>
      <div class="help">What the client is paying, in total. Changes they add later go in the Changes tab.</div>
      ${ft('Save')}</form>`);
    let type = 'wedding';
    F('se-cl').addEventListener('change', () => { F('se-new').hidden = !!F('se-cl').value });
    F('se-type').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; type = b.dataset.v; F('se-type').querySelectorAll('.btn').forEach(x => x.classList.toggle('on', x === b)); F('se-fns').hidden = type !== 'wedding' });
    F('se-fnchips').addEventListener('click', e => { const b = e.target.closest('[data-fn]'); if (b) b.classList.toggle('on') });
    F('f-se').addEventListener('submit', evt => {
      evt.preventDefault();
      const name = F('se-n').value.trim(); if (!name) return toast('Give the event a name');
      let clientId = F('se-cl').value, client, phone;
      if (clientId) { const c = S.clients.find(x => x.id === clientId); client = c.name; phone = c.phone || '' }
      else { client = F('se-c').value.trim(); phone = F('se-p').value.trim(); if (!client) return toast('Enter the client name') }
      const start = F('se-d').value; if (!start) return toast('Pick the date');
      const end = F('se-e').value; if (end && end < start) return toast('End date is before the start date');
      const guests = parseInt(String(F('se-g').value).replace(/[^\d]/g, '')) || 0;
      const cvRaw = String(F('se-cv').value).replace(/[,\s₹]/g, '');
      const contract = cvRaw ? toPaise(cvRaw) : 0; if (cvRaw && (contract == null || !isFinite(contract) || contract < 0)) return toast('Contract value should be a number');
      if (!clientId) { const c = stamp({ id: uid(), name: client, phone, address: '', gstin: '', state: S.company.state || 'Kerala' }); S.clients.push(c); clientId = c.id }
      const fns = type === 'wedding' ? [...F('se-fnchips').querySelectorAll('.on')].map(b => b.dataset.fn).concat(F('se-fx').value.split(',').map(s => s.trim()).filter(Boolean)) : [];
      const n = stamp({ id: uid(), name, clientId, client, phone, type, guests, startDate: start, endDate: end || '', venue: F('se-v').value.trim(), functions: fns.length ? [...new Set(fns)] : (type === 'wedding' ? [] : ['Main event']), functionDetails: {}, plannerId: S.ui.userId, pricing: 'fixed', feePct: 0, gstOn: false, stage: 'confirmed', contractPaise: contract || 0, quote: { lines: [], discountPaise: 0, sentAt: null, acceptedAt: null, versions: [] }, budgetBaseline: {}, budget: {} });
      S.events.push(n); audit('create', 'events', n.id, `${n.name} · contract ${inr(n.contractPaise)}`, n.id);
      S.ui.eventId = n.id; S.ui.tab = isOwnerish() ? 'client' : 'vendors';
      save(); closeModal(); go('event'); toast('Event saved');
    });
  }

  /* ---------------- Event page (Screen 4) ---------------- */
  function expectedProfit(e, c) {
    const withEst = c.cs.filter(x => x.estimatePaise > 0);
    if (!withEst.length || !e.contractPaise) return null;
    const cost = sum(c.cs, x => x.estimatePaise > 0 ? x.estimatePaise : x.agreedPaise);
    return { amt: e.contractPaise - cost, base: e.contractPaise };
  }
  function sixNumbers(e, c) {
    const owner = isOwnerish();
    const ex = owner ? expectedProfit(e, c) : null;
    const lk = locked(e);
    const cell = (l, v, act) => `<div class="sn-cell${act ? ' tap' : ''}" ${act ? `data-act="${act}" role="button" tabindex="0"` : ''}><div class="sn-l">${l}</div><div class="sn-v num">${v}</div></div>`;
    return `<div class="six">
      <div class="sn-grid">
        ${cell('Contract value' + (owner && !lk ? ' <span class="sn-edit">Edit</span>' : ''), inr(c.contract), owner && !lk ? 's-contract' : '')}
        ${cell('Committed to vendors', inr(c.committed))}
        ${cell('Paid to vendors', inr(c.paid))}
        ${cell('Expenses so far', inr(c.expenses))}
      </div>
      ${owner ? `<div class="sn-profit">
        <div class="sp-row sp-main"><div><div class="sp-l">Actual profit</div><div class="sp-s">from what you've committed</div></div><div class="sp-v"><span class="num">${inr(c.actual)}</span><span class="sp-p">${pct(c.actual, c.contract)}</span></div></div>
        <div class="sp-row"><div><div class="sp-l">Expected profit</div><div class="sp-s">from your estimates</div></div><div class="sp-v">${ex ? `<span class="num">${inr(ex.amt)}</span><span class="sp-p">${pct(ex.amt, ex.base)}</span>` : '<span class="num">—</span>'}</div></div>
      </div>` : ''}
    </div>`;
  }
  const TABS = () => {
    const t = [];
    if (can('client')) t.push(['client', 'Client']);
    t.push(['vendors', 'Vendors'], ['expenses', 'Expenses']);
    if (isOwnerish()) t.push(['changes', 'Changes']);
    return t;
  };
  /* the event's other sections (v5.10 tabs), shown under the ⋯ segment */
  function extraTabs(e) {
    const t = [['overview', 'Summary & functions', 'Functions, headcount, sharing, status']];
    if (can('quote')) t.push(['quote', 'Quote', 'Line items, margin preview, versions']);
    if (can('budget.view')) t.push(['budget', 'Budget', 'Allocation by category vs committed']);
    if (can('budget.view')) t.push(['scope', 'Scope & forecast', 'What is bought and what is still to buy']);
    t.push(['tasks', 'Tasks', 'Who does what, by when']);
    if (can('crew.manage') || can('crew.assign')) t.push(['crew', 'Crew', 'People on the event, days and pay']);
    t.push(['runsheet', isEventDay(e) ? 'Run sheet · live' : 'Run sheet', 'Minute-by-minute plan for the day']);
    if (can('client')) t.push(['approvals', 'Client approvals', 'Designs, menus and changes to sign off']);
    if (can('profit')) t.push(['income', 'Other income', 'Commissions and referrals']);
    if (can('stage') && stageIdx(e.stage) >= 4) t.push(['close', e.stage === 'closed' ? 'Final figures' : 'Close-out', 'Settle up and lock the numbers']);
    if (can('docs.view')) t.push(['documents', 'Documents', 'Contracts, quotes and files']);
    if (can('activity')) t.push(['activity', 'Activity', 'Everything that changed, and who']);
    (window.TABS_EXT || []).forEach(x => { try { if (x.cond(e, false) && !t.some(y => y[0] === x.key)) t.push([x.key, x.label, '']) } catch (er) {} });
    return t;
  }
  const ORIG_TAB = () => Object.assign({ overview: tabOverview, quote: tabQuote, budget: tabBudget, client: tabClient, vendors: tabVendors, expenses: tabExpenses, changes: tabChanges, tasks: tabTasks, crew: tabCrew, runsheet: tabRunsheet, activity: tabActivity, approvals: tabClientApprovals, documents: tabDocs, income: tabIncome, close: tabClose }, window.TABFN_EXT || {});
  act('s-more-tabs', () => {
    const e = ev(S.ui.eventId); if (!e) return;
    openModal(`${hd('More for this event')}<div class="list">${extraTabs(e).map(([k, l, d]) => `<button type="button" class="status-opt ${S.ui.tab === k ? 'on' : ''}" data-act="s-tab-x" data-v="${k}"><span><b>${esc(l)}</b>${d ? `<small>${esc(d)}</small>` : ''}</span><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></button>`).join('')}</div>`);
  });
  act('s-tab-x', ({ v }) => { S.ui.tab = v; save(); closeModal(); render(); const sc = document.getElementById('scroller'), t = document.querySelector('.s-tabs'); if (sc && t) sc.scrollTop += t.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12 });
  function vSimpleEvent() {
    const e = ev(S.ui.eventId); if (!e) return vSimpleHome();
    if (!eventVisible(e)) return _vEvent();
    const c = calc(e); const lk = locked(e);
    const tabs = TABS(); const extras = extraTabs(e);
    const extra = extras.find(t => t[0] === S.ui.tab && !tabs.some(b => b[0] === t[0]));
    const cur = extra ? extra[0] : tabs.some(t => t[0] === S.ui.tab) ? S.ui.tab : tabs[0][0];
    const fns = { client: tabSimpleClient, vendors: tabSimpleVendors, expenses: tabSimpleExpenses, changes: tabSimpleChanges };
    const days = daysUntil(e.startDate);
    let body = ''; try { body = extra ? ORIG_TAB()[cur](e, c) : fns[cur](e, c) } catch (err) { body = `<div class="alert small">This section could not be drawn: ${esc(err.message)}</div>` }
    if (extra) body = `<div class="x-head"><div><div class="eyebrow">This event</div><h2>${esc(extra[1])}</h2></div><button class="btn sm" data-act="s-more-tabs">All sections</button></div>` + body;
    return `<a href="#events" class="btn sm">← Events</a>
      <div class="eyebrow">${({ wedding: 'Wedding', corporate: 'Corporate', other: 'Event' })[e.type] || 'Event'} · ${fmtDate(e.startDate)}${e.endDate && e.endDate !== e.startDate ? ' – ' + fmtDate(e.endDate) : ''}${statusOf(e) === 'done' || statusOf(e) === 'cancelled' ? '' : days > 0 ? ` · ${days} days to go` : days === 0 ? ' · Today' : ''}</div>
      <div class="row between"><h1>${esc(e.name)}</h1><div class="row" style="gap:8px"><button class="btn sm status-btn" data-act="s-status" ${lk || !can('events.edit') ? 'disabled' : ''}>${STATUS_LABEL[statusOf(e)]}${lk || !can('events.edit') ? '' : ' <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>'}</button>${can('events.edit') && !lk ? '<button class="btn sm" data-act="edit-event">Edit</button>' : ''}</div></div>
      <div class="ev-sub">${esc(e.client || '')}${e.phone ? ' · ' + esc(e.phone) : ''} · ${esc(e.venue || 'Venue to be decided')} · ${e.guests || 0} guests${(e.functions || []).length ? ' · ' + e.functions.map(esc).join(', ') : ''}</div>
      ${sixNumbers(e, c)}
      <div class="tabs s-tabs">${tabs.map(([k, l]) => `<button class="btn ${cur === k ? 'pri' : ''}" data-act="tab" data-v="${k}">${l}</button>`).join('')}<button class="btn s-more ${extra ? 'pri' : ''}" data-act="s-more-tabs" aria-label="More for this event"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></button></div>
      <div class="s-tab s-tab-${cur}${extra ? ' s-tab-x' : ''}">${body}</div>`;
  }

  act('s-contract', () => {
    const e = ev(S.ui.eventId); if (!e || !isOwnerish() || locked(e)) return;
    const ch = calc(e).contract - e.contractPaise;
    openModal(`${hd('Contract value')}<form id="f-scv"><p class="small muted">What the client agreed to pay when the deal was done.${ch ? ` Approved changes add ${inr(ch)} on top of this.` : ''}</p><label for="scv">Amount (₹)</label><input id="scv" inputmode="decimal" value="${e.contractPaise ? e.contractPaise / 100 : ''}"><label for="scr">Why is it changing? <span class="muted">(optional)</span></label><input id="scr" placeholder="Corrected a typo">${ft('Save')}</form>`);
    F('f-scv').addEventListener('submit', evt => {
      evt.preventDefault(); const v = toPaise(String(F('scv').value).replace(/[,\s₹]/g, ''));
      if (v == null || !isFinite(v) || v < 0) return toast('Enter a valid amount');
      const before = e.contractPaise; e.contractPaise = v; touch(e);
      audit('update', 'events', e.id, `contract ${inr(before)} → ${inr(v)}${F('scr').value.trim() ? ' · ' + F('scr').value.trim() : ''}`, e.id);
      save(); closeModal(); render(); toast('Contract value saved');
    });
  });
  act('s-status', () => {
    const e = ev(S.ui.eventId); if (!e || locked(e)) return;
    const opts = [['confirmed', 'Confirmed', 'Deal done, booking vendors'], ['planning', 'In progress', 'Getting ready or happening now'], ['done', 'Done', 'The event is over']];
    openModal(`${hd('Event status')}<div class="list">${opts.map(([v, l, s]) => `<button type="button" class="status-opt ${STATUS[e.stage] === STATUS[v] ? 'on' : ''}" data-act="s-status-set" data-v="${v}"><span><b>${l}</b><small>${s}</small></span><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></button>`).join('')}</div>`);
  });
  act('s-status-set', ({ v }) => {
    const e = ev(S.ui.eventId); if (!e) return;
    const from = e.stage; if (STATUS[from] === STATUS[v]) return closeModal();
    e.stage = v; touch(e); audit('stage', 'events', e.id, `${STAGE[from] || from} → ${STAGE[v] || v}`, e.id);
    save(); closeModal(); render(); toast('Status: ' + STATUS_LABEL[STATUS[v]]);
  });

  /* ---------------- Client money tab (Screen 5) ---------------- */
  const MODE = { cash: 'Cash', bank: 'Bank', upi: 'UPI', cheque: 'Cheque', card: 'Card', gateway: 'Online' };
  const modeOf = m => MODE[m] || (m ? m[0].toUpperCase() + m.slice(1) : '');
  function tabSimpleClient(e, c) {
    const lk = locked(e);
    const ms = S.milestones.filter(m => m.eventId === e.id).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    const rc = id => S.receipts.filter(r => r.milestoneId === id);
    return `<div class="card">
      <div class="row between"><h2>Client money</h2>${!lk ? '<button class="btn pri sm" data-act="add-ms">+ Milestone</button>' : ''}</div>
      <p class="small muted" style="margin:2px 0 6px">How the client pays you, in instalments.</p>
      ${ms.length ? `<div class="list">${ms.map(m => {
        const k = msCalc(m); const done = k.left <= 0;
        return `<div class="item ${m.voided ? 'void' : ''}">
          <div class="row between" style="flex-wrap:nowrap;align-items:flex-start"><div><div class="t">${esc(m.desc)}</div><div class="meta">Due ${fmtDate(m.dueDate)}</div></div>
          <div class="amt num">${k.got > 0 && !done ? `${inr(k.got)} <span class="muted">of ${inr(m.amountPaise)}</span>` : inr(m.amountPaise)}</div></div>
          <div class="chips" style="margin-top:8px">${m.voided ? '' : done ? '<span class="pill ok">Received</span>' : k.overdue ? '<span class="pill bad">Overdue</span>' : '<span class="pill grey">Due</span>'}${!m.voided && !lk && !done ? `<button class="btn sm pri" data-act="receipt" data-id="${m.id}">Record payment</button>` : ''}${!m.voided && !lk ? `<button class="btn sm" data-act="edit-ms" data-id="${m.id}">Edit</button><button class="btn sm" data-act="void" data-list="milestones" data-id="${m.id}">Void</button>` : ''}</div>
          ${rc(m.id).length ? `<div class="sub-list">${rc(m.id).map(r => `<div class="sl-row ${r.voided ? 'void' : ''}"><div><b class="num">${inr(r.amountPaise)}</b> received ${fmtDate(r.date)}${r.mode ? ' · ' + modeOf(r.mode) : ''}${r.ref ? ' · ' + esc(r.ref) : ''}<div class="meta">Added by ${esc(user(r.createdBy).name)} · ${fmtTs(r.createdAt)}${r.voided ? ' · voided: ' + esc(r.voidReason || '') : ''}</div></div>${!r.voided && !lk ? `<button class="btn sm" data-act="void" data-list="receipts" data-id="${r.id}">Void</button>` : ''}</div>`).join('')}</div>` : ''}
          ${auditLine(m)}</div>`;
      }).join('')}</div>` : '<div class="muted small" style="padding:8px 0">No milestones yet. Add how the client will pay, e.g. ₹10 lakh on signing.</div>'}
      <div class="ch-sum"><div><span>Total contract${c.grossContract !== c.contract ? ' (with GST)' : ''}</span><b class="num">${inr(c.grossContract)}</b></div><div><span>Received</span><b class="num">${inr(c.received)}</b></div><div class="tot"><span>Still to come</span><b class="num">${inr(c.toCome)}</b></div></div>
    </div>`;
  }

  /* ---------------- Vendors tab (Screen 6) ---------------- */
  function tabSimpleVendors(e, c) {
    const lk = locked(e); const owner = isOwnerish();
    const list = S.commitments.filter(x => x.eventId === e.id && (x.status === 'agreed' || x.voided) && !x.clientPays);
    return `<div class="card">
      <div class="row between"><h2>Vendors</h2>${!lk && can('vendors') ? '<button class="btn pri sm" data-act="add-vendor">+ Add vendor</button>' : ''}</div>
      ${list.length ? `<div class="list">${list.map(cm => {
        const v = vendor(cm.vendorId); const k = commCalc(cm); const ps = S.payments.filter(p => p.commitmentId === cm.id);
        const est = owner && cm.estimatePaise > 0 ? cm.estimatePaise : 0;
        return `<div class="item ${cm.voided ? 'void' : ''}">
          <div class="t">${esc(v.name)}</div><div class="meta">${esc(v.category || '')}${(cm.functions || []).length ? ' · ' + cm.functions.map(esc).join(', ') : ''}${cm.scope ? ' · ' + esc(cm.scope) : ''}</div>
          <div class="v-nums"><div><span>Agreed</span><b class="num">${inr(k.agreed)}</b></div><div><span>Paid</span><b class="num">${inr(k.paid)}</b></div><div><span>Outstanding</span><b class="num">${inr(k.outstanding)}</b></div><div><span>Next due</span><b>${k.nextDue ? fmtShort(k.nextDue.date) : '—'}</b></div></div>
          ${est ? `<div class="meta">Estimated ${inr(est)} · ${k.agreed > est ? inr(k.agreed - est) + ' over' : k.agreed < est ? inr(est - k.agreed) + ' under' : 'on estimate'}</div>` : ''}
          <div class="chips" style="margin-top:8px">${k.overdue > 0 && !cm.voided ? `<span class="pill bad">${inr(k.overdue)} overdue</span>` : ''}${!cm.voided && !lk && can('payments') ? `<button class="btn sm pri" data-act="pay" data-id="${cm.id}">Record payment</button>` : ''}${!cm.voided && !lk ? `<button class="btn sm" data-act="edit-comm" data-id="${cm.id}">Edit</button><button class="btn sm" data-act="void" data-list="commitments" data-id="${cm.id}">Void</button>` : ''}</div>
          ${ps.length ? `<details class="pays"><summary>Payments (${ps.filter(p => !p.voided).length})</summary><div class="sub-list">${ps.map(p => `<div class="sl-row ${p.voided ? 'void' : ''}"><div><b class="num">${inr(p.amountPaise)}</b> · ${fmtDate(p.date)}${p.mode ? ' · ' + modeOf(p.mode) : ''}${p.ref ? ' · ' + esc(p.ref) : ''}${p.overrideReason ? `<div class="meta">Recorded despite a possible duplicate: ${esc(p.overrideReason)}</div>` : ''}<div class="meta">Paid by ${esc(user(p.paidBy || p.createdBy).name)} · added by ${esc(user(p.createdBy).name)}, ${fmtTs(p.createdAt)}${p.voided ? ' · voided: ' + esc(p.voidReason || '') : ''}</div></div>${!p.voided && !lk ? `<button class="btn sm" data-act="void" data-list="payments" data-id="${p.id}">Void</button>` : ''}</div>`).join('')}</div></details>` : ''}
          ${auditLine(cm)}</div>`;
      }).join('')}</div>` : '<div class="muted small" style="padding:8px 0">No vendors yet. Add the decorator, caterer, photographer… with what you agreed to pay them.</div>'}
      <div class="ch-sum"><div><span>Committed</span><b class="num">${inr(c.committed)}</b></div><div><span>Paid</span><b class="num">${inr(c.paid)}</b></div><div class="tot"><span>Still to pay</span><b class="num">${inr(Math.max(0, c.outstanding))}</b></div></div>
    </div>`;
  }

  /* ---------------- Expenses tab (Screen 7) ---------------- */
  function tabSimpleExpenses(e, c) {
    const lk = locked(e);
    const xs = S.expenses.filter(x => x.eventId === e.id && (can('profit') || can('vendors.amounts') || x.spentBy === S.ui.userId)).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
    return `<div class="card">
      <div class="row between"><h2>Expenses</h2>${!lk && can('expenses') ? '<button class="btn pri sm" data-act="add-exp">+ Add expense</button>' : ''}</div>
      ${xs.length ? `<div class="list">${xs.map(x => `<div class="item ${x.voided ? 'void' : ''}"><div class="row" style="gap:12px;flex-wrap:nowrap;align-items:flex-start">
          ${x.photo ? `<img class="thumb" src="${x.photo}" alt="bill" data-act="view-photo" data-id="${x.id}">` : '<div class="thumb thumb-empty" title="No bill"></div>'}
          <div style="flex:1;min-width:0"><div class="t"><span class="num">${inr(x.amountPaise)}</span> · ${esc(x.category || '')}</div>${x.note ? `<div class="small">${esc(x.note)}</div>` : ''}
          <div class="meta">${fmtDate(x.date)} · ${esc(user(x.spentBy).name)} · ${x.source === 'own' ? 'Own money' : 'Company money'}${x.functionName ? ' · ' + esc(x.functionName) : ''}</div>
          <div class="chips" style="margin-top:6px">${x.status === 'pending' ? '<span class="pill warn">Awaiting sign-off</span>' : ''}${x.status === 'declined' ? '<span class="pill bad">Declined</span>' : ''}${x.source === 'own' && x.settlementId ? '<span class="pill ok">Repaid</span>' : ''}${!x.photo ? '<span class="pill grey">No bill</span>' : ''}${x.status === 'pending' && can('approve') && !lk ? `<button class="btn sm pri" data-act="approve" data-kind="expense" data-id="${x.id}">Approve</button>` : ''}${!x.voided && !lk ? `<button class="btn sm" data-act="void" data-list="expenses" data-id="${x.id}">Void</button>` : ''}</div>
          ${auditLine(x)}</div></div></div>`).join('')}</div>` : '<div class="muted small" style="padding:8px 0">No expenses yet. Flowers, fuel, food for the crew — add them as they happen, even offline.</div>'}
      <div class="ch-sum"><div class="tot"><span>Expenses so far</span><b class="num">${inr(c.expenses)}</b></div></div>
    </div>`;
  }

  /* ---------------- Changes tab (Screen 10) ---------------- */
  function tabSimpleChanges(e, c) {
    const chs = S.changes.filter(x => x.eventId === e.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const lk = locked(e);
    const ok = chs.filter(x => !x.voided && chApproved(x)), wait = chs.filter(x => !x.voided && !chApproved(x));
    return `<div class="card">
      <div class="row between"><h2>Changes</h2>${!lk ? '<button class="btn pri sm" data-act="s-change">+ Add change</button>' : ''}</div>
      <p class="small muted" style="margin:4px 0 6px">Anything the client adds or removes after the deal. Approved changes are added to the contract value; unapproved ones wait here.</p>
      ${chs.length ? `<div class="list">${chs.map(x => `<div class="item ${x.voided ? 'void' : ''}">
        <div class="row between"><div><div class="t num">${x.clientPaise >= 0 ? '+' : '−'}${inr(Math.abs(x.clientPaise || 0))}</div><div>${esc(x.desc)}</div><div class="meta">${x.date ? fmtDate(x.date) : ''}</div>${auditLine(x)}</div></div>
        <div class="chips" style="margin-top:8px">${x.voided ? '' : chApproved(x) ? '<span class="pill ok">Client approved</span>' : '<span class="pill warn">Not yet approved</span>'}${!x.voided && !lk && !chApproved(x) ? `<button class="btn sm pri" data-act="s-change-ok" data-id="${x.id}">Client approved</button>` : ''}${!x.voided && !lk ? `<button class="btn sm" data-act="void" data-list="changes" data-id="${x.id}">Void</button>` : ''}</div>
      </div>`).join('')}</div>` : '<div class="muted small" style="padding:8px 0">No changes yet.</div>'}
      <div class="ch-sum"><div><span>Contract value</span><b class="num">${inr(e.contractPaise)}</b></div><div><span>Approved changes</span><b class="num">${sum(ok, x => x.clientPaise) >= 0 ? '+' : '−'}${inr(Math.abs(sum(ok, x => x.clientPaise)))}</b></div><div class="tot"><span>Contract now</span><b class="num">${inr(c.contract)}</b></div>${wait.length ? `<div class="muted"><span>Waiting for approval</span><b class="num">${inr(sum(wait, x => x.clientPaise))}</b></div>` : ''}</div>
    </div>`;
  }
  act('s-change', () => {
    const e = ev(S.ui.eventId); if (!e) return;
    openModal(`${hd('Add change')}<form id="f-sch"><label for="sch-d">What changed?</label><input id="sch-d" placeholder="Added 50 guests" autocomplete="off"><div class="two"><div><label for="sch-a">Amount (₹)</label><input id="sch-a" inputmode="decimal" placeholder="60,000"></div><div><label for="sch-dt">Date</label><input id="sch-dt" type="date" value="${todayStr()}"></div></div><div class="help">Use a minus sign if something was removed, e.g. −25,000.</div><label class="chk"><input type="checkbox" id="sch-ok"> Client has approved this</label>${ft('Save')}</form>`);
    F('f-sch').addEventListener('submit', evt => {
      evt.preventDefault();
      const desc = F('sch-d').value.trim(); if (!desc) return toast('Describe the change');
      const a = toPaise(String(F('sch-a').value).replace(/[,\s₹]/g, '').replace('−', '-')); if (a == null || !isFinite(a) || a === 0) return toast('Enter the amount');
      const okd = F('sch-ok').checked;
      const n = stamp({ id: uid(), eventId: e.id, desc, clientPaise: a, costPaise: 0, needsPricing: false, commitmentId: null, date: F('sch-dt').value || todayStr(), clientStatus: okd ? 'accepted' : 'proposed', internalStatus: 'approved', billed: false, issueId: null, history: [`Added by ${me().name}, ${fmtTs(nowISO())}${okd ? ' · client approved' : ''}`] });
      S.changes.push(n); audit('create', 'changes', n.id, `${desc} ${inr(a)}${okd ? ' · approved' : ''}`, e.id);
      save(); closeModal(); render(); toast(okd ? 'Change added to the contract' : 'Change saved, waiting for approval');
    });
  });
  act('s-change-ok', ({ id }) => {
    const x = S.changes.find(c => c.id === id); if (!x) return;
    x.clientStatus = 'accepted'; x.internalStatus = 'approved'; (x.history = x.history || []).push(`Client approval recorded by ${me().name}, ${fmtTs(nowISO())}`); touch(x);
    audit('update', 'changes', x.id, 'client approved', x.eventId); save(); render(); toast('Added to the contract value');
  });

  /* ---------------- Company overview (Screen 11) ---------------- */
  function vSimpleOverview() {
    if (!can('profit')) return vSimpleHome();
    const years = [...new Set(evList().map(e => +String(e.startDate).slice(0, 4)).filter(Boolean))].sort((a, b) => b - a);
    const y = S.ui.syear && years.includes(S.ui.syear) ? S.ui.syear : (years.includes(new Date().getFullYear()) ? new Date().getFullYear() : years[0]);
    const counted = e => !['lost', 'cancelled', 'enquiry', 'quoted'].includes(e.stage);
    const all = evList().filter(counted);
    const owe = sum(all, e => calc(e).toCome), weOwe = sum(all, e => Math.max(0, calc(e).outstanding));
    const rows = all.filter(e => +String(e.startDate).slice(0, 4) === y).map(e => ({ e, c: calc(e) })).sort((a, b) => b.c.actual - a.c.actual);
    const T_ = { contract: sum(rows, r => r.c.contract), committed: sum(rows, r => r.c.committed), profit: sum(rows, r => r.c.actual) };
    return `<div class="eyebrow">Owner only</div>
      <div class="row between pg-head"><h1>Company</h1>${years.length > 1 ? `<select data-act="s-year" aria-label="Year">${years.map(v => `<option value="${v}" ${v === y ? 'selected' : ''}>${v}</option>`).join('')}</select>` : ''}</div>
      <div class="grid g2" style="margin-bottom:12px">
        <div class="card stat"><div class="lbl">Clients owe us</div><div class="val num">${inr(owe)}</div><div class="sub">across all events</div></div>
        <div class="card stat soft"><div class="lbl">We owe vendors</div><div class="val num">${inr(weOwe)}</div><div class="sub">across all events</div></div>
      </div>
      <div class="card"><h2>${y ? 'Events in ' + y : 'Events this year'}</h2><div class="small muted" style="margin-bottom:6px">Best to worst by profit. Profit uses what you've committed, not what you've paid.</div>
      ${rows.length ? `<div class="scroll"><table><thead><tr><th>Event</th><th class="r">Contract</th><th class="r">Committed</th><th class="r">Profit</th><th class="r">Margin</th></tr></thead><tbody>
        ${rows.map(({ e, c }) => `<tr data-act="open-event" data-id="${e.id}" style="cursor:pointer"><td>${esc(e.name)}<div class="meta">${fmtDate(e.startDate)}</div></td><td class="r num">${inr(c.contract)}</td><td class="r num">${inr(c.committed)}</td><td class="r num">${inr(c.actual)}</td><td class="r num">${pct(c.actual, c.contract)}</td></tr>`).join('')}
        </tbody><tfoot><tr class="tot"><td>Total for ${y}</td><td class="r num">${inr(T_.contract)}</td><td class="r num">${inr(T_.committed)}</td><td class="r num">${inr(T_.profit)}</td><td class="r num">${pct(T_.profit, T_.contract)}</td></tr></tfoot></table></div>` : '<div class="muted small">No events in this year.</div>'}
      </div>`;
  }
  ACTS_CHANGE['s-year'] = el => { S.ui.syear = +el.value; save(); render() };

  /* ---------------- Settings (Screen 12) ---------------- */
  function categoriesCard() {
    const chips = (key, list) => `<div class="chips cat-chips">${list.map((c, i) => `<span class="cat"><span>${esc(c)}</span><button type="button" aria-label="Remove ${esc(c)}" data-act="s-cat-rm" data-k="${key}" data-i="${i}">×</button></span>`).join('')}</div>
      <form class="cat-add" data-k="${key}"><input placeholder="Add a category" aria-label="New category"><button class="btn sm" type="submit">Add</button></form>`;
    return `<div class="card" id="s-cats"><h2>Categories</h2><div class="small muted" style="margin-bottom:8px">The choices people pick from. Removing one keeps it on records that already use it.</div>
      <h3 style="margin-top:12px">Expenses</h3>${chips('expenseCats', S.company.expenseCats || [])}
      <h3 style="margin-top:16px">Vendors</h3>${chips('vendorCats', S.company.vendorCats || [])}</div>`;
  }
  function exportCard() {
    const evs = sortSoonest(evList());
    return `<div class="card" id="s-export"><h2>Export for your accountant</h2><div class="small muted" style="margin-bottom:6px">One Excel file per event with every vendor, payment, expense, milestone and change, plus a zip of the bill photos.</div>
      <div class="list">${evs.map(e => `<div class="item"><div class="t">${esc(e.name)}</div><div class="meta">${fmtDate(e.startDate)}</div><div class="chips" style="margin-top:8px"><button class="btn sm pri" data-act="s-xlsx" data-id="${e.id}">Excel</button><button class="btn sm" data-act="s-photos" data-id="${e.id}">Bill photos (.zip)</button></div></div>`).join('') || '<div class="muted small">No events yet.</div>'}</div></div>`;
  }
  function allSettingsCard() {
    return `<div class="card adv-card" id="s-adv"><div class="row between" style="flex-wrap:nowrap"><div><h2>All settings</h2><div class="small muted">Templates, GST and invoicing, access & security, backups, notifications, crew and cash rules.</div></div>
      <button type="button" class="btn sm" data-act="s-allset">Open</button></div></div>`;
  }
  function tidySettings(app) {
    if (S.ui.allSettings) { app.insertAdjacentHTML('afterbegin', '<button class="btn sm back-more" data-act="s-allset-off">‹ Basic settings</button>'); return }
    const keep = ['Company', 'Team & roles'];
    [...app.querySelectorAll('.card')].filter(cd => !cd.parentElement.closest('.card')).forEach(cd => {
      const h = cd.querySelector('h2,h3'); const t = h ? h.textContent.trim() : '';
      if (!keep.includes(t)) cd.remove();
    });
    // team card: members only (the permission matrix belongs to advanced mode)
    const team = [...app.querySelectorAll('.card')].find(cd => /Team & roles/.test((cd.querySelector('h2,h3') || {}).textContent || ''));
    if (team) [...team.children].forEach(ch => { if (!(ch.matches('.row.between') && ch.querySelector('h2,h3')) && !ch.matches('.list')) ch.remove() });
    app.querySelectorAll(':scope > .note, :scope > .alert').forEach(n => n.remove());
    const co = [...app.querySelectorAll('.card')].find(cd => ((cd.querySelector('h2,h3') || {}).textContent || '').trim() === 'Company');
    if (co) { const d = co.querySelector('h2,h3').nextElementSibling; if (d && !d.matches('.btn,.row')) d.innerHTML = `${esc(S.company.name)}<div class="meta">Duplicate payment check: ${S.company.dupHours || 72} hours</div>` }
    const holder = app.querySelector(':scope > .stack') || app;
    holder.insertAdjacentHTML('beforeend', categoriesCard() + exportCard() + allSettingsCard());
  }
  act('s-allset', () => { S.ui.allSettings = true; save(); render(); document.getElementById('scroller').scrollTop = 0 });
  act('s-allset-off', () => { S.ui.allSettings = false; save(); render(); document.getElementById('scroller').scrollTop = 0 });
  act('s-cat-rm', ({ el }) => { const k = el.dataset.k, i = el.dataset.i; const l = S.company[k] || []; if (l.length <= 1) return toast('Keep at least one'); const [r] = l.splice(+i, 1); audit('update', 'company', 'company', `removed ${k === 'expenseCats' ? 'expense' : 'vendor'} category ${r}`, null); save(); render() });
  document.addEventListener('submit', e => {
    const f = e.target.closest && e.target.closest('form.cat-add'); if (!f) return;
    e.preventDefault(); const v = f.querySelector('input').value.trim(); if (!v) return;
    const l = S.company[f.dataset.k] = S.company[f.dataset.k] || [];
    if (l.some(x => x.toLowerCase() === v.toLowerCase())) return toast('Already there');
    l.push(v); audit('update', 'company', 'company', `added ${f.dataset.k === 'expenseCats' ? 'expense' : 'vendor'} category ${v}`, null); save(); render();
  }, true);

  /* ---------------- Export: Excel per event + bill photos ---------------- */
  const rupees = p => (p || 0) / 100;
  const who = id => (S.users.find(u => u.id === id) || {}).name || '';
  act('s-xlsx', async ({ id }) => {
    const e = ev(id); if (!e) return; toast('Preparing Excel…');
    let X; try { X = await loadSheetJS() } catch (err) { return toast('Could not load the Excel library — check your connection') }
    const c = calc(e); const cs = S.commitments.filter(x => x.eventId === e.id);
    const vname = vid => (S.vendors.find(v => v.id === vid) || {}).name || '';
    const sheet = rows => X.utils.json_to_sheet(rows.length ? rows : [{ '(none)': '' }]);
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([['Event', e.name], ['Client', e.client], ['Date', e.startDate + (e.endDate ? ' – ' + e.endDate : '')], ['Venue', e.venue || ''], ['Guests', e.guests || 0], [], ['Contract value (₹)', rupees(c.contract)], ['Committed to vendors (₹)', rupees(c.committed)], ['Paid to vendors (₹)', rupees(c.paid)], ['Expenses (₹)', rupees(c.expenses)], ['Received from client (₹)', rupees(c.received)], ...(can('profit') ? [['Actual profit (₹)', rupees(c.actual)]] : []), [], ['Exported', new Date().toLocaleString('en-IN')], ['By', me().name]]), 'Summary');
    X.utils.book_append_sheet(wb, sheet(cs.map(x => ({ Vendor: vname(x.vendorId), Category: (S.vendors.find(v => v.id === x.vendorId) || {}).category || '', 'Agreed (₹)': rupees(x.agreedPaise), 'Estimated (₹)': x.estimatePaise ? rupees(x.estimatePaise) : '', Scope: x.scope || '', Status: x.status || '', Voided: x.voided ? 'yes: ' + (x.voidReason || '') : '', 'Added by': who(x.createdBy), Added: x.createdAt || '' }))), 'Vendors');
    X.utils.book_append_sheet(wb, sheet(S.payments.filter(p => cs.some(x => x.id === p.commitmentId)).map(p => ({ Date: p.date || '', Vendor: vname((cs.find(x => x.id === p.commitmentId) || {}).vendorId), 'Amount (₹)': rupees(p.amountPaise), Method: p.mode || '', Reference: p.ref || '', 'Paid by': who(p.paidBy), Note: p.note || '', 'Duplicate reason': p.overrideReason || '', Voided: p.voided ? 'yes: ' + (p.voidReason || '') : '', 'Recorded by': who(p.createdBy), Recorded: p.createdAt || '' }))), 'Payments');
    X.utils.book_append_sheet(wb, sheet(S.expenses.filter(x => x.eventId === e.id).map(x => ({ Date: x.date || '', 'Amount (₹)': rupees(x.amountPaise), Category: x.category || '', Money: x.source === 'own' ? 'Own money' : 'Company money', 'Spent by': who(x.spentBy || x.createdBy), Note: x.note || x.desc || '', Bill: x.photo ? 'photo' : 'no bill', Status: x.status || '', Voided: x.voided ? 'yes: ' + (x.voidReason || '') : '', Added: x.createdAt || '' }))), 'Expenses');
    X.utils.book_append_sheet(wb, sheet(S.milestones.filter(m => m.eventId === e.id).map(m => { const k = msCalc(m); return { Milestone: m.desc, 'Amount (₹)': rupees(m.amountPaise), Due: m.dueDate || '', 'Received (₹)': rupees(m.amountPaise - k.left), Overdue: k.overdue ? 'yes' : '', Voided: m.voided ? 'yes' : '' } })), 'Milestones');
    X.utils.book_append_sheet(wb, sheet(S.receipts.filter(r => r.eventId === e.id).map(r => ({ Date: r.date || '', 'Amount (₹)': rupees(r.amountPaise), Method: r.mode || '', Reference: r.ref || '', Voided: r.voided ? 'yes: ' + (r.voidReason || '') : '', 'Recorded by': who(r.createdBy) }))), 'Client payments');
    X.utils.book_append_sheet(wb, sheet(S.changes.filter(x => x.eventId === e.id).map(x => ({ Date: x.date || '', Change: x.desc, 'Amount (₹)': rupees(x.clientPaise), Approved: chApproved(x) ? 'yes' : 'no', Voided: x.voided ? 'yes: ' + (x.voidReason || '') : '', 'Added by': who(x.createdBy) }))), 'Changes');
    const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadBlob(e.name.replace(/[^\w\- &]+/g, '').trim() + '.xlsx', new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    audit('export', 'events', e.id, 'Excel export', e.id); save();
  });
  act('s-photos', ({ id }) => {
    const e = ev(id); if (!e) return;
    const xs = S.expenses.filter(x => x.eventId === e.id && x.photo && /^data:/.test(x.photo));
    if (!xs.length) return toast('No bill photos on this event');
    const files = xs.map((x, i) => { const [meta, b64] = x.photo.split(','); const ext = /png/.test(meta) ? 'png' : 'jpg'; const bin = atob(b64); const u = new Uint8Array(bin.length); for (let j = 0; j < bin.length; j++) u[j] = bin.charCodeAt(j); return { name: `${(x.date || 'undated')}_${String(i + 1).padStart(2, '0')}_${(x.category || 'expense').replace(/\W+/g, '')}_${rupees(x.amountPaise)}.${ext}`, data: u } });
    downloadBlob(e.name.replace(/[^\w\- &]+/g, '').trim() + ' bills.zip', makeZip(files));
    audit('export', 'events', e.id, `bill photos (${files.length})`, e.id); save();
  });

  /* ---------------- trim the reused tabs and screens ---------------- */
  const DROP_TITLES = /^(On the bank statement\?|Online payment links|Requests for quotes|Quotes to decide|Petty cash reconciliation|Held or declined claims|Benchmarks from your own events)/;
  function trim(app, r) {
    app.querySelectorAll('.pill.warn[title*="stands in"]').forEach(p => p.remove());
    const basic = ['home', 'events', 'reimb', 'vendors', 'overview'].includes(r) || (r === 'event' && ['client', 'vendors', 'expenses', 'changes'].includes((document.querySelector('.s-tab') || { className: '' }).className.replace(/.*s-tab-(\w+).*/, '$1')) && !document.querySelector('.s-tab-x'));
    if (!basic) return;
    app.querySelectorAll('.card').forEach(cd => { const h = cd.querySelector('h2,h3'); if (h && DROP_TITLES.test(h.textContent.trim())) cd.remove() });
    // explanations about vendor quotes/RFQs and sandbox stand-ins
    app.querySelectorAll('.pill.warn[title*="stands in"]').forEach(p => p.remove());
    app.querySelectorAll('[data-act="add-quote"],[data-act="new-rfq"],[data-act="wa-client"],[data-act="client-statement"],[data-act="vendor-compliance"],[data-act="issue-float"]').forEach(b => b.remove());
    if (r === 'event') {
      // petty-cash float block inside the expenses card
      app.querySelectorAll('.s-tab-expenses [data-act="topup-float"], .s-tab-expenses [data-act="return-float"]').forEach(b => { const blk = b.closest('.row, div'); if (blk) blk.remove() });
      app.querySelectorAll('.s-tab-expenses .small.muted').forEach(m => { if (/^Petty cash floats/.test(m.textContent.trim())) { const nx = m.nextElementSibling; m.remove(); if (nx && /holds/.test(nx.textContent)) nx.remove() } });
    }
    if (r === 'vendors') {
      const mg = app.querySelector('#vmin'); if (mg) { const col = mg.closest('.two > div'); if (col) { const two = col.parentElement; col.remove(); two.classList.add('one') } }
      const q = app.querySelector('#vq'); if (q) { q.placeholder = 'Search vendors'; const l = app.querySelector('label[for="vq"]'); if (l) l.remove() }
      app.querySelectorAll(':scope > .muted, :scope > div > .muted').forEach(m => { if (/^No vendors match/.test(m.textContent.trim()) && !S.vendors.length) m.outerHTML = '<div class="card empty-state"><div class="es-t">No vendors yet</div><div class="es-s">Everyone you pay — decorator, caterer, photographer. Saved once, reused on every event, with what you paid them each time.</div><button class="btn pri" data-act="add-dir-vendor">+ Add vendor</button></div>' });
    }
    if (r === 'vendors') app.querySelectorAll('.card:not([data-vd])').forEach(card => {
      const eb = card.querySelector(':scope > .row.between > [data-act="edit-dir-vendor"]'); if (!eb) return;
      const v = S.vendors.find(x => x.id === eb.dataset.id); if (!v) return;
      card.dataset.vd = '1';
      const cms = S.commitments.filter(c => c.vendorId === v.id && c.status === 'agreed' && !c.voided);
      const n = new Set(cms.map(c => c.eventId)).size, avg = cms.length ? Math.round(sum(cms, c => c.agreedPaise) / cms.length) : 0;
      const owed = sum(cms, c => Math.max(0, commCalc(c).outstanding));
      const head = eb.parentElement;
      head.classList.add('vd-head');
      head.innerHTML = `<div class="vd-main"><span class="t">${esc(v.name)}</span><div class="vd-sub"><span class="pill grey">${esc(v.category || 'Other')}</span>${v.phone ? `<span>${esc(v.phone)}</span>` : ''}</div></div>`;
      head.appendChild(eb);
      head.insertAdjacentHTML('afterend', `<div class="vd-stats"><div><span>Events</span><b class="num">${n}</b></div><div><span>Avg agreed</span><b class="num">${n ? inr(avg) : '—'}</b></div><div><span>Owed now</span><b class="num">${inr(owed)}</b></div></div>`);
      card.querySelectorAll(':scope > .chips').forEach(c => { if (!c.textContent.trim()) c.remove() });
      const list = card.querySelector(':scope > .list'); if (list && list.children.length) list.insertAdjacentHTML('beforebegin', '<div class="vd-label">Events with them</div>');
    });
    if (r === 'vendors') app.querySelectorAll('.pill').forEach(p => { if (/^(performance:|verified|not verified|.*licence)/i.test(p.textContent.trim())) p.remove() });
  }

  /* ---------------- expenses waiting to sync ---------------- */
  function markSync() {
    const C = window.AURIV_CLOUD; const app = document.getElementById('app'); if (!app) return;
    app.querySelectorAll('.sync-wait').forEach(n => n.remove());
    if (!C || !C.user || !C.pendingSince) return;
    const ids = S.expenses.filter(x => (x.updatedAt || x.createdAt || '') >= C.pendingSince).map(x => x.id);
    ids.forEach(id => app.querySelectorAll(`[data-id="${CSS.escape(id)}"]`).forEach(el => {
      const item = el.closest('.item, .card'); if (!item || item.querySelector('.sync-wait')) return;
      const meta = item.querySelector('.meta') || item.firstElementChild;
      meta.insertAdjacentHTML('afterend', '<span class="sync-wait"><svg viewBox="0 0 24 24"><path d="M3 3l18 18M8.5 8.6A5 5 0 0 0 7 18h10a3.5 3.5 0 0 0 1.9-.6M12 6a5 5 0 0 1 5 4.5 3.5 3.5 0 0 1 3 3.3"/></svg>Waiting to sync</span>');
    }));
  }

  /* ---------------- two roles in the team screens ---------------- */
  const ROLE_DESC = { owner: ROLES.owner.desc, staff: ROLES.staff.desc };
  const SIMPLE_DESC = { owner: 'Everything, including profit and settings', staff: 'Adds events, vendors, payments and expenses. Never sees profit or margin' };
  function syncRoleText() { ['owner', 'staff'].forEach(r => { ROLES[r].desc = on() ? SIMPLE_DESC[r] : ROLE_DESC[r] }) }
  new MutationObserver(() => {
    if (!on()) return; const sel = document.querySelector('#modal select#ur'); if (!sel || sel.dataset.two) return;
    sel.dataset.two = '1'; const order = ['owner', 'staff', 'planner', 'manager', 'accountant']; [...sel.options].sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value)).forEach(o => sel.appendChild(o));
    const btn = sel.parentElement.querySelector('.sel-btn .sel-val'); if (btn) btn.textContent = sel.options[sel.selectedIndex].textContent;
  }).observe(document.getElementById('modal'), { childList: true, subtree: true });

  /* ---------------- wire up ---------------- */
  const _vHome = vHome; vHome = function () { return on() ? vToday() : _vHome() };
  const _vEvents = vEvents; vEvents = function () { return on() ? vSimpleHome() : _vEvents() };
  const _vEvent = vEvent; vEvent = function () { return on() ? vSimpleEvent() : _vEvent() };
  const _vOverview = vOverview; vOverview = function () { return on() ? vSimpleOverview() : _vOverview() };
  const _mQE = mQuickEnquiry; mQuickEnquiry = function () { return on() ? mSimpleEvent() : _mQE() };

  const _render = render;
  render = function () {
    document.documentElement.classList.toggle('simple', on()); syncRoleText();
    const r0 = _render.apply(this, arguments);
    try {
      if (on()) {
        const app = document.getElementById('app'); let r = ''; try { r = route() } catch (e) {}
        if (r === 'settings' && app && !app.querySelector('#s-adv') && !app.querySelector('.back-more')) tidySettings(app);
        if (r !== 'settings' && S.ui.allSettings) S.ui.allSettings = false;
        dock(r);
        const h = (location.hash || '').replace('#', '');
        if (app && TOOL_KEYS().has(h) && !app.querySelector(':scope > .back-more')) app.insertAdjacentHTML('afterbegin', '<a href="#tools" class="btn sm back-more">‹ More</a>');
        if (app) trim(app, r);
        markSync();
      }
    } catch (err) { console.error('simple', err) }
    return r0;
  };
  // sheets keep the everyday fields up front; the rest moves under "More options" (still fully working)
  const MORE_FIELDS = '#f-event :is(label[for="epl"],#epl,.two:has(#epr),label.chk:has(#egst)), :is(label[for="rcur"],#rcur,#fxrow,details:has(#rcc)), :is(label:has(> #cph),label:has(> #ccp),label:has(> #cdep),label[for="cdl"],#cdl), :is(.two:has(#ptds),#ptdsh)';
  function moreOptions(m) {
    const f = m.querySelector('form'); if (!f || f.dataset.mo) return;
    const nodes = [...f.querySelectorAll(MORE_FIELDS)].map(n => n.tagName === 'SELECT' ? (n.closest('.sel') || n) : n).filter((n, i, a) => a.indexOf(n) === i && !a.some(o => o !== n && o.contains(n)))
      // a TDS rate that will be deducted always stays in view
      .filter(n => { const t = n.querySelector && n.querySelector('#ptds'); return !(t && parseFloat(t.value) > 0) && !(n.id === 'ptdsh' && (f.querySelector('#ptds') || {}).value > 0) });
    if (!nodes.length) return;
    f.dataset.mo = '1';
    const d = document.createElement('details'); d.className = 'more-opts'; d.innerHTML = '<summary>More options</summary><div class="mo-body"></div>';
    const body = d.querySelector('.mo-body'); nodes.forEach(n => body.appendChild(n));
    const anchor = f.querySelector(':scope > .ft'); f.insertBefore(d, anchor || null);
  }
  new MutationObserver(() => { const m = document.querySelector('#modal .modal'); if (!m) return; m.querySelectorAll('.pill.warn[title*="stands in"]').forEach(p => p.remove()); const eg = m.querySelector('label[for="eg"]'); if (eg && /largest/.test(eg.textContent)) eg.textContent = 'Expected guests'; moreOptions(m) }).observe(document.getElementById('modal'), { childList: true, subtree: true });

  /* dock: the same four places for everyone, plus More */
  function dock(r) {
    const tb = document.getElementById('tabbar'); if (!tb || !tb.children.length) return;
    const items = navItems(); const by = {}; items.forEach(x => by[x[0]] = x);
    const prim = (can('profit') ? ['home', 'events', 'vendors', 'overview'] : ['home', 'events', 'reimb', 'vendors']).filter(k => by[k]).slice(0, 4);
    const h = (location.hash || '').replace('#', '');
    const act = r === 'event' ? 'events' : prim.includes(r) ? r : 'more';
    tb.innerHTML = prim.map(k => `<a href="#${k}" class="${act === k ? 'on' : ''}">${T(by[k][1])}${by[k][2] ? ` <span class="cnt">${by[k][2]}</span>` : ''}</a>`).join('') + `<a href="#tools" data-act="more-nav" class="${act === 'more' ? 'on' : ''}">${T('More')}${toolBadge() ? ' <span class="cnt">•</span>' : ''}</a>`;
  }
  PAGES_EXT.tools = vTools;
  PAGES_EXT['company-full'] = () => _vOverview();

  window.AURIV_SIMPLE = { on, markSync, statusOf, tools: () => toolsFor().flatMap(([g, l]) => l.map(t => ({ key: t[0], label: t[1], desc: t[2], group: g }))) };
})();
