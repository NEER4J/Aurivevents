/* ===== x23_v7a_shell.js ===== */
/* ============================================================================
   v7 LAYER A — shell, frame, status vocabulary, nav, action registration.
   The product logic, roles, data model and features of v6.1 are untouched.
   What changes is every surface: one typeface, one accent, four statuses with
   words, one list per screen, details in sheets, primary action in a bottom bar.
   ============================================================================ */
MIGRATIONS.push({from:61,to:70,note:'v6.1 → v7: new interface; adds reminders queue and crew duty links. No data removed.',up(o){ensureCollections(o);o.reminders=o.reminders||[];o.company.reminderRules=o.company.reminderRules||null;return o}});
coll('reminders');

/* ---------- icons: strokes in the text colour, nothing coloured ---------- */
const VI={
  back:'<path d="M15 6l-6 6 6 6"/>',chev:'<path d="m9 6 6 6-6 6"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  more:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',plus:'<path d="M12 5v14M5 12h14"/>',filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',edit:'<path d="M4 20h4l10-10-4-4L4 16z"/>',
  check:'<path d="m5 12 5 5 9-10"/>',flag:'<path d="M5 21V4h11l-1 4 1 4H5"/>',link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  cal:'<rect x="4" y="5" width="16" height="15" rx="1"/><path d="M4 10h16M9 3v4M15 3v4"/>',copy:'<rect x="9" y="9" width="11" height="11" rx="1"/><path d="M5 15V5h10"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',home:'<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',money:'<rect x="3" y="6" width="18" height="12" rx="1"/><circle cx="12" cy="12" r="2.5"/>',
  wa:'<path d="M4 20l1.5-4A8 8 0 1 1 8 18.5z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1a4 4 0 0 1-2-2l1-1-1-2z"/>',clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1 2H5z"/><path d="M10 20a2 2 0 0 0 4 0"/>'
};
const I=(n,cls)=>`<svg class="vi ${cls||''}" viewBox="0 0 24 24" aria-hidden="true">${VI[n]||''}</svg>`;
const ini=s=>{s=String(s||'').replace(/[^\p{L}\p{N} ]/gu,' ').trim();const p=s.split(/\s+/).filter(Boolean);return ((p[0]||'?')[0]+(p[1]?p[1][0]:(p[0]||'')[1]||'')).toUpperCase()};
const tile=(s,sm)=>`<span class="v-tile ${sm?'sm':''}">${esc(ini(s))}</span>`;

/* ---------- the four statuses, always colour + word ---------- */
const ST_WORD={ok:'Done',wait:'Waiting',late:'Late',block:'Blocked'};
let st=(k,word,plain)=>k?`<span class="v-st ${k} ${plain?'plain':''}">${esc(word||T(ST_WORD[k]))}</span>`:'';
function taskSt(t){if(t.status==='done')return ['ok','Done'];if(taskOverdue(t))return ['late','Late'];if(t.due===todayStr())return ['wait','Today'];if(t.blocked)return ['block','Blocked'];return [null,'']}
function rsSt(r,e){if(r.done)return ['ok','Done'];if(isFnDay(e,r.functionName)&&r.time<nowHM())return ['late','Late'];return [null,'']}
function vendorSt(cm){if(cm.status==='quote')return ['wait','Quote'];if(cm.status!=='agreed')return ['none',cm.status];const o=curOrder(cm.id);if(!o)return ['block','No order'];const m={accepted:['ok','Confirmed'],fulfilled:['ok','Fulfilled'],sent:['wait',o.sentMark?'Marked as sent':'Link created'],queried:['wait','Queried'],revised:['wait','Revised'],draft:['block','Draft'],declined:['late','Declined'],disputed:['late','Disputed'],cancelled:['none','Cancelled']};return m[o.status]||['none',o.status]}
function loopSt(l){const sm=loopSummary(l);if(l.status==='withdrawn')return ['none','Withdrawn'];if(l.status==='done')return ['ok','Done'];if(l.status==='authorised')return sm.dutyOpen?['block','Duties'] :['ok','Authorised'];if(sm.late.length)return ['late',sm.late.length+' late'];if(sm.open.length)return ['wait',sm.open.length+' waiting'];if(sm.accepted.length&&!l.changeId)return ['block','Needs client'];if(sm.ch)return ['wait','With client'];return ['ok','Answered']}
function eventSt(e){if(!isLive(e))return [null,T(STAGE[e.stage]||e.stage)];const ex=exceptions().filter(x=>x.e.id===e.id);const od=live(S.tasks).filter(t=>t.eventId===e.id&&taskOverdue(t)).length;const lateEx=ex.filter(x=>/unanswered|overdue|late|Late/i.test(x.kind));if(od||lateEx.length)return ['late','Late'];const blk=ex.filter(x=>x.sev==='bad');if(blk.length||openIssues(e.id).length)return ['block','Blocked'];const open=loopsOf(e.id).filter(l=>l.status==='open').length+live(S.tasks).filter(t=>t.eventId===e.id&&t.status!=='done').length;if(open)return ['wait','Waiting'];return ['ok','On track']}
const MONEY_ROLE=()=>can('profit');

