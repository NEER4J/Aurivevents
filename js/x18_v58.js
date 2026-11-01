/* ===== x18_v58.js ===== */
/* ============================================================================
   v5.8 LAYER 18 — audit fixes only (1 Nov audit).
   A1. The action policy is default-DENY. Every action name is classified: public (no session), open
       (any signed-in role), or a capability/owner rule. Anything unclassified refuses and is audited.
       The same check covers the change / input / file dispatchers and the confirm button inside dialogs.
   A2. Any write needs a session. Public pages keep a short allow-list of their own actions.
   Rec 3: an accountant user and a published guest-information page in the sample company.
   Rec 5: the closed-period guard says what it covers.
   Rec 6: silent route fallbacks are audited.
   Rec 4: Malayalam toggle labelled beta.
   Still client-side: this makes the prototype match the spec; the server enforces the same table.
   ============================================================================ */
MIGRATIONS.push({from:57,to:58,note:'v5.7 → v5.8: no data changes; default-deny action policy, session required for writes.',up(o){ensureCollections(o);return o}});

/* ---------- Public actions: the token pages' own controls and sign-in. No session needed. ---------- */
const PUBLIC_ACTS=new Set(['close','close-bg','lang','login-sample','login-invite','login-recover','login-request-recovery','login-resend','login-back','sign-otp','ws-go','ws-join','ws-new','ws-pick','sync-reload','sync-retry','conflict-reload','conflict-override','ack-decline','ack-query','cl-decline','cl-question','rsvp-again','rsvp-optout','hh-optout','pay-sim','privacy-show','support-feedback','tour','defs-seen','more-nav','tab','tf','filter','cal','year','go-result']);
/* ---------- Open actions: any signed-in role, scoped by event visibility and ownership inside the action ---------- */
const OPEN_ACTS=new Set(['signout','passkey','session-add','revoke-session','open-event','open-task','show-gates','read-all','read-note','view-doc','view-photo','view-proof','doc-link','doc-download','copy-text','view-save','view-del','view-open','bulk-open','bulk-undo','rs-seen','msg-ack','msg-block','pack-copy','pack-pdf','pack-print','ics','manifest-copy','seat-print','badges-print','beo-copy','beo-pdf','esort','cv-event','jc-event','jc-comm','vq','vmin','eq','cq','af-q','ciq','dq','dq2','fq','gq','gq2','pbq','af-entity','af-event','af-user','ai-event','pack-event','pack-fn','seat-fn','ci-fn','qcmp-a','qcmp-b','undo-restore',
  /* own work */ 'add-exp','add-task','toggle-task','raise-issue','raise-issue-home','resolve-issue','issue-photo','checkin','time-add','float-ack','safety-tick','guest-checkin','delegate-checkin','catering-count','rsf','wa-brief','comm-log','lead-remind','health-run','health-report','health-clear','rp-list','rp-test']);
