/* ===== visual.js — production visuals layered over the app's screens =====
   Runs after every render: adds photography, hero headers, ticket-style event
   cards and vendor thumbnails without touching the app's business logic. */
(function () {
  const IMG = 'assets/img/';
  const POOL = {
    wedding: ['wedding-1', 'wedding-2', 'wedding-3', 'wedding-4', 'wedding-5', 'wedding-6'],
    corporate: ['corporate-1', 'corporate-2', 'corporate-3', 'corporate-4'],
    other: ['party-1', 'party-2', 'party-3', 'party-4']
  };
  const VCAT = { 'décor': 'v-decor', decor: 'v-decor', catering: 'v-catering', food: 'v-catering', photography: 'v-photography', makeup: 'v-makeup', venue: 'v-venue', music: 'v-music', sound: 'v-music', priest: 'v-priest', transport: 'v-transport' };
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h };
  function evImg(e) {
    if (!e) return IMG + 'party-1.jpg';
    if (e.cover) return e.cover;
    const pool = POOL[e.type] || POOL.other;
    return IMG + pool[hash(e.id + e.name) % pool.length] + '.jpg';
  }
  const vImg = cat => IMG + (VCAT[String(cat || '').toLowerCase()] || 'v-other') + '.jpg';
  function dparts(s) { if (!s) return null; const d = new Date(s + 'T00:00:00'); if (isNaN(d)) return null; return { d: d.getDate(), m: MON[d.getMonth()], w: DOW[d.getDay()] } }
  const getEv = id => (S.events || []).find(e => e.id === id);
  const daysTo = s => { try { return daysUntil(s) } catch (e) { return null } };

  /* ---------- event cards (events list, home, anywhere) ---------- */
  function enhanceEventCards(root) {
    root.querySelectorAll('.card[data-act="open-event"][data-id]:not(.evcard)').forEach(card => {
      const e = getEv(card.dataset.id); if (!e || !card.querySelector('.t')) return;
      const dp = dparts(e.startDate);
      const body = document.createElement('div'); body.className = 'ev-body';
      while (card.firstChild) body.appendChild(card.firstChild);
      card.classList.add('evcard');
      card.innerHTML = `<div class="ev-img" style="background-image:url('${evImg(e)}')">${dp ? `<span class="ev-date"><small>${dp.w}</small><b>${dp.d}</b><small>${dp.m}</small></span>` : ''}</div>`;
      card.appendChild(body);
    });
  }

  /* ---------- home ---------- */
  function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
  function enhanceHome(app) {
    if (app.querySelector('.home-hero')) return;
    const u = me(); if (!u) return;
    const evs = (S.events || []).filter(e => !e.history && isLive(e) && (typeof eventVisible !== 'function' || eventVisible(e)) && (e.endDate || e.startDate) >= todayStr())
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const next = evs[0];
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    let html = `<div class="home-hero"><div class="hh-top"><div><div class="hh-date">${esc(today)}</div><h1 class="hh-title">${greet()}, ${esc(String(u.name).split(' ')[0])}</h1></div></div>`;
    if (next) {
      const dp = dparts(next.startDate); const n = daysTo(next.startDate);
      html += `<div class="next-card" data-act="open-event" data-id="${esc(next.id)}" role="button" tabindex="0" style="background-image:linear-gradient(180deg,rgba(0,0,0,.05) 30%,rgba(0,0,0,.72)),url('${evImg(next)}')">
        <div class="nc-top"><span class="glass-pill">${n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n > 0 ? n + ' days to go' : 'On now'}</span>${dp ? `<span class="nc-date"><b>${dp.d}</b>${dp.m}</span>` : ''}</div>
        <div class="nc-bot"><div class="nc-eyebrow">Next up · ${esc(T(STAGE[next.stage] || next.stage))}</div><div class="nc-name">${esc(next.name)}</div>
        <div class="nc-meta">${esc(next.venue || 'Venue TBD')} · ${next.guests || 0} guests</div></div></div>`;
      if (evs.length > 1) html += `<div class="sec-hd"><h2>Coming up</h2><a href="#events">See all</a></div><div class="hscroll">${evs.slice(1, 8).map(e => { const d = dparts(e.startDate); return `<div class="mini-ev" data-act="open-event" data-id="${esc(e.id)}" role="button" tabindex="0"><div class="me-img" style="background-image:url('${evImg(e)}')">${d ? `<span class="ev-date sm"><b>${d.d}</b><small>${d.m}</small></span>` : ''}</div><div class="me-name">${esc(e.name)}</div><div class="me-meta">${esc(T(STAGE[e.stage] || e.stage))}</div></div>` }).join('')}</div>`;
    } else if (can('events.edit') || u.role === 'owner') {
      html += `<div class="next-card empty" style="background-image:linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.7)),url('${IMG}wedding-1.jpg')"><div class="nc-bot"><div class="nc-name">Plan your first event</div><div class="nc-meta">Capture an enquiry, build the quote, and see your margin from day one.</div><button class="btn light" data-act="new-event" style="margin-top:12px">+ New enquiry</button></div></div>`;
    }
    html += `</div>`;
    app.insertAdjacentHTML('afterbegin', html);
    // The old page title becomes a section header
    const h1 = [...app.querySelectorAll(':scope > h1')][0]; if (h1) h1.classList.add('sec-title');
  }

  /* ---------- event detail hero ---------- */
  function enhanceEvent(app) {
    if (app.querySelector('.ev-hero')) return;
    const e = getEv(S.ui && S.ui.eventId); if (!e) return;
    const kids = [...app.children];
    const back = kids.find(k => k.matches('a[href="#events"]'));
    const eyebrow = kids.find(k => k.classList.contains('eyebrow'));
    const titleRow = kids.find(k => k.querySelector && k.querySelector(':scope > h1'));
    if (!titleRow) return;
    const hero = document.createElement('div'); hero.className = 'ev-hero';
    hero.style.backgroundImage = `linear-gradient(180deg,rgba(0,0,0,.25) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,.78) 100%),url('${evImg(e)}')`;
    hero.innerHTML = `<div class="evh-top"><a href="#events" class="round-btn" aria-label="Back to events"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></a></div><div class="evh-bot"></div>`;
    const bot = hero.querySelector('.evh-bot');
    if (eyebrow) bot.appendChild(eyebrow);
    bot.appendChild(titleRow);
    if (back) back.remove();
    app.insertBefore(hero, app.firstChild);
  }

  /* ---------- vendors: category photo thumbnails ---------- */
  function enhanceVendors(app) {
    app.querySelectorAll('.stack > .card:not(.vcard)').forEach(card => {
      const t = card.querySelector('.t'); if (!t) return;
      const pill = t.parentElement && t.parentElement.querySelector('.pill.grey'); if (!pill) return;
      card.classList.add('vcard');
      const row = card.querySelector('.row.between'); if (!row) return;
      row.insertAdjacentHTML('afterbegin', `<div class="vthumb" style="background-image:url('${vImg(pill.textContent.trim())}')"></div>`);
    });
  }

  function enhance() {
    const app = document.getElementById('app'); if (!app) return;
    let r = ''; try { r = route() } catch (e) {}
    enhanceEventCards(app);
    if (r === 'home' && me() && me().role !== 'accountant') enhanceHome(app);
    if (r === 'event') enhanceEvent(app);
    if (r === 'vendors') enhanceVendors(app);
    document.getElementById('device').dataset.route = r;
  }

  window.AURIV_VISUAL = { enhance, evImg, vImg };
})();
