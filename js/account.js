/* ===== account.js — the cloud account inside the v9.5 app =====
   One page (#account) for what the Supabase layer (cloud.js) adds on top of the app:
   sync state, the signed-in email, the company switcher, sharing a company with the team
   (invite / remove / leave), resetting the demo, installing the app, signing out.
   Reached from the menu sheet (phone), the rail footer (wide) and the menu on desk. */
(function () {
  const C = () => window.AURIV_CLOUD || {};
  const signedIn = () => !!(C().enabled && C().user);
  const syncWord = s => ({ saving: 'Syncing…', synced: 'Synced to cloud', error: 'Sync failed — retrying', offline: 'Offline — will sync later' }[s] || 'Cloud sync on');
  const syncKind = s => ({ saving: 'wait', synced: 'ok', error: 'late', offline: 'wait' }[s] || 'ok');
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => document.documentElement.classList.contains('standalone');

  function vAccount() {
    const c = C(); const rows = [];
    if (signedIn()) {
      const sh = c.currentShared(); const u = me();
      const owner = sh ? sh.owner_id === c.user.id : (u && u.role === 'owner' && !S.sample);
      rows.push(vSec(T('Account')));
      rows.push(vRow({ left: tile(c.user.email), ttl: esc(c.user.email), sub: esc(u.name) + ' · ' + esc(ROLES[u.role].label) + (c.isDemo() ? ' · ' + T('demo account') : ''), end: `<span class="v-st ${syncKind(c.state)}" id="cloud-state">${T(syncWord(c.state))}</span>` }));
      rows.push(vSec(T('Company')));
      rows.push(`<div class="v-pad"><label for="acc-ws" style="margin-top:0">${T('Open company')}</label><select id="acc-ws" data-act="acc-ws">${workspaces().map(x => `<option value="${esc(x.id)}" ${x.id === WS ? 'selected' : ''}>${esc(x.name)}${(c.shared || []).some(s => s.local_id === x.id) ? ' · ' + T('team') : ''}</option>`).join('')}</select></div>`);
      if ((owner || sh) && !c.isDemo()) rows.push(vRow({ act: 'acc-team', ttl: sh ? T('Team access') : T('Share with your team'), sub: sh ? T('Who can sign in to this company') : T('Put this company in the cloud so your team can sign in from their own phones') }));
      rows.push(vRow({ act: 'ws-new', ttl: T('New company'), sub: T('A separate, empty workspace') }));
      if (sh && !owner) rows.push(vRow({ act: 'acc-leave', ttl: `<span style="color:var(--late)">${T('Leave this company')}</span>`, sub: T('You lose access until the owner invites you again') }));
      if (c.isDemo()) rows.push(vRow({ act: 'acc-reset-demo', ttl: T('Reset the demo'), sub: T('Back to the sample data') }));
    } else {
      rows.push(vSec(T('Account')));
      rows.push(vEmpty(T('This device only: nothing is sent to the cloud. Sign in with an account to sync between devices and share with your team.'), c.enabled ? `<button class="btn pri" data-act="acc-signin">${T('Sign in with an account')}</button>` : ''));
    }
    rows.push(vSec(T('Theme')));
    rows.push(`<div class="v-pad">${window.AURIV_THEME ? AURIV_THEME.seg() : ''}</div>`);
    if (!standalone() && (window.__installPrompt || isIOS())) {
      rows.push(vSec(T('App')));
      rows.push(vRow({ act: 'acc-install', ttl: window.__installPrompt ? T('Install the app') : T('Add to Home Screen'), sub: T('Opens full screen, works with no signal') }));
    }
    rows.push(vSec(T('Help')));
    rows.push(vRow({ href: '#help', ttl: T('Help & tutorials') }));
    rows.push(vSec(''));
    rows.push(vRow({ act: 'signout', ttl: T('Sign out'), end: '' }));
    return vFrame({ key: 'account', title: T('Account'), sub: esc(S.company.name), back: '#home', body: `<div class="v-list">${rows.join('')}</div>` });
  }
  addPage('account', 'Account', vAccount);

  new MutationObserver(() => {
    const s = document.documentElement.dataset.cloud || '';
    document.querySelectorAll('#cloud-state,[data-cloud-word]').forEach(el => { el.textContent = T(syncWord(s)); el.className = el.className.replace(/\b(ok|wait|late)\b/g, '').trim() + ' ' + syncKind(s) });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-cloud'] });

  /* ---------- actions ---------- */
  v7act('acc-ws', SESSION, el => { const v = el && el.value; if (v && v !== WS) switchWorkspace(v) }, 'change');
  v7act('acc-signin', () => true, () => { sessionStorage.removeItem('auriv.localOnly'); location.replace(location.pathname) });
  v7act('acc-reset-demo', SESSION, () => { if (confirm(T('Reset the demo company back to its sample data?'))) C().resetDemo() });
  v7act('acc-leave', SESSION, () => { if (confirm(T('Leave') + ' ' + S.company.name + '? ' + T('You will lose access until the owner invites you again.'))) C().leave() });
  v7act('acc-team', SESSION, () => teamSheet());
  v7act('acc-share-now', SESSION, ({ el }) => { const b = el || {}; b.disabled = true; C().shareCurrent().then(() => { toast(T('Company shared')); teamSheet() }).catch(err => { b.disabled = false; toast(err.message) }) });
  v7act('acc-rm-member', SESSION, ({ el }) => { const em = el && el.dataset.v; if (!em || !confirm(T('Remove') + ' ' + em + '?')) return; C().removeMember(em).then(() => { toast(T('Removed')); teamSheet() }).catch(err => toast(err.message)) });
  v7act('acc-copy-link', SESSION, () => { const t = location.origin + location.pathname; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast(T('Link copied')), () => prompt(T('Copy this link'), t)) });
  v7act('acc-install', () => true, async () => {
    const pr = window.__installPrompt;
    if (!pr) return openModal(`${hd(T('Add to Home Screen'))}<ol style="padding-left:20px;line-height:1.7"><li>Tap the <b>Share</b> button in Safari (the square with an arrow).</li><li>Scroll and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. Aurivevents now opens full screen, like an app.</li></ol><div class="ft"><button class="btn pri" data-act="close">${T('Done')}</button></div>`);
    pr.prompt(); const r = await pr.userChoice.catch(() => null); window.__installPrompt = null; document.documentElement.classList.remove('can-install');
    if (r && r.outcome === 'accepted') toast(T('Installing Aurivevents')); render();
  });

  async function teamSheet() {
    const c = C(); const sh = c.currentShared();
    if (!sh) return openModal(`${hd(T('Share with your team'))}
      <p>Put <b>${esc(S.company.name)}</b> in the cloud so your team can sign in from their own phones. Everyone works on the same events, and changes show up for the others within seconds.</p>
      <p class="small">What each person can see still follows their role under Setup › People.</p>
      <div class="ft"><button class="btn" data-act="close">${T('Not now')}</button><button class="btn pri" data-act="acc-share-now">${T('Share this company')}</button></div>`);
    openModal(`${hd(T('Team access'))}<div id="team-body" class="v-note">${T('Loading…')}</div>`);
    let rows = [];
    try { rows = await c.members() } catch (err) { const tb = document.getElementById('team-body'); if (tb) tb.textContent = err.message; return }
    const tb = document.getElementById('team-body'); if (!tb) return;
    const owner = sh.owner_id === c.user.id;
    const who = id => { const x = S.users.find(u => u.id === id); return x ? `${esc(x.name)} · ${esc((ROLES[x.role] || {}).label || x.role)}` : T('Unknown team member') };
    const linked = new Set(rows.map(r => r.app_user_id));
    const free = S.users.filter(u => u.active !== false && !linked.has(u.id));
    tb.outerHTML = `<div class="v-list" style="margin:0 calc(-1 * var(--s4))">${rows.map(r => vRow({ ttl: esc(r.email), wrap: true, sub: who(r.app_user_id),
        end: `<span class="v-st ${r.user_id ? 'ok' : 'wait'}">${r.user_id ? T('Joined') : T('Invited')}</span>${owner && r.user_id !== c.user.id ? `<button class="btn sm danger" data-act="acc-rm-member" data-v="${esc(r.email)}" aria-label="${T('Remove')}">✕</button>` : ''}` })).join('')}</div>
      ${owner ? (free.length ? `<form id="f-team"><h3 style="margin-top:16px">${T('Invite someone')}</h3>
        <label for="tm-email">${T('Their email')}</label><input id="tm-email" type="email" required placeholder="name@company.com" inputmode="email">
        <label for="tm-user">${T('They are')}</label><select id="tm-user">${free.map(u => `<option value="${esc(u.id)}">${esc(u.name)} · ${esc((ROLES[u.role] || {}).label || u.role)}</option>`).join('')}</select>
        <div class="help">Not in the list? Add them first under Setup › People, then come back. They sign up at the app link with this email and the company appears for them.</div>
        <div class="ft"><button class="btn" type="button" data-act="acc-copy-link">${T('Copy app link')}</button><button class="btn pri" type="submit">${T('Send invite')}</button></div></form>`
      : `<p class="small" style="margin-top:12px">Everyone on your team already has access. Add more people under Setup › People.</p>`) : `<p class="small">${T('Only the owner can invite or remove people.')}</p>`}`;
    const f = document.getElementById('f-team');
    if (f) f.addEventListener('submit', e => {
      e.preventDefault(); const em = document.getElementById('tm-email').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(em)) return toast(T('Enter a valid email'));
      c.invite(em, document.getElementById('tm-user').value).then(() => { toast(T('Invite saved')); teamSheet() }).catch(err => toast(err.message));
    });
  }
  window.addEventListener('beforeinstallprompt', () => setTimeout(() => { try { if (route() === 'account') render() } catch (e) {} }, 0));
})();