/* ---------- Everything else: a capability, 'owner', or 'sample' (extends the v5.7 table) ---------- */
Object.assign(ACT_POLICY,{
  'pay':'payments','pay-from-home':'payments','expense-dispute':'reimb.settle','expense-undispute':'reimb.settle',
  'attend-correct':ctx=>{const a=S.assignments.find(x=>x.id===(ctx&&ctx.id));const k=a&&crewOf(a.crewId);return !!(k&&k.userId===UI.userId)||can('crew.assign')},'time-del':ctx=>{const t=S.timesheets.find(x=>x.id===(ctx&&ctx.id));return !!(t&&t.userId===UI.userId)||can('crew.manage')},'float-adopt':ctx=>{const f=S.floats.find(x=>x.id===(ctx&&ctx.id));return !!(f&&f.userId===UI.userId)||can('float.issue')},'float-photo':ctx=>{const f=S.floats.find(x=>x.id===(ctx&&ctx.id));return !!(f&&f.userId===UI.userId)||can('float.issue')},'mk-list':'owner','mk-interest':'owner','add-income':'client','reset':'owner','mfa-toggle':ctx=>ctx&&ctx.id&&ctx.id!=='company'?(ctx.id===UI.userId||isOwner()):isOwner(),'bm-optin':'owner','ai-accept-ocr':'reimb.settle','ai-reject-ocr':'reimb.settle','ai-apply-timeline':'tasks.manage','ai-aud':'profit',
  'edit-client':'client','client-consent':'client','client-prefs':'client','lead-edit':'client','lead-spam':'client','wa-client':'client','wa-req':'client','reapply-guests':'budget','headcount':'events.edit',
  'add-vendor':'directory.edit','add-dir-vendor':'directory.edit','edit-dir-vendor':'directory.edit','wa-vendor':'vendors','deliv':'vendors','jc-link':'vendors','jc-revoke':'vendors',
  'add-rs':'runsheet','edit-rs':'runsheet','delay-rs':'runsheet','toggle-rs':'runsheet','wa-rs':'runsheet','rs-broadcast':'runsheet','cues-make':'runsheet','zones-edit':'runsheet','venueops-edit':'runsheet','safety-edit':'runsheet','board-add':'runsheet','board-item':'runsheet','board-send':'runsheet',
  'attend':'crew.assign','att-all':'crew.assign','attend-final':'crew.assign',
  'alloc-add':'tasks.manage','alloc-del':'tasks.manage','alloc-out':'tasks.manage','alloc-return':'tasks.manage','arrival-add':'tasks.manage','arrival-del':'tasks.manage','trip-add':'tasks.manage','trip-del':'tasks.manage','trip-handover':'tasks.manage','trip-pack':'tasks.manage','vehicle-add':'tasks.manage','item-add':'tasks.manage','item-edit':'tasks.manage','travel-add':'tasks.manage','speaker-add':'tasks.manage',
  'guest-add':'client','guest-edit':'client','guest-import':'client','guest-rsvp':'client','household-add':'client','table-add':'client','table-del':'client','table-open':'client','room-add':'client','room-del':'client','seat-auto':'client','ent-edit':'client','guestinfo-edit':'events.edit','family-add':'client','family-del':'client',
  'doc-meta':'docs.edit','dold':'docs.edit',
  'bank-csv':'payments','guest-csv':'client','import-backup':'owner'
});
/* unknown names are refused and remembered, so the regression test can list them */
window.UNKNOWN_ACTS=new Set();
function actAllowed(name,ctx){if(PUBLIC_ACTS.has(name))return true;const s=currentSession();if(!s)return false;const u=me();if(!u)return false;const pol=actPolicy(name);if(pol!=null){return typeof pol==='function'?!!pol(ctx||{}):pol==='owner'?u.role==='owner':pol==='sample'?!!S.sample:Array.isArray(pol)?pol.some(c=>can(c)):can(pol)}if(OPEN_ACTS.has(name))return true;UNKNOWN_ACTS.add(name);return false}
/* change / input / file dispatchers go through the same gate */
['ACTS_CHANGE','ACTS_INPUT','ACTS_FILE'].forEach(reg=>{const R=window[reg];Object.keys(R).forEach(k=>{const f=R[k];R[k]=function(el){if(!actAllowed(k,{el,id:el&&el.dataset&&el.dataset.id}))return denyAct(k);return f.apply(this,arguments)}})});
document.addEventListener('change',evt=>{const el=evt.target.closest('[data-act]');const name=el?el.dataset.act:(evt.target.dataset&&evt.target.dataset.file);if(!name)return;if(ACTS_CHANGE[name]||ACTS_FILE[name])return;if(!actAllowed(name,{el,id:el&&el.dataset.id})){evt.stopImmediatePropagation();denyAct(name)}},true);
document.addEventListener('input',evt=>{const el=evt.target.closest('[data-act]');if(!el)return;const name=el.dataset.act;if(ACTS_INPUT[name])return;if(!actAllowed(name,{el})){evt.stopImmediatePropagation();denyAct(name)}},true);
/* confirm buttons inherit the policy of the action that opened the dialog */
window.CURRENT_ACT=null;window.CURRENT_CTX=null;
document.addEventListener('click',evt=>{const el=evt.target.closest('[data-act]');if(el){CURRENT_ACT=el.dataset.act;CURRENT_CTX={el,id:el.dataset.id,v:el.dataset.v}}},true);
window.addEventListener('click',()=>{CURRENT_ACT=null;CURRENT_CTX=null});/* context lives for this click only; a dialog opened later by script has no action to inherit */
Object.keys(ACTS).forEach(k=>{const f=ACTS[k];ACTS[k]=function(ctx){const prev=CURRENT_ACT,prevC=CURRENT_CTX;CURRENT_ACT=k;CURRENT_CTX=ctx||CURRENT_CTX;try{return f.apply(this,arguments)}finally{CURRENT_ACT=prev;CURRENT_CTX=prevC}}});
/* the confirm step re-authorises with the same context as the request (v5.10: id carried through, so own-record rules hold) */
const _mConfirmPol=mConfirm;mConfirm=function(title,body,label,fn){const name=CURRENT_ACT,ctx=CURRENT_CTX||{};return _mConfirmPol(title,body,label,()=>{if(name&&!actAllowed(name,ctx))return denyAct(name);if(!name&&!isOwner())return denyAct('confirm');/* a dialog with no opening action (script, or an async path such as recovery-point restore) is owner-only */fn()})};

