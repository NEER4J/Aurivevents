/* ===== x19_v59.js ===== */
/* ============================================================================
   v5.9 LAYER 19 — the six rule fixes from the 1 Nov v5.8 audit. Nothing else.
   N1 undo-restore → owner.  N2 revoke-session → own session, owner for others'.
   N3 delegate-checkin classified explicitly (any signed-in role at the door).
   N4 health-clear → owner; conflict-override needs a session.
   N5 guest-information and registration pages keyed by random tokens, not event ids.
   Rec 6: unknown action names shown on the Developer page.
   ============================================================================ */
MIGRATIONS.push({from:58,to:59,note:'v5.8 → v5.9: guest-information and registration links get random tokens (old event-id links stop working); no other data change.',up(o){ensureCollections(o);(o.events||[]).forEach(e=>{if(!e.guestInfoToken)e.guestInfoToken='gi_'+Math.random().toString(36).slice(2,12);if(!e.registerToken)e.registerToken='rg_'+Math.random().toString(36).slice(2,12)});return o}});
const randTok=p=>p+'_'+Math.random().toString(36).slice(2,12);
function guestInfoToken(e){if(!e.guestInfoToken){e.guestInfoToken=randTok('gi');save()}return e.guestInfoToken}
function registerToken(e){if(!e.registerToken){e.registerToken=randTok('rg');save()}return e.registerToken}
function eventByToken(field,tok){if(!tok)return null;return S.events.find(e=>e[field]===tok)||null}
OPEN_ACTS.delete('undo-restore');OPEN_ACTS.delete('revoke-session');OPEN_ACTS.delete('health-clear');OPEN_ACTS.delete('delegate-checkin');PUBLIC_ACTS.delete('conflict-override');OPEN_ACTS.add('conflict-override');
Object.assign(ACT_POLICY,{
  'undo-restore':'owner','health-clear':'owner',
  'revoke-session':ctx=>{const s=S.sessions.find(x=>x.id===(ctx&&ctx.id));return isOwner()||!!(s&&s.userId===UI.userId)},
  'delegate-checkin':ctx=>!!currentSession(),
  'guest-checkin':ctx=>!!currentSession()
});
/* Developer page: unknown action names seen this session */
const _vDevUnknown=vDeveloper;vDeveloper=function(){return _vDevUnknown()+`<div class="card" style="margin-top:12px"><h3>Action policy</h3><div class="small muted">Every action is public, open, or bound to a capability; anything else refuses. Names that were refused this session because they are not classified: ${UNKNOWN_ACTS.size?[...UNKNOWN_ACTS].map(n=>`<code>${esc(n)}</code>`).join(' '):'<b>none</b>'}. Public ${PUBLIC_ACTS.size} · open ${OPEN_ACTS.size} · bound ${Object.keys(ACT_POLICY).length}.</div></div>`};
SEED_EXT.push((S0,h)=>{S0.events.forEach(e=>{if(!e.guestInfoToken)e.guestInfoToken=e.id==='e1'?'gi_sample_e1':randTok('gi');if(!e.registerToken)e.registerToken=e.id==='e7'?'rg_sample_e7':randTok('rg')})});
FEATURE_MAP.push(['17 · v5.9 — rule fixes (1 Nov, second audit)',[
 ['undo-restore is owner-only','real (browser)','Sits with restore and import','Settings'],
 ['Sessions: own only','real (browser)','A person ends only their own sessions; the owner ends anyone\'s','Settings'],
 ['Door check-in reachable','real (browser)','Delegate and guest check-in explicitly open to any signed-in role','Delegates / Guests'],
 ['Diagnostics owner-only','real (browser)','Clearing the error log and outbox needs the owner; resolving a sync conflict needs a session','Health'],
 ['Unguessable guest links','real (browser)','Guest-information and registration pages use random tokens; event-id links no longer resolve','Public links'],
 ['Unknown actions visible','real (browser)','Developer page lists any action name refused for being unclassified','Developer']
]]);
CHANGELOG.unshift(['v5.9 (this build)','Six rule fixes from the second 1 Nov audit: undo-restore owner-only; revoke-session own-only; delegate/guest check-in classified open; health-clear owner-only and conflict-override session-only; random tokens on guest-information and registration links; unknown action names shown on the Developer page. No other change. The artifact stops here.']);
const _vBuild58=vBuild;vBuild=function(){return _vBuild58().replace('v5.8 is v5.7 with the 1 Nov audit fixes: default-deny action policy on every input path, session required for writes.','v5.9 is v5.8 with six rule corrections from the second 1 Nov audit. Nothing else; the next build is the server.').replace('across 16 sections','across 17 sections')};