/* ---------- frame ---------- */
function vTop(o){const left=o.back?`<a class="v-ib" href="${o.back}" aria-label="Back">${I('back')}</a>`:o.left||`<button class="v-ib" data-act="v7-nav" aria-label="Menu">${I('menu')}</button>`;return `<div class="v-top">${left}<div class="ttl">${esc(o.title||'')}${o.sub?`<small>${o.sub}</small>`:''}</div>${o.right||''}</div>`}
function vFrame(o){return `<div class="v-page" data-page="${o.key||''}">${vTop(o)}${o.tabs||''}${o.seg||''}<div class="v-body">${o.body||''}</div></div>${o.bar?`<div class="v-bar">${o.bar}</div>`:''}`}
const vSec=(label,right)=>`<div class="v-sec"><span class="eyebrow">${label}</span>${right||''}</div>`;
const vEmpty=(txt,btn)=>`<div class="v-empty"><p>${txt}</p>${btn||''}</div>`;
const chev=I('chev','chev');
/* row: {left,ttl,sub,end,act,id,v,href,cls,wrap,focus} → one list row, the whole row is the tap target */
function vRow(r){const tag=r.href?'a':'div';const attrs=r.href?`href="${r.href}"`:`${r.act?` role="button" tabindex="0" data-act="${r.act}"`:''}${r.id?` data-id="${r.id}"`:''}${r.v?` data-v="${esc(r.v)}"`:''}`;const left=r.left===undefined?'':r.left;return `<${tag} class="v-row ${r.cls||''} ${left===''?'noleft':''}" ${attrs}${r.focus?` data-focus="${r.focus}"`:''}>${left===''?'':left}<span class="main"><span class="ttl ${r.wrap?'wrap':''}">${r.ttl}</span>${r.sub?`<span class="sub">${r.sub}</span>`:''}</span><span class="end">${r.end==null?chev:r.end}</span></${tag}>`}
function vBan(b){const tag=b.href?'a':'div';return `<${tag} class="v-ban ${b.k||'wait'}" ${b.href?`href="${b.href}"`:`role="button" tabindex="0" data-act="${b.act}" data-id="${b.id||''}" data-v="${esc(b.v||'')}"`}><span class="t"><b>${b.title}</b>${b.sub?`<span>${b.sub}</span>`:''}</span><span class="go">${b.go||'Open'} ›</span></${tag}>`}
function vSeg(key,opts,cur){return `<div class="v-seg" role="group">${opts.map(([v,l])=>`<button type="button" data-act="v7-seg" data-id="${key}" data-v="${esc(v)}" aria-pressed="${cur===v}">${esc(l)}</button>`).join('')}</div>`}
const seg=(key,def)=>((S.ui.v7seg||{})[key])||def;
const ibtn=(act,icon,label,id,v)=>`<button type="button" class="v-ib" data-act="${act}"${id?` data-id="${id}"`:''}${v?` data-v="${esc(v)}"`:''} aria-label="${esc(label)}" title="${esc(label)}">${I(icon)}</button>`;
const tickBtn=(act,id,on,label)=>`<button type="button" class="v-tick" data-act="${act}" data-id="${id}" role="checkbox" aria-checked="${!!on}" aria-label="${esc(label||(on?'Done':'Mark done'))}"><span>${on?I('check'):''}</span></button>`;
function openEvent(id,tab){S.ui.eventId=id;S.ui.tab=tab||'runsheet';saveUI();if(location.hash==='#event')render();else location.hash='event'}