/* ---------- Rec 6: silent route fallbacks are audited ---------- */
const _routeAudit=route;route=function(){const raw=(location.hash||'#home').replace('#','').split('/')[0];const r=_routeAudit();if(r!==raw&&raw&&raw!=='home'&&currentSession()&&!PAGES_EXT[raw]&&!/^(vendorack|client|portal|jobcard|pay|rsvp|family|guestinfo|register|enquire)$/.test(raw)){const u=me();if(!DENIED.some(d=>d.name==='route:'+raw&&d.userId===(u&&u.id)&&Date.now()-new Date(d.ts)<5000)){DENIED.push({name:'route:'+raw,userId:u&&u.id,ts:nowISO()});S.audit.push({ts:nowISO(),userId:u&&u.id,action:'denied',entity:'page',id:raw,detail:'redirected to '+r+' (not in this role\'s pages)',eventId:null});try{save()}catch(e){}}}return r};

/* ---------- Rec 5: what the closed-period guard covers ---------- */
settingsCard(()=>{const lt=lockedThrough();return `<div class="card"><h2>Closed periods</h2><div class="small muted">${lt?`Books closed through <b>${fmtShort(lt)}</b>.`:'No period closed yet (Books → Close period).'} The guard refuses any save that adds, changes or removes a record dated on or before the close, in these record types: <b>${Object.keys(DATED).map(k=>k.replace(/([A-Z])/g,' $1').toLowerCase()).join(', ')}</b> (milestones by due date). Fields that do not change money — bank match, export batch, document number, opened-count — are ignored. Reopen with a reason from Books; every change made while reopened is logged with that reason.</div></div>`});

/* ---------- Rec 4: Malayalam is partial; say so ---------- */
const _renderMl=render;render=function(){const r=_renderMl();document.querySelectorAll('[data-act=lang]').forEach(b=>{if(S.company.lang!=='ml'&&!/beta/.test(b.textContent))b.textContent=b.textContent.trim()+(b.textContent.trim().length>2?' (beta)':'')});return r};

/* ---------- Sample data: accountant user, published guest page ---------- */
SEED_EXT.push((S0,h)=>{if(!S0.users.some(u=>u.role==='accountant'))S0.users.push({id:'u6',name:'Thomas',phone:'+91 98470 00006',role:'accountant',active:true});
  const e1=S0.events.find(e=>e.id==='e1');if(e1&&!(e1.guestInfo||{}).enabled)e1.guestInfo={enabled:true,externalUrl:'',directions:'Grand Pavilion Hall, Kakkanad — from Vyttila take the Seaport–Airport road; parking at the rear gate. Nearest metro: Kalamassery (12 min by auto).',dress:'Wedding: traditional. Reception: smart.',notes:'Haldi and Mehendi are at the family home, invitees only. Reception dinner from 7.30 pm.'};
});

/* ---------- Feature map / changelog ---------- */
FEATURE_MAP.push(['16 · v5.8 — audit fixes (1 Nov)',[
 ['Default-deny action policy','real (browser)','Every action is classified public / open / capability / owner; anything else refuses and is audited. Change, input and file dispatchers and dialog confirm buttons go through the same gate','All'],
 ['Session required for writes','real (browser)','Signed-out, only the token pages\' own actions and sign-in run','Public links'],
 ['Route fallbacks audited','real (browser)','A role sent to Today from a page it does not have leaves an audit row','All'],
 ['Closed-period coverage stated','real (browser)','Settings card lists the record types the guard covers','Settings'],
 ['Accountant and guest page in the sample','real (browser)','Thomas (accountant) can be switched to; the wedding has a published guest-information page','Sample'],
 ['Malayalam marked beta','real (browser)','Toggle says beta until the staff-facing string table is complete','All']
]]);
CHANGELOG.unshift(['v5.8 (this build)','Audit fixes only. The v5.7 policy was a blocklist with everything else allowed; it is now an allow-list: every action named, unknown ones refused. The same check covers checkbox/select/file handlers and dialog confirms. Writes need a session. Route fallbacks audited; closed-period coverage shown; accountant user and guest page seeded; Malayalam labelled beta. Still client-side; the table is the server\'s to enforce.']);
ASSUMPTIONS.push('Open actions (any signed-in role) are the ones that only open a form or act on the person\'s own records; the form\'s submit re-checks inside the action. The server should treat the open list as the allow-list for staff.');
const _vBuild57=vBuild;vBuild=function(){return _vBuild57().replace('v5.7 is v5.6 with the 31 Oct audit fixes: page and action permissions enforced, vendor money gated, over-receipts split, order states, confirmations.','v5.8 is v5.7 with the 1 Nov audit fixes: default-deny action policy on every input path, session required for writes.').replace('across 15 sections','across 16 sections')};

