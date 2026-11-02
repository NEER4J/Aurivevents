/* ===== simple.js — the basic app from the build guide =====
   Simple mode is ON by default. It shows only what the guide describes:
     Home (events) · Event page (six numbers + Client money / Vendors / Expenses / Changes)
     Reimbursements · Vendor directory · Company overview (owner) · Settings (owner)
   Everything else stays in the code, untouched, behind Settings → "Advanced tools".
   The switch is per company (S.company.advanced). */
(function () {
  const on = () => { try { return !(S && S.company && S.company.advanced === true) } catch (e) { return true } };
  const SIMPLE_ROUTES = ['home', 'events', 'event', 'reimb', 'vendors', 'overview', 'settings'];
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
    const out = [['home', 'Home', '']];
    out.push(['reimb', 'Reimbursements', (by.reimb || [])[2] || '']);
    if (can('vendors')) out.push(['vendors', 'Vendors', '']);
    if (can('profit')) out.push(['overview', 'Company', '']);
    if (me().role === 'owner') out.push(['settings', 'Settings', '']);
    return out;
  };
  const _route = route;
  route = function () {
    const r = _route();
    if (!on()) return r;
    if (SIMPLE_ROUTES.includes(r)) return r;
    // advanced screens (by nav or registered page) fall back to Home; public links are untouched
    const adv = new Set(_nav().map(x => x[0]).concat(Object.keys(window.PAGES_EXT || {})));
    return adv.has(r) ? 'home' : r;
  };

  /* ---------------- two roles: staff do the work, never see profit ---------------- */
  const STAFF_CAPS = ['events.edit', 'vendors', 'vendors.amounts', 'payments', 'expenses', 'directory.edit', 'docs.view'];
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
        : `<div class="card empty-state"><div class="es-t">${all.length ? 'Nothing here' : 'No events yet'}</div><div class="es-s">${all.length ? 'Try another filter.' : 'Add your first event: the client, the date and what they are paying.'}</div>${!all.length && can('events.edit') ? '<button class="btn pri" data-act="new-event">+ New event</button>' : ''}</div>`}
    </div>`;
  }
  act('sfilter', ({ v }) => { S.ui.sfilter = v; save(); render() });

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
        <div class="sp-row main"><div><div class="sp-l">Actual profit</div><div class="sp-s">from what you've committed</div></div><div class="sp-v"><span class="num">${inr(c.actual)}</span><span class="sp-p">${pct(c.actual, c.contract)}</span></div></div>
        <div class="sp-row"><div><div class="sp-l">Expected profit</div><div class="sp-s">from your estimates</div></div><div class="sp-v">${ex ? `<span class="num">${inr(ex.amt)}</span><span class="sp-p">${pct(ex.amt, ex.base)}</span>` : '<span class="num">—</span>'}</div></div>
      </div>` : ''}
    </div>`;
  }
  const TABS = () => {
    const t = [];
    if (can('client')) t.push(['client', 'Client money']);
    t.push(['vendors', 'Vendors'], ['expenses', 'Expenses']);
    if (isOwnerish()) t.push(['changes', 'Changes']);
    return t;
  };
  function vSimpleEvent() {
    const e = ev(S.ui.eventId); if (!e) return vSimpleHome();
    if (!eventVisible(e)) return _vEvent();
    const c = calc(e); const lk = locked(e);
    const tabs = TABS(); const cur = tabs.some(t => t[0] === S.ui.tab) ? S.ui.tab : tabs[0][0];
    const fns = { client: tabSimpleClient, vendors: tabSimpleVendors, expenses: tabSimpleExpenses, changes: tabSimpleChanges };
    const days = daysUntil(e.startDate);
    let body = ''; try { body = fns[cur](e, c) } catch (err) { body = `<div class="alert small">This tab could not be drawn: ${esc(err.message)}</div>` }
    return `<a href="#events" class="btn sm">← Events</a>
      <div class="eyebrow">${({ wedding: 'Wedding', corporate: 'Corporate', other: 'Event' })[e.type] || 'Event'} · ${fmtDate(e.startDate)}${e.endDate && e.endDate !== e.startDate ? ' – ' + fmtDate(e.endDate) : ''}${statusOf(e) === 'done' || statusOf(e) === 'cancelled' ? '' : days > 0 ? ` · ${days} days to go` : days === 0 ? ' · Today' : ''}</div>
      <div class="row between"><h1>${esc(e.name)}</h1><div class="row" style="gap:8px"><button class="btn sm status-btn" data-act="s-status" ${lk || !can('events.edit') ? 'disabled' : ''}>${STATUS_LABEL[statusOf(e)]}${lk || !can('events.edit') ? '' : ' <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>'}</button>${can('events.edit') && !lk ? '<button class="btn sm" data-act="edit-event">Edit</button>' : ''}</div></div>
      <div class="ev-sub">${esc(e.client || '')}${e.phone ? ' · ' + esc(e.phone) : ''} · ${esc(e.venue || 'Venue to be decided')} · ${e.guests || 0} guests${(e.functions || []).length ? ' · ' + e.functions.map(esc).join(', ') : ''}</div>
      ${sixNumbers(e, c)}
      <div class="tabs s-tabs">${tabs.map(([k, l]) => `<button class="btn ${cur === k ? 'pri' : ''}" data-act="tab" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="s-tab s-tab-${cur}">${body}</div>`;
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
      <div class="row between"><h2>Milestones</h2>${!lk ? '<button class="btn pri sm" data-act="add-ms">+ Add milestone</button>' : ''}</div>
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
  function advancedCard() {
    return `<div class="card adv-card" id="s-adv"><div class="row between" style="flex-wrap:nowrap"><div><h2>Advanced tools</h2><div class="small muted">Quotes, tasks, crew, run sheets, guests, client portal, bank reconciliation and more. Off keeps the app to the basics.</div></div>
      <button type="button" class="switch ${on() ? '' : 'on'}" role="switch" aria-checked="${!on()}" data-act="s-adv" aria-label="Advanced tools"><i></i></button></div></div>`;
  }
  function tidySettings(app) {
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
    app.insertAdjacentHTML('beforeend', categoriesCard() + exportCard() + advancedCard());
  }
  act('s-adv', () => {
    const turningOn = on();
    if (turningOn && !confirm('Turn on advanced tools for everyone in this company?')) return;
    S.company.advanced = turningOn ? true : false; audit('update', 'company', 'company', 'advanced tools ' + (turningOn ? 'on' : 'off'), null);
    save(); location.hash = 'settings'; render(); toast(turningOn ? 'Advanced tools on' : 'Back to the basics');
  });
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
    app.querySelectorAll('.card').forEach(cd => { const h = cd.querySelector('h2,h3'); if (h && DROP_TITLES.test(h.textContent.trim())) cd.remove() });
    // explanations about vendor quotes/RFQs and sandbox stand-ins
    app.querySelectorAll('.pill.warn[title*="stands in"]').forEach(p => p.remove());
    app.querySelectorAll('[data-act="add-quote"],[data-act="new-rfq"],[data-act="wa-client"],[data-act="client-statement"],[data-act="vendor-compliance"],[data-act="issue-float"]').forEach(b => b.remove());
    if (r === 'event') {
      // petty-cash float block inside the expenses card
      app.querySelectorAll('.s-tab-expenses [data-act="topup-float"], .s-tab-expenses [data-act="return-float"]').forEach(b => { const blk = b.closest('.row, div'); if (blk) blk.remove() });
      app.querySelectorAll('.s-tab-expenses .small.muted').forEach(m => { if (/^Petty cash floats/.test(m.textContent.trim())) { const nx = m.nextElementSibling; m.remove(); if (nx && /holds/.test(nx.textContent)) nx.remove() } });
    }
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
    sel.dataset.two = '1'; [...sel.options].forEach(o => { if (!['owner', 'staff'].includes(o.value) && !o.selected) o.remove() });
    const btn = sel.parentElement.querySelector('.sel-btn .sel-val'); if (btn) btn.textContent = sel.options[sel.selectedIndex].textContent;
  }).observe(document.getElementById('modal'), { childList: true, subtree: true });

  /* ---------------- wire up ---------------- */
  const _vHome = vHome; vHome = function () { return on() ? vSimpleHome() : _vHome() };
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
        if (r === 'settings' && app && !app.querySelector('#s-adv')) tidySettings(app);
        if (app) trim(app, r);
        markSync();
      } else {
        const app = document.getElementById('app');
        if (app && route() === 'settings' && !app.querySelector('#s-adv') && me() && me().role === 'owner') app.insertAdjacentHTML('afterbegin', advancedCard());
      }
    } catch (err) { console.error('simple', err) }
    return r0;
  };
  // sheets (record payment, add expense…) also lose the sandbox clutter; no TDS in the basic app
  new MutationObserver(() => { if (!on()) return; const m = document.querySelector('#modal .modal'); if (!m) return; m.querySelectorAll('.pill.warn[title*="stands in"]').forEach(p => p.remove()); const t = m.querySelector('#ptds'); if (t && !t.dataset.zero) { t.dataset.zero = '1'; t.value = '0'; t.dispatchEvent(new Event('input', { bubbles: true })) } }).observe(document.getElementById('modal'), { childList: true, subtree: true });

  window.AURIV_SIMPLE = { on, markSync, statusOf };
})();