/* ---------- navigation: a short primary set; everything else in the menu sheet ---------- */
const V7_HOME_KEYS=['home','events','mytasks','calendar'];
const V7_COMPANY_KEYS=['overview','cockpit','paydue','owed','cash','cashbook','bank','books','pricebook','proposals','segments','sales','capacity','exceptions','reports','reminders','clients','leads','vendors','inventory','crew','fx','benchmark','analytics','assistant','sourcing','receipts','approvals','reimb','inbox','jobcard','clientview','files','search','auditlog','daypack'];
const V7_SETUP_KEYS=['settings','build','developer','operator','automations','health','modules','integrations','trust','people'];
const _navItemsV7=navItems;navItems=function(){const all=_navItemsV7();const keys=new Set(all.map(x=>x[0]));const u=me();const out=[];const push=(k,l,c)=>{if(!out.some(x=>x[0]===k))out.push([k,l,c||''])};
  push('home','Home');push('events','Events');push('mytasks','Tasks',myTasks().filter(taskOverdue).length||'');push('calendar','Calendar');
  if(MONEY_ROLE()||u.role==='owner'||u.role==='manager')push('overview','Company');
  if(u.role==='owner'||soloMode())push('cockpit','Cockpit');
  push('stuck','Stuck',stuckItems().length||'');push('vendor','Vendor');push('paydue','Payments due');push('owed','Clients still owe');push('reminders','Reminders');push('duty','Duty list');
  all.forEach(x=>push(x[0],x[1],x[2]));return out};
const V7_LABEL=k=>{const n=navItems().find(x=>x[0]===k);return n?n[1]:k};
function navSheetRows(){const all=_navItemsV7();const u=me();const vis=k=>all.some(x=>x[0]===k);const g=[];
  g.push(['Work',[['home','Home'],['events','Events'],['mytasks','Tasks'],['calendar','Calendar'],['stuck','Stuck'],vis('inbox')?['inbox','Inbox']:null,vis('approvals')?['approvals','Sign-offs']:null,vis('reimb')?['reimb','Reimbursements']:null].filter(Boolean)]);
  const comp=[];if(MONEY_ROLE()||u.role==='owner'||u.role==='manager')comp.push(['overview','Company']);if(u.role==='owner'||soloMode())comp.push(['cockpit','Cockpit']);all.forEach(x=>{if(['vendors','crew','clients','jobcard','clientview','books'].includes(x[0]))comp.push([x[0],x[1]])});if(comp.length)g.push(['Company',comp]);
  const rest=all.filter(x=>!['home','events','mytasks','calendar','inbox','approvals','reimb','vendors','crew','clients','jobcard','clientview','books','overview','settings','build'].includes(x[0]));if(rest.length)g.push(['More',rest.map(x=>[x[0],x[1],x[2]])]);
  if(u.role==='owner')g.push(['Setup',[['settings','Setup'],['build','For the tech team']]]);return g}
function parentOf(k){if(V7_HOME_KEYS.includes(k)||k==='stuck')return null;if(V7_SETUP_KEYS.includes(k))return '#settings';if(V7_COMPANY_KEYS.includes(k)&&k!=='overview')return '#overview';return '#home'}

/* ---------- render: v7 pages draw their own frame; every other page is wrapped and restyled ---------- */
const _renderV7=render;render=function(){const r=_renderV7();try{v7Wrap()}catch(err){console.error('v7 wrap',err)}return r};
function v7Wrap(){const app=document.getElementById('app');if(!app)return;if(app.querySelector(':scope > .v-page'))return v7After();const login=app.querySelector(':scope > .login');if(login){v7LoginFix(login);return}
  const k=route();const wrap=document.createElement('div');wrap.className='v-legacy';while(app.firstChild)wrap.appendChild(app.firstChild);const h1=wrap.querySelector('h1');const title=k==='event'?(ev(S.ui.eventId)||{}).name||'Event':(h1?h1.textContent.trim():V7_LABEL(k));const page=document.createElement('div');page.className='v-page';page.dataset.page=k;page.innerHTML=vTop({title,back:parentOf(k)||undefined,right:parentOf(k)?'':''});page.appendChild(Object.assign(document.createElement('div'),{className:'v-body'})).appendChild(wrap);app.appendChild(page);v7After()}
