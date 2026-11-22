/* ===== layout.js — the production layout over every screen =====
   The feature layers draw each screen as one flat list (sections + rows). This layer turns that into the
   app's layout, the same way on every screen:
   - each section becomes a titled card (phone: inset grouped cards; desktop: cards on a grey canvas);
   - on tablet and desktop the screen's main action moves from the bottom bar into the page header;
   - on tablet and desktop, detail opens in a drawer from the right (with a scrim) instead of a fixed pane;
   - Home on desktop lays its cards out as a two-column dashboard (see css).
   It only moves and wraps existing elements; every button keeps its data-act, so actions and permissions
   are untouched. */
(function () {
  const big = () => window.innerWidth >= 760;

  /* sections → cards */
  function group(list) {
    if (!list || list.dataset.grouped) return;
    list.dataset.grouped = '1';
    const kids = [...list.children]; let card = null;
    kids.forEach(el => {
      if (el.classList.contains('v-sec')) {
        const sec = document.createElement('section'); sec.className = 'ui-group';
        list.insertBefore(sec, el); sec.appendChild(el);
        card = document.createElement('div'); card.className = 'ui-card'; sec.appendChild(card);
        return;
      }
      if (card) card.appendChild(el);
      else el.classList.add('ui-lead');
    });
    list.querySelectorAll('.ui-card').forEach(c => { if (!c.children.length) c.parentElement.classList.add('ui-empty-group') });
    // rows that come before any section heading also sit in a card
    const lead = [...list.children].filter(el => el.classList.contains('ui-lead') && /\bv-(row|ban|kv)\b/.test(el.className));
    if (lead.length) { const c = document.createElement('div'); c.className = 'ui-card ui-card-lead'; list.insertBefore(c, lead[0]); lead.forEach(el => { el.classList.remove('ui-lead'); c.appendChild(el) }) }
  }

  /* bottom action bar → header actions on tablet and desktop */
  function actions(app) {
    const page = app.querySelector(':scope > .v-page'); const bar = app.querySelector(':scope > .v-bar');
    if (!page || !bar || !big()) return;
    const top = page.querySelector('.v-top'); if (!top) return;
    let box = top.querySelector('.ui-actions'); if (!box) { box = document.createElement('div'); box.className = 'ui-actions'; top.appendChild(box) }
    [...bar.children].forEach(b => { if (b.classList.contains('v-ib')) b.classList.add('ui-ib'); box.appendChild(b) });
    bar.remove();
  }

  /* Home's side panel (cash and people, the accountant's books…) becomes part of the dashboard */
  function homePanelIn(app) {
    const p = document.getElementById('panel'); const hp = p && p.querySelector('[data-home-panel]');
    const list = app.querySelector('.v-page[data-page="home"] .v-body > .v-list');
    if (!hp || !list) return;
    const box = document.createElement('div'); box.className = 'v-list';
    let src = hp.querySelector('.v-list') || hp;
    while (src.children.length === 1 && src.firstElementChild.matches('.v-list, .v-body, div:not([class])')) src = src.firstElementChild;
    [...src.children].forEach(el => { if (!el.classList.contains('hd')) box.appendChild(el) });
    group(box);
    [...box.children].forEach(el => { el.classList.add('ui-from-panel'); list.appendChild(el) });
    p.innerHTML = '';
  }

  function layout() {
    const app = document.getElementById('app'); if (!app) return;
    app.querySelectorAll('.v-page > .v-body > .v-list, .v-page > .v-body > div > .v-list').forEach(group);
    if (big()) homePanelIn(app);
    // Setup: everyday settings first; sample-only and import tools after
    const sl = app.querySelector('.v-page[data-page="settings"] .v-body > .v-list');
    if (sl) [...sl.querySelectorAll(':scope > .ui-group')].filter(g => /^(Sample|Excel import)/i.test((g.querySelector('.eyebrow') || {}).textContent || '')).forEach(g => sl.appendChild(g));
    actions(app);
    const page = app.querySelector('.v-page'); document.body.dataset.page = page ? page.dataset.page || '' : '';
    drawer();
  }

  /* detail drawer */
  function drawer() {
    const p = document.getElementById('panel'); if (!p) return;
    const open = big() && !!p.querySelector('.modal:not([data-home-panel])');
    document.body.classList.toggle('drawer-open', open);
    let s = document.getElementById('scrim'); if (!s) { s = document.createElement('div'); s.id = 'scrim'; s.addEventListener('click', () => { try { closeModal() } catch (e) {} }); document.body.appendChild(s) }
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) { try { closeModal() } catch (err) {} } });

  const _render = render; render = function () { const r = _render.apply(this, arguments); try { layout() } catch (e) { console.error('layout', e) } return r };
  const _open = openModal; openModal = function () { const r = _open.apply(this, arguments); try { drawer() } catch (e) {} return r };
  const _close = closeModal; closeModal = function () { const r = _close.apply(this, arguments); try { drawer() } catch (e) {} return r };
  /* moving to another page closes a menu or detail sheet that has nothing typed in it */
  window.addEventListener('hashchange', () => { const m = document.querySelector('#modal .modal, #panel .modal:not([data-home-panel])'); if (m && !m.querySelector('form, input, textarea, select')) { try { closeModal() } catch (e) {} } });
  let wasBig = big(); window.addEventListener('resize', () => { if (big() !== wasBig) { wasBig = big(); try { render() } catch (e) {} } });
})();
