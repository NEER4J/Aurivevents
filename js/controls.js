/* ===== controls.js — custom dropdowns and phone-friendly tables =====
   Works on any markup the app renders (pages, sheets, menu) via a MutationObserver.
   - <select>: the native element stays in the DOM (the app reads .value and listens
     for change events), hidden behind a styled button that opens a picker sheet.
   - <table> with 3+ columns: rows are re-laid out as stacked label/value lists. */
(function () {
  const dev = () => document.getElementById('device');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const chev = '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>';
  const tick = '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>';

  /* ---------------- stability: focusing a field must never scroll the frame ----------------
     (sheets slide in from below; a focus() during that animation used to jump the whole screen) */
  const _focus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (o) { return _focus.call(this, Object.assign({ preventScroll: true }, o || {})) };
  ['scroll'].forEach(ev => document.addEventListener(ev, e => {
    const t = e.target;
    if (t === document || t === document.documentElement || t === document.body || (t.classList && (t.classList.contains('device') || t.classList.contains('phone') || t.classList.contains('stage') || t.id === 'modal' || t.classList.contains('modal-bg')))) {
      const el = t === document ? document.scrollingElement : t;
      if (el && (el.scrollTop || el.scrollLeft)) { el.scrollTop = 0; el.scrollLeft = 0 }
    }
  }, true));

  /* ---------------- dropdowns ---------------- */
  function label(sel) { const o = sel.options[sel.selectedIndex]; return o ? o.textContent.trim() : '' }
  function enhanceSelect(sel) {
    if (sel.dataset.cx || sel.multiple || sel.closest('.picker')) return;
    sel.dataset.cx = '1';
    const wrap = document.createElement('span');
    wrap.className = 'sel';
    if (sel.style.width && sel.style.width !== '100%') wrap.style.width = sel.style.width;
    if (/\bfont-size:\s*1[0-4]/.test(sel.getAttribute('style') || '')) wrap.classList.add('sel-sm');
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('sel-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'sel-btn'; btn.disabled = sel.disabled;
    if (sel.id) btn.setAttribute('aria-labelledby', sel.id);
    btn.innerHTML = `<span class="sel-val"></span>${chev}`;
    wrap.appendChild(btn);
    const sync = () => { const v = label(sel); btn.querySelector('.sel-val').textContent = v || 'Select…'; btn.classList.toggle('empty', !v); btn.disabled = sel.disabled };
    sync();
    sel.addEventListener('change', sync);
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openPicker(sel, sync) });
    // labels pointing at the select open the picker
    if (sel.id) document.querySelectorAll(`label[for="${CSS.escape(sel.id)}"]`).forEach(l => l.addEventListener('click', e => { e.preventDefault(); btn.focus() }));
  }

  function titleFor(sel) {
    if (sel.id) { const l = document.querySelector(`label[for="${CSS.escape(sel.id)}"]`); if (l) return l.textContent.trim() }
    const prev = sel.closest('.sel') && sel.closest('.sel').previousElementSibling;
    if (prev && prev.tagName === 'LABEL') return prev.textContent.trim();
    const a = (sel.dataset.act || sel.id || '').toLowerCase();
    if (/sort/.test(a)) return 'Sort by';
    if (/ws|company/.test(a)) return 'Company';
    if (/event|ev/.test(a)) return 'Event';
    if (/year/.test(a)) return 'Year';
    return sel.getAttribute('aria-label') || sel.title || 'Choose';
  }

  let open = null;
  function openPicker(sel, sync) {
    closePicker(true);
    const items = [];
    [...sel.children].forEach(n => {
      if (n.tagName === 'OPTGROUP') { items.push({ group: n.label }); [...n.children].forEach(o => items.push({ o })) }
      else if (n.tagName === 'OPTION') items.push({ o: n });
    });
    const many = sel.options.length > 10;
    const p = document.createElement('div');
    p.className = 'picker';
    p.innerHTML = `<div class="pk-scrim"></div><div class="pk-sheet" role="listbox" aria-label="${esc(titleFor(sel))}">
      <div class="pk-hd"><span class="pk-title">${esc(titleFor(sel))}</span><button type="button" class="pk-x" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      ${many ? '<input class="pk-search" type="search" placeholder="Search" autocomplete="off">' : ''}
      <div class="pk-list">${items.map((it, i) => it.group != null ? `<div class="pk-group">${esc(it.group)}</div>` :
        `<button type="button" class="pk-opt${it.o.selected ? ' on' : ''}" role="option" aria-selected="${it.o.selected}" data-i="${it.o.index}" ${it.o.disabled ? 'disabled' : ''} style="--k:${Math.min(i, 12)}"><span>${esc(it.o.textContent.trim())}</span>${tick}</button>`).join('')}</div></div>`;
    dev().appendChild(p);
    open = p;
    requestAnimationFrame(() => p.classList.add('in'));
    const on = p.querySelector('.pk-opt.on'), list = p.querySelector('.pk-list'); if (on && list) list.scrollTop = Math.max(0, on.offsetTop - list.clientHeight / 2 + on.offsetHeight / 2);
    p.querySelector('.pk-scrim').addEventListener('click', () => closePicker());
    p.querySelector('.pk-x').addEventListener('click', () => closePicker());
    p.querySelectorAll('.pk-opt').forEach(b => b.addEventListener('click', () => {
      const idx = +b.dataset.i;
      p.querySelectorAll('.pk-opt').forEach(x => x.classList.toggle('on', x === b));
      const changed = sel.selectedIndex !== idx;
      sel.selectedIndex = idx; sync();
      setTimeout(() => {
        closePicker();
        if (changed) { sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })) }
      }, 140);
    }));
    const s = p.querySelector('.pk-search');
    if (s) { s.addEventListener('input', () => { const q = s.value.toLowerCase(); p.querySelectorAll('.pk-opt').forEach(b => { b.hidden = q && !b.textContent.toLowerCase().includes(q) }) }); setTimeout(() => s.focus(), 250) }
  }
  function closePicker(now) {
    if (!open) return; const p = open; open = null;
    if (now) { p.remove(); return }
    p.classList.remove('in'); p.classList.add('out'); setTimeout(() => p.remove(), 300);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) { e.stopPropagation(); closePicker() } }, true);

  /* ---------------- tables ---------------- */
  function enhanceTable(t) {
    if (t.dataset.cx) return; t.dataset.cx = '1';
    const head = t.querySelector('thead tr') || (t.rows[0] && [...t.rows[0].cells].every(c => c.tagName === 'TH') ? t.rows[0] : null);
    const cols = head ? head.cells.length : (t.rows[0] ? t.rows[0].cells.length : 0);
    if (cols < 3) { t.classList.add('tbl-2'); return }
    const names = head ? [...head.cells].map(c => c.textContent.trim()) : [];
    t.classList.add('stacked');
    [...t.querySelectorAll('tbody tr, tfoot tr')].forEach(tr => {
      [...tr.cells].forEach((td, i) => { if (!td.hasAttribute('data-label')) td.setAttribute('data-label', names[i] || '') ; if (!td.textContent.trim() && !td.querySelector('button,input,select,a')) td.classList.add('blank') });
    });
    const sc = t.closest('.scroll'); if (sc) sc.classList.add('scroll-stacked');
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('select').forEach(enhanceSelect);
    root.querySelectorAll('table').forEach(enhanceTable);
  }
  const mo = new MutationObserver(muts => {
    for (const m of muts) m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.tagName === 'SELECT') enhanceSelect(n); else if (n.tagName === 'TABLE') enhanceTable(n); else scan(n) } });
  });
  function start() { scan(document.getElementById('device')); mo.observe(document.getElementById('device'), { childList: true, subtree: true }) }
  if (document.getElementById('device')) start(); else document.addEventListener('DOMContentLoaded', start);
  window.AURIV_CONTROLS = { scan, closePicker };
})();
