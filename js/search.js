/* ===== search.js — search everything =====
   One search across events, clients, vendors, vendor payments, expenses, client
   milestones and payments, changes, help topics and screens. Role-aware: staff
   never see client money, changes or profit. Tapping a result opens the exact
   event tab or vendor card. Recent searches are kept on this device. */
(function () {
  const dev = () => document.getElementById('device');
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const digits = s => String(s).replace(/[^\d]/g, '');
  const cap = m => ({ upi: 'UPI', bank: 'Bank', cash: 'Cash', cheque: 'Cheque', card: 'Card' })[m] || (m[0].toUpperCase() + m.slice(1));
  const rupees = p => Math.round((p || 0) / 100);
  const RKEY = () => { let ws = ''; try { ws = WS } catch (e) {} return 'auriv.recent.' + ws };
  const recent = () => { try { return JSON.parse(localStorage.getItem(RKEY()) || '[]') } catch (e) { return [] } };
  const remember = q => { q = q.trim(); if (q.length < 2) return; const r = [q].concat(recent().filter(x => x.toLowerCase() !== q.toLowerCase())).slice(0, 6); try { localStorage.setItem(RKEY(), JSON.stringify(r)) } catch (e) {} };

  const ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const I = {
    event: ic('<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>'),
    client: ic('<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
    vendor: ic('<path d="M3 9.5 4.5 4h15L21 9.5"/><path d="M3 9.5c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3"/><path d="M5 12.5V20h14v-7.5"/>'),
    pay: ic('<rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="M2.5 10.5h19M6.5 15h3"/>'),
    expense: ic('<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h3"/>'),
    money: ic('<path d="M12 2v20M17 6.5c0-1.9-2.2-3.5-5-3.5S7 4.6 7 6.5 9.2 10 12 10s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5"/>'),
    change: ic('<path d="M12 5v14M5 12h14"/>'),
    help: ic('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.8"/><circle cx="12" cy="17.3" r=".6" fill="currentColor"/>'),
    screen: ic('<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7h8M8 11h8M8 15h5"/>'),
    clock: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    search: ic('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    go: ic('<path d="M9 6l6 6-6 6"/>')
  };

  /* ---------------- index ---------------- */
  function build() {
    const out = [];
    const owner = can('profit'), money = can('vendors.amounts'), client = can('client');
    const evs = S.events.filter(e => !e.history && eventVisible(e));
    const evIds = new Set(evs.map(e => e.id));
    const evName = id => (S.events.find(e => e.id === id) || {}).name || '';
    const vName = id => (S.vendors.find(v => v.id === id) || {}).name || '';
    const uName = id => (S.users.find(u => u.id === id) || {}).name || '';
    const amt = p => `${rupees(p)} ${inr(p)}`;
    const add = (g, o) => out.push(Object.assign({ g }, o));
    const stat = e => (window.AURIV_SIMPLE && AURIV_SIMPLE.statusOf ? ({ enquiry: 'Enquiry', confirmed: 'Confirmed', progress: 'In progress', done: 'Done', cancelled: 'Cancelled' })[AURIV_SIMPLE.statusOf(e)] : STAGE[e.stage]) || '';

    evs.forEach(e => add('Events', { icon: 'event', title: e.name, sub: `${e.client || ''} · ${fmtDate(e.startDate)} · ${stat(e)}`, text: [e.name, e.client, e.venue, (e.functions || []).join(' '), e.type, stat(e), e.startDate].join(' '), go: { event: e.id } }));

    S.clients.forEach(c => {
      const ce = evs.filter(e => e.clientId === c.id || e.client === c.name); if (!ce.length) return;
      add('Clients', { icon: 'client', title: c.name, sub: `${c.phone ? c.phone + ' · ' : ''}${ce.length} event${ce.length > 1 ? 's' : ''}: ${ce.map(e => e.name).join(', ')}`, text: [c.name, c.phone, ce.map(e => e.name).join(' ')].join(' '), go: { event: ce[0].id } });
    });

    if (can('vendors')) S.vendors.forEach(v => {
      const cms = S.commitments.filter(c => c.vendorId === v.id && c.status === 'agreed' && !c.voided);
      add('Vendors', { icon: 'vendor', title: v.name, sub: `${v.category || ''}${v.phone ? ' · ' + v.phone : ''}${cms.length ? ` · ${new Set(cms.map(c => c.eventId)).size} event${cms.length > 1 ? 's' : ''}` : ''}`, text: [v.name, v.category, v.phone, v.notes].join(' '), go: { vendor: v.id } });
    });

    if (money) S.payments.filter(p => evIds.has(p.eventId)).forEach(p => {
      const cm = S.commitments.find(c => c.id === p.commitmentId) || {};
      add('Payments to vendors', { icon: 'pay', title: `${inr(p.amountPaise)} to ${vName(cm.vendorId)}`, sub: `${evName(p.eventId)} · ${fmtDate(p.date)}${p.mode ? ' · ' + cap(p.mode) : ''}${p.ref ? ' · ' + p.ref : ''}${p.voided ? ' · voided' : ''}`, text: [amt(p.amountPaise), vName(cm.vendorId), evName(p.eventId), p.ref, p.note, p.mode, p.date, uName(p.paidBy)].join(' '), go: { event: p.eventId, tab: 'vendors' }, voided: p.voided });
    });

    S.expenses.filter(x => evIds.has(x.eventId) && (money || owner || x.spentBy === S.ui.userId)).forEach(x => add('Expenses', { icon: 'expense', title: `${inr(x.amountPaise)} · ${x.category || 'Expense'}`, sub: `${evName(x.eventId)} · ${uName(x.spentBy)} · ${fmtDate(x.date)}${x.note ? ' · ' + x.note : ''}${x.voided ? ' · voided' : ''}`, text: [amt(x.amountPaise), x.category, x.note, evName(x.eventId), uName(x.spentBy), x.source === 'own' ? 'own money reimbursement' : 'company money', x.date].join(' '), go: { event: x.eventId, tab: 'expenses' }, voided: x.voided }));

    if (client) {
      S.milestones.filter(m => evIds.has(m.eventId)).forEach(m => { const k = msCalc(m); add('Client money', { icon: 'money', title: `${m.desc} · ${inr(m.amountPaise)}`, sub: `${evName(m.eventId)} · due ${fmtDate(m.dueDate)} · ${k.left <= 0 ? 'received' : k.overdue ? 'overdue' : inr(k.left) + ' to come'}`, text: [m.desc, amt(m.amountPaise), evName(m.eventId), k.overdue ? 'overdue' : '', m.dueDate].join(' '), go: { event: m.eventId, tab: 'client' }, voided: m.voided }) });
      S.receipts.filter(r => evIds.has(r.eventId)).forEach(r => add('Client money', { icon: 'money', title: `${inr(r.amountPaise)} received`, sub: `${evName(r.eventId)} · ${fmtDate(r.date)}${r.mode ? ' · ' + cap(r.mode) : ''}${r.ref ? ' · ' + r.ref : ''}`, text: [amt(r.amountPaise), 'received payment', evName(r.eventId), r.ref, r.mode, r.date].join(' '), go: { event: r.eventId, tab: 'client' }, voided: r.voided }));
    }
    if (owner) S.changes.filter(c => evIds.has(c.eventId)).forEach(c => add('Changes', { icon: 'change', title: `${c.desc}`, sub: `${evName(c.eventId)} · ${c.clientPaise >= 0 ? '+' : '−'}${inr(Math.abs(c.clientPaise || 0))} · ${chApproved(c) ? 'approved' : 'not yet approved'}`, text: [c.desc, amt(Math.abs(c.clientPaise || 0)), evName(c.eventId), chApproved(c) ? 'approved' : 'waiting'].join(' '), go: { event: c.eventId, tab: 'changes' }, voided: c.voided }));

    try { (window.AURIV_HELP && AURIV_HELP.faq ? AURIV_HELP.faq() : []).forEach(f => add('Help', { icon: 'help', title: f[0], sub: 'Help', text: f[0] + ' ' + f[1].replace(/<[^>]+>/g, ''), go: { help: f[0] } })) } catch (e) {}

    navItems().forEach(([k, l]) => add('Screens', { icon: 'screen', title: l, sub: 'Open', text: l + ' ' + k, go: { route: k } }));
    if (can('events.edit')) add('Screens', { icon: 'event', title: 'New event', sub: 'Add an event', text: 'new event add create wedding', go: { action: 'new-event' } });
    return out;
  }

  /* ---------------- match & rank ---------------- */
  const ORDER = ['Screens', 'Events', 'Clients', 'Vendors', 'Payments to vendors', 'Expenses', 'Client money', 'Changes', 'Help'];
  function find(q) {
    const toks = norm(q).split(/\s+/).filter(Boolean); if (!toks.length) return [];
    const res = [];
    for (const it of build()) {
      const hay = norm(it.title + ' ' + it.sub + ' ' + it.text), hayD = digits(it.text);
      let ok = true, score = 0;
      for (const t of toks) {
        const td = digits(t);
        const isNum = td.length >= 2 && td.length === t.replace(/[,.\s₹]/g, '').length;
        if (hay.includes(t)) score += norm(it.title).startsWith(t) ? 6 : norm(it.title).includes(t) ? 3 : 1;
        else if (isNum && hayD.includes(td)) score += 2;
        else { ok = false; break }
      }
      if (!ok) continue;
      if (it.voided) score -= 2;
      if (it.g === 'Screens' && norm(it.title).startsWith(toks[0])) score += 4;
      res.push(Object.assign({ score }, it));
    }
    return res.sort((a, b) => b.score - a.score);
  }
  function mark(text, q) {
    let h = esc(text);
    norm(q).split(/\s+/).filter(t => t.length > 1).forEach(t => {
      const i = norm(text).indexOf(t); if (i < 0) return;
      const raw = text.slice(i, i + t.length); h = h.replace(esc(raw), `<mark>${esc(raw)}</mark>`);
    });
    return h;
  }

  /* ---------------- UI ---------------- */
  let box = null, list = [], expanded = {};
  function open(prefill) {
    if (box) return;
    box = document.createElement('div'); box.className = 'search-ov';
    box.innerHTML = `<div class="so-bar"><label class="so-field">${I.search}<input id="so-q" type="search" placeholder="Search everything" autocomplete="off" enterkeyhint="search" aria-label="Search everything"></label><button type="button" class="so-cancel">Cancel</button></div><div class="so-body" id="so-body"></div>`;
    dev().appendChild(box);
    requestAnimationFrame(() => box.classList.add('in'));
    const input = box.querySelector('#so-q');
    input.value = prefill || ''; draw();
    setTimeout(() => input.focus(), 60);
    input.addEventListener('input', () => { expanded = {}; draw() });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const first = box.querySelector('.so-row'); if (first) first.click() }
      if (e.key === 'Escape') close();
    });
    box.querySelector('.so-cancel').addEventListener('click', close);
    box.addEventListener('click', onClick);
  }
  function close() { if (!box) return; const b = box; box = null; b.classList.remove('in'); b.classList.add('out'); setTimeout(() => b.remove(), 260) }
  function draw() {
    const q = box.querySelector('#so-q').value.trim(); const body = box.querySelector('#so-body');
    if (!q) {
      const r = recent();
      body.innerHTML = (r.length ? `<div class="so-g"><div class="so-h"><span>Recent</span><button type="button" class="so-clear">Clear</button></div>${r.map(x => `<button type="button" class="so-recent" data-q="${esc(x)}">${I.clock}<span>${esc(x)}</span></button>`).join('')}</div>` : '')
        + `<div class="so-g"><div class="so-h"><span>Jump to</span></div><div class="so-chips">${navItems().map(([k, l]) => `<button type="button" class="so-chip" data-route="${k}">${esc(l)}</button>`).join('')}</div></div>`
        + `<div class="so-tip">Search by name, place, note, reference or amount — “decor”, “Kakkanad”, “8,50,000”.</div>`;
      return;
    }
    list = find(q);
    if (!list.length) { body.innerHTML = `<div class="so-empty"><div class="es-t">No results for “${esc(q)}”</div><div class="es-s">Try a vendor, client or event name, or an amount.</div></div>`; return }
    const by = {}; list.forEach(it => (by[it.g] = by[it.g] || []).push(it));
    let i = 0;
    body.innerHTML = `<div class="so-count">${list.length} result${list.length > 1 ? 's' : ''}</div>` + ORDER.filter(g => by[g]).map(g => {
      const all = by[g], shown = expanded[g] ? all : all.slice(0, 5);
      return `<div class="so-g"><div class="so-h"><span>${g}</span><span class="so-n">${all.length}</span></div>${shown.map(it => { const idx = list.indexOf(it); i++; return `<button type="button" class="so-row ${it.voided ? 'void' : ''}" data-i="${idx}"><span class="so-ic">${I[it.icon] || I.screen}</span><span class="so-tx"><span class="so-t">${mark(it.title, q)}</span><span class="so-s">${mark(it.sub, q)}</span></span>${I.go}</button>` }).join('')}${all.length > shown.length ? `<button type="button" class="so-more" data-g="${g}">Show all ${all.length}</button>` : ''}</div>`;
    }).join('');
  }
  function onClick(e) {
    const t = e.target;
    const rec = t.closest('.so-recent'); if (rec) { const inp = box.querySelector('#so-q'); inp.value = rec.dataset.q; draw(); inp.focus(); return }
    if (t.closest('.so-clear')) { try { localStorage.removeItem(RKEY()) } catch (er) {} draw(); return }
    const more = t.closest('.so-more'); if (more) { expanded[more.dataset.g] = true; draw(); return }
    const chip = t.closest('.so-chip'); if (chip) { close(); location.hash = chip.dataset.route; return }
    const row = t.closest('.so-row'); if (!row) return;
    const it = list[+row.dataset.i]; if (!it) return;
    remember(box.querySelector('#so-q').value);
    close(); setTimeout(() => goTo(it.go), 120);
  }
  function goTo(g) {
    if (g.action === 'new-event') { location.hash = 'home'; return setTimeout(() => mQuickEnquiry(), 200) }
    if (g.route) { location.hash = g.route; return }
    if (g.help) { S.ui.helpq = g.help; save(); if (location.hash === '#help') render(); else location.hash = 'help'; return setTimeout(() => { const d = document.querySelector('.help-faq details'); if (d) d.open = true }, 350) }
    if (g.vendor) {
      const show = () => { const b = document.querySelector(`#app [data-act="edit-dir-vendor"][data-id="${CSS.escape(g.vendor)}"]`); const card = b && b.closest('.card'); const sc = document.getElementById('scroller'); if (card && sc) { sc.scrollTop += card.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12; card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash') } };
      if (location.hash === '#vendors') { S.ui.vq = ''; render(); setTimeout(show, 100) } else { S.ui.vq = ''; location.hash = 'vendors'; setTimeout(show, 450) }
      return;
    }
    if (g.event) { if (g.tab) S.ui.tab = g.tab; S.ui.eventId = g.event; save(); go('event', g.event) }
  }

  /* app bar button + keyboard shortcut */
  function addButton() {
    const bar = document.getElementById('appbar'); if (!bar || bar.querySelector('.ab-search')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ab-btn ab-search'; b.setAttribute('aria-label', 'Search everything'); b.innerHTML = I.search;
    b.addEventListener('click', () => open());
    bar.insertBefore(b, document.getElementById('ab-inbox'));
  }
  addButton();
  document.addEventListener('keydown', e => {
    if ((e.key === '/' || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) && !box && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') && !document.querySelector('.modal') && !dev().classList.contains('no-shell') && !document.documentElement.classList.contains('auth-mode')) { e.preventDefault(); open() }
  });
  window.AURIV_SEARCH = { open, close, find };
})();