function v7LoginFix(login){/* sign-in and link pages keep their own markup; only the type and the buttons change */}
function v7After(){const f=document.querySelector('[data-focus]');if(f){f.classList.add('focus');setTimeout(()=>{try{f.scrollIntoView({block:'center'})}catch(e){}},30)}const fo=S.ui.v7focus||'';if(fo&&!document.querySelector('.modal')){const [kind,id]=fo.split(':');const open={loop:'v7-loop-sheet',issue:'resolve-issue',rs:'v7-rs-sheet'}[kind];if(open&&ACTS[open]){S.ui.v7focus='';saveUI();setTimeout(()=>ACTS[open]({id,E:()=>ev(S.ui.eventId)}),0);return}}if(fo){S.ui.v7focus='';saveUI()}}

/* ---------- action registration with policy, the v5.8 way ---------- */
const V7_ACTS=[];
function v7act(name,policy,fn,kind){ACT_POLICY[name]=policy;V7_ACTS.push([name,kind||'click']);
  if(kind==='change'||kind==='input'){(kind==='change'?ACTS_CHANGE:ACTS_INPUT)[name]=function(el){if(!actAllowed(name,{el,id:el&&el.dataset&&el.dataset.id}))return denyAct(name);return fn.apply(this,arguments)};return}
  ACTS[name]=function(ctx){if(!actAllowed(name,ctx))return denyAct(name);const prev=CURRENT_ACT,prevC=CURRENT_CTX;CURRENT_ACT=name;CURRENT_CTX=ctx||CURRENT_CTX;try{return fn.apply(this,arguments)}finally{CURRENT_ACT=prev;CURRENT_CTX=prevC}}}
const SESSION=()=>!!currentSession();
v7act('v7-nav',SESSION,()=>{const g=navSheetRows();openModal(`${hd(esc(S.company.name))}<div class="v-list" style="margin:0 calc(-1 * var(--s4))">${g.map(([label,rows])=>vSec(esc(label))+rows.map(([k,l,c])=>vRow({href:'#'+k,left:'',ttl:esc(T(l)),end:c?`<span class="v-st late plain">${c}</span>`:chev})).join('')).join('')}${vSec('You')}${vRow({act:'switch-user',left:tile(me().name),ttl:esc(me().name),sub:esc(ROLES[me().role].label)+' · '+T('switch user')})}${vRow({act:'lang',left:'',ttl:S.company.lang==='ml'?'English':'മലയാളം (beta)'})}${vRow({act:'signout',left:'',ttl:T('Sign out')})}</div>`);document.querySelector('.modal').addEventListener('click',e=>{if(e.target.closest('a.v-row'))closeModal()})});
v7act('v7-seg',SESSION,({id,v})=>{S.ui.v7seg=S.ui.v7seg||{};S.ui.v7seg[id]=v;saveUI();render()});
v7act('v7-open-event',SESSION,({id,v})=>openEvent(id,v||undefined));
v7act('v7-call',SESSION,({id,v})=>{const [name,phone,wa]=(v||'').split('|');openModal(`${hd('Call '+esc(name||''))}<div class="v-copy" id="v7phone">${esc(phone||'no number')}</div><div class="v-note">Phone and WhatsApp links open the apps on most phones; if nothing happens, copy the number.</div><div class="ft">${phone?`<a class="btn" href="tel:${esc(phone.replace(/\s+/g,''))}">${I('phone','sm')} Call</a><a class="btn" href="https://wa.me/${esc(phone.replace(/[^\d]/g,''))}" target="_blank" rel="noopener">${I('wa','sm')} WhatsApp</a>`:''}<button class="btn pri" data-act="v7-copy" data-v="${esc(phone||'')}">${I('copy','sm')} Copy</button></div>`)});

/* keyboard: Enter or Space on a row acts like a tap */
document.addEventListener('keydown',evt=>{if(evt.key!=='Enter'&&evt.key!==' ')return;const el=evt.target.closest('.v-row[role=button],.v-ban[role=button]');if(!el||evt.target!==el)return;evt.preventDefault();el.click()});

/* the now-line goes before the first line whose time is at or after now, done or not; after the last line when all are earlier */
const nowLine=(rows,now)=>{const i=rows.findIndex(r=>String(r.time||'')>=now);return i<0?rows.length:i};
const nowMark=now=>`<div class="v-now">${T('now')} ${now}</div>`;

