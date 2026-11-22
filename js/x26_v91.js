/* ===== x26_v91.js ===== */
/* ============================================================================
   v9.1 — financial trust first, then less to look at.
   1. One forecast: cost counted once; cost-plus shown against its own forecast billable.
   2. Payment plan always equals what is agreed with the client; approved changes bill themselves.
   3. Self-checks on every live event, surfaced with a one-tap fix.
   4. Attention grouped, ordered by cost of delay, top three on Home.
   5. Owner menu: nine destinations; the rest behind Company, Setup and Search.
   ============================================================================ */
MIGRATIONS.push({from:90,to:91,note:'v9 → v9.1: a change marked billed with no instalment or credit note behind it is un-marked, so the payment-plan check shows it. Nothing is created silently.',up(o){ensureCollections(o);(o.changes||[]).forEach(ch=>{if(ch.billed&&!ch.voided){const has=(o.milestones||[]).some(m=>m.changeId===ch.id&&!m.voided)||(o.creditNotes||[]).some(c=>c.changeId===ch.id&&!c.voided);if(!has)ch.billed=false}});return o}});

MIGRATIONS.push({from:91,to:92,note:'v9.1 → v9.2: the company gets a timezone (India time unless set); every date and time is read through it. No money records change.',up(o){ensureCollections(o);o.company=o.company||{};if(!o.company.tz)o.company.tz='Asia/Kolkata';return o}});

/* ---------- sample: link the TechNova agreements to their lines; put the wedding change on the plan ---------- */
SEED_EXT.push((S0,h)=>{const link=(cid)=>{const cm=S0.commitments.find(c=>c.id===cid);if(!cm||(cm.allocation&&cm.allocation.length))return;const v=S0.vendors.find(x=>x.id===cm.vendorId);const l=S0.scopeLines.find(x=>x.eventId===cm.eventId&&v&&x.category===v.category);if(l)cm.allocation=[{scopeLineId:l.id,amountPaise:cm.agreedPaise}]};['c10','c11','c12'].forEach(link);
  const ch1=S0.changes.find(c=>c.id==='ch1');const e1=S0.events.find(e=>e.id==='e1');if(ch1&&e1&&!S0.milestones.some(m=>m.changeId==='ch1'))S0.milestones.push(h.stamp({id:'m_ch1',eventId:'e1',desc:'Change: '+ch1.desc,amountPaise:Math.round(ch1.clientPaise*1.18),dueDate:addDays(e1.endDate||e1.startDate,7),changeId:'ch1'},'u1',h.t('2026-10-02T10:00')));
  const e2=S0.events.find(e=>e.id==='e2');if(e2&&!S0.milestones.some(m=>m.eventId==='e2'&&m.trueUp))S0.milestones.push(h.stamp({id:'m_e2_tu',eventId:'e2',desc:'True-up to actual cost + fee',amountPaise:0,dueDate:addDays(e2.endDate||e2.startDate,30),trueUp:true},'u1',h.t('2026-09-18T10:00')))});
/* sample quote versions: the totals stored with each sent version are worked out from that version's own lines,
   not typed beside them (the typed ones disagreed with their lines on two versions) */
SEED_EXT.push((S0,h)=>{S0.events.forEach(e=>{const q=e.quote;if(!q||!Array.isArray(q.snapshots))return;q.snapshots.forEach(sn=>{if(!sn||!Array.isArray(sn.lines)||!sn.lines.length)return;const cp=(sn.pricing||e.pricing)==='costplus';const cost=sn.lines.reduce((t,l)=>t+l.qty*l.unitCostPaise,0);const feePct=sn.feePct!=null?sn.feePct:(e.feePct||0);const net=cp?cost+(e.feeType==='flat'?(e.feeFlatPaise||0):Math.round(cost*feePct/100)):sn.lines.reduce((t,l)=>t+l.qty*l.unitPricePaise,0)-(sn.discountPaise||0);const tx=sn.tax||e.tax||{};const gst=tx.on&&tx.mode!=='inclusive'?Math.round(net*(tx.pct||0)/100):0;sn.totals={cost,net,gst,gross:net+gst,margin:net-cost};const v=(q.versions||[]).find(x=>x.n===sn.n);if(v){v.price=net;v.cost=cost}})})});
/* the true-up amount is whatever makes the plan equal the forecast billable; set once on a fresh sample */
BOOT_EXT.push(()=>{try{if(!S.sample)return;const m=(S.milestones||[]).find(x=>x.id==='m_e2_tu');if(m&&m.amountPaise===0&&!m.voided){const e=ev('e2');if(e){const c=calc(e);if(c.planGap>0){m.amountPaise=c.planGap}}}}catch(err){console.error(err)}});

/* ---------- 1. cost counted once ---------- */
/* An agreement not linked to a scope line used to be added on top while the line it plainly covers kept its
   whole baseline as "still to book". Now it is set against the open, untouched lines of the same category first;
   only what those lines cannot absorb is added on top. The link is still asked for. */
const _scopeSummaryV91=scopeSummary;scopeSummary=function(e){const r=_scopeSummaryV91(e);r.unallocGross=r.unallocCost;r.soft=[];r.softAbsorbed=0;
  const pool={};const poolLines={};r.lines.forEach(x=>{const l=x.l;if(l.status==='complete'||l.status==='released'||l.etcPaise!=null||x.etc<=0)return;pool[l.category]=(pool[l.category]||0)+x.etc;(poolLines[l.category]=poolLines[l.category]||[]).push(l.id)});
  const take=(cm,cat,amt,kind)=>{if(amt<=0)return;const a=Math.min(amt,pool[cat]||0);r.soft.push({cm,cat,amt,absorbed:a,kind,lineIds:(poolLines[cat]||[]).slice()});if(a>0){pool[cat]-=a;r.softAbsorbed+=a}};
  (r.unalloc||[]).forEach(cm=>take(cm,vendor(cm.vendorId).category,cm.agreedPaise+linkedChangeCost(cm.id),'unlinked'));
  (r.mismatches||[]).forEach(x=>{if(x.diff>0){const a0=(x.cm.allocation||[])[0];const l=a0&&(S.scopeLines||[]).find(s=>s.id===a0.scopeLineId);take(x.cm,l?l.category:vendor(x.cm.vendorId).category,x.diff,'unplaced')}});
  r.forecastVendors-=r.softAbsorbed;r.unallocCost-=r.softAbsorbed;return r};

/* ---------- one forecast, one definition ---------- */
/* forecast profit = forecast contract − forecast cost, always.
   Fixed price: forecast contract = the contract. Cost-plus: forecast contract = forecast cost + fee on it. */
const planOf=e=>{const ms=live(S.milestones).filter(m=>m.eventId===e.id);const cn=live(S.creditNotes).filter(c=>c.eventId===e.id);return {ms,planned:sum(ms,m=>m.amountPaise)-sum(cn,c=>c.amountPaise)}};
const _calcV91=calc;calc=function(e){const c=_calcV91(e);const fixedNow=e.stage==='closed'||e.history||c.cancelled;
  c.forecastContract=fixedNow?c.contract:(c.costplus?c.forecastCost+feeOf(e,c.forecastCost):c.contract);
  if(!fixedNow)c.forecast=c.forecastContract-c.forecastCost;
  c.forecastGross=grossOf(e,c.forecastContract);c.agreedGross=c.costplus&&!fixedNow?c.forecastGross:c.grossContract;
  const p=planOf(e);c.planned=p.planned;c.planCount=p.ms.length;const gap=Math.round(c.agreedGross-c.planned);c.planGap=Math.abs(gap)<100?0:gap;
  if(c.costplus&&!fixedNow)c.toCome=Math.max(0,c.agreedGross-c.received);
  return c};

/* ---------- 2. approved changes bill themselves ---------- */
const autoBill=ch=>{try{if(ch&&chApproved(ch)&&!ch.billed){billChange(ch);return true}}catch(err){console.error(err)}return false};
const _signOffChangeV91=signOffChange;signOffChange=function(ch){const r=_signOffChangeV91(ch);if(autoBill(ch))toast(T('Approved. The payment plan was updated for it.'));return r};
const _clientDecideChangeV91=clientDecideChange;clientDecideChange=function(ch,status,by,note){const r=_clientDecideChangeV91(ch,status,by,note);if(autoBill(ch))toast(T('Client accepted. The payment plan was updated for it.'));return r};

/* ---------- 3. self-checks ---------- */
const planStage=e=>!['enquiry','quoted','lost'].includes(e.stage)&&!e.history;
/* ---- the bridge: quote, approved changes, contract, forecast billable, billable so far and cash are different
   figures. They are never forced equal; each is tied to the next by a visible step, and the steps are checked. ---- */
function moneyBridge(e){const c=calc(e);const q=quoteTotals(e);const hasQ=q.lines.length>0;const ap=live(S.changes).filter(ch=>ch.eventId===e.id&&chApproved(ch));const chg=sum(ap,ch=>ch.clientPaise);const base=e.contractPaise||0;const closed=e.stage==='closed'||!!e.history;const rows=[];const checks=[];
  const R=(label,sub,paise,o)=>rows.push(Object.assign({label,sub:sub||'',paise},o||{}));const signed=p=>(p<0?'−':'+')+inr(Math.abs(p));let one='';
  if(c.costplus&&!closed&&!c.cancelled){const dCost=c.forecastCost-q.cost;const dFee=feeOf(e,c.forecastCost)-feeOf(e,q.cost);const notYet=c.forecastContract-c.contract;
    R(T('Quote (estimate)'),`${T('quoted cost')} ${inr(q.cost)} + ${T('fee')} ${inr(q.net-q.cost)}`,q.net);
    R(T('Cost moved since the quote'),`${T('forecast cost')} ${inr(c.forecastCost)} − ${T('quoted cost')} ${inr(q.cost)}${ap.length?` · ${T('includes')} ${ap.length} ${T('approved change(s)')}`:''}`,dCost,{step:true});
    R(T('Your fee on that movement'),e.feeType==='flat'?T('flat fee'):`${e.feePct||0}% ${T('of cost')}`,dFee,{step:true});
    R(T('Forecast billable, before GST'),T('forecast cost + fee'),c.forecastContract,{total:true});
    checks.push({name:T('Quote to forecast billable'),a:q.net+dCost+dFee,b:c.forecastContract,aLabel:T('quote + cost movement + fee on it'),bLabel:T('forecast cost + fee')});
    R(T('Not yet booked'),T('cost still to book, and the fee on it'),-notYet,{step:true});
    R(T('Billable so far'),T('cost booked to date + fee on it'),c.contract,{total:true});
    checks.push({name:T('Billable so far'),a:c.costs+feeOf(e,c.costs),b:c.contract,aLabel:T('cost booked to date + fee'),bLabel:T('billable so far')});
    if(c.forecastGross!==c.forecastContract)R(T('GST on the forecast billable'),'',c.forecastGross-c.forecastContract,{step:true});
    R(T('Forecast billable incl. GST'),T('what the payment plan must add up to'),c.agreedGross,{total:true});
    one=`${T('Quote')} ${inr(q.net)} → ${T('cost moved')} ${signed(dCost)}, ${T('fee')} ${signed(dFee)} → ${T('forecast billable')} ${inr(c.forecastContract)} · ${T('billable so far')} ${inr(c.contract)}`}
  else if(c.cancelled){const before=base+chg;R(T('Contract before cancellation'),'',before);R(T('Cancellation'),T('the contract is replaced by the charge kept'),c.contract-before,{step:true});R(T('Charge kept, before GST'),'',c.contract,{total:true});if(c.grossContract!==c.contract)R(T('GST'),'',c.grossContract-c.contract,{step:true});R(T('Agreed with the client incl. GST'),'',c.agreedGross,{total:true});one=`${T('Contract')} ${inr(before)} → ${T('cancelled')} → ${T('charge kept')} ${inr(c.contract)}`}
  else if(!base){if(hasQ){R(T('Quote, before GST'),e.quote&&e.quote.acceptedAt?T('accepted'):e.quote&&e.quote.sentAt?T('sent, not yet accepted'):T('not sent'),q.net);if(q.gst)R(T('GST'),'',q.gst,{step:true});R(T('Quote incl. GST'),T('no contract yet'),q.gross,{total:true});one=`${T('Quote')} ${inr(q.net)} → ${T('no contract yet')}`}}
  else{let start=base;
    if(hasQ){R(T('Quote, before GST'),e.pricing==='costplus'?T('estimate'):T('accepted'),q.net);start=q.net;if(base!==q.net){R(T('Changed when the contract was confirmed'),`${T('contract confirmed at')} ${inr(base)}`,base-q.net,{step:true});start=base}}
    else R(T('Contract at confirmation'),T('no quote on file'),base);
    if(ap.length)R(`${ap.length} ${T('approved change(s)')}`,ap.map(ch=>ch.desc).slice(0,2).join('; ')+(ap.length>2?` +${ap.length-2}`:''),chg,{step:true});
    R(closed?T('Final contract, before GST'):T('Contract now, before GST'),'',c.contract,{total:true});
    if(!c.costplus)checks.push({name:T('Quote to contract'),a:start+chg,b:c.contract,aLabel:hasQ?T('quote, as confirmed, + approved changes'):T('contract at confirmation + approved changes'),bLabel:T('contract used for profit')});
    if(c.grossContract!==c.contract)R(T('GST'),'',c.grossContract-c.contract,{step:true});
    R(T('Agreed with the client incl. GST'),T('what the payment plan must add up to'),c.agreedGross,{total:true});
    one=`${T('Quote')} ${inr(hasQ?q.net:base)}${hasQ&&base!==q.net?` → ${T('confirmed at')} ${inr(base)}`:''} → ${ap.length?`${signed(chg)} (${ap.length} ${T('change(s)')})`:T('no changes')} → ${T('contract')} ${inr(c.contract)}`}
  const cash=[];if(planStage(e)){cash.push({label:T('Payment plan total'),sub:`${c.planCount} ${T('instalments')}`,paise:c.planned});cash.push({label:T('Received (cash)'),sub:'',paise:c.received||0});cash.push({label:T('Still to come'),sub:T('agreed − received'),paise:Math.max(0,c.agreedGross-(c.received||0)),total:true})}
  return {c,q,rows,cash,checks,one}}
function moneyChecks(e){const out=[];if(e.history)return out;const v=quoteView(e);
  if(v.rows.length&&v.diff!==0)out.push({code:'quote',k:'block',title:T('Quote lines do not add up to the quote total'),txt:`${T('compared')}: ${T('lines')} ${inr(v.lineSum)}${v.adj.length?` ${v.adjSum<0?'−':'+'} ${T('adjustments')} ${inr(Math.abs(v.adjSum))}`:''} = ${inr(v.lineSum+v.adjSum)}; ${T('quote total')} ${inr(v.total)} — ${T('differ by')} ${inr(Math.abs(v.diff))}`,tab:'quote'});
  ((e.quote&&e.quote.snapshots)||[]).forEach(sn=>{if(!sn||!sn.totals||!Array.isArray(sn.lines)||!sn.lines.length)return;const sv=snapView(e,sn).view;if(sv.diff!==0)out.push({code:'quote',k:'block',title:`${T('Quote as sent')} (q${sn.n}): ${T('lines do not add up to its total')}`,txt:`${T('compared')}: ${T('lines')} ${inr(sv.lineSum)}${sv.adj.length?` ${sv.adjSum<0?'−':'+'} ${T('adjustments')} ${inr(Math.abs(sv.adjSum))}`:''} = ${inr(sv.lineSum+sv.adjSum)}; ${T('total stored with that version')} ${inr(sv.total)} — ${T('differ by')} ${inr(Math.abs(sv.diff))}`,tab:'quote'})});
  if(!planStage(e))return out;const br=moneyBridge(e);const c=br.c;const sc=c.scope||(scopeOf(e.id).length?scopeSummary(e):null);
  br.checks.forEach(k=>{if(Math.round(k.a)!==Math.round(k.b))out.push({code:'bridge',k:'block',title:`${k.name}: ${T('the bridge does not add up')}`,txt:`${T('compared')}: ${k.aLabel} ${inr(k.a)}; ${k.bLabel} ${inr(k.b)} — ${T('differ by')} ${inr(Math.abs(k.a-k.b))}`,tab:'money'})});
  if(Math.abs(c.forecast-(c.forecastContract-c.forecastCost))>0&&e.stage!=='closed'&&!c.cancelled)out.push({code:'identity',k:'block',title:T('Forecast does not add up'),txt:`${T('compared')}: ${inr(c.forecastContract)} − ${inr(c.forecastCost)}; ${T('forecast profit')} ${inr(c.forecast)}`,tab:'scope'});
  if(c.planGap!==0&&(c.planCount>0||c.agreedGross>0)){const unb=live(S.changes).filter(ch=>ch.eventId===e.id&&chApproved(ch)&&!ch.billed);const short=c.planGap>0;const amtTxt=inr(Math.abs(c.planGap));
    let fix=null;if(unb.length)fix={act:'v91-bill-changes',label:T('Add to the plan')};else if(c.costplus)fix={act:'v91-trueup',label:T('Update the true-up')};else if(short)fix={act:'v91-balance',label:T('Add the instalment')};
    out.push({code:'plan',k:'late',title:short?T('Payment plan is short'):T('Payment plan is over'),txt:`${T('compared')}: ${T('instalments less credit notes')} ${inr(c.planned)}; ${c.costplus?T('forecast billable incl. GST'):T('contract incl. GST and approved changes')} ${inr(c.agreedGross)} — ${amtTxt} ${short?T('missing'):T('too much')}${unb.length?` · ${unb.length} ${T('approved change(s) not on the plan')}`:''}`,tab:'client',fix})}
  if(sc&&sc.soft&&sc.soft.length){const un=sc.soft.filter(s=>s.kind==='unlinked');const up=sc.soft.filter(s=>s.kind==='unplaced');
    if(un.length)out.push({code:'unlinked',k:'wait',title:`${un.length} ${T('vendor agreement(s) not linked to a scope line')}`,txt:un.map(s=>`${vendor(s.cm.vendorId).name} ${inr(s.amt)}${s.absorbed?` — ${T('assumed to cover the open')} ${s.cat} ${T('line')}`:` — ${T('no open line in')} ${s.cat}; ${T('added on top')}`}`).join('; '),tab:'scope',fix:{act:'v91-link',label:T('Link them')}});
    if(up.length)out.push({code:'unplaced',k:'wait',title:`${up.length} ${T('agreement(s) larger than their scope lines')}`,txt:up.map(s=>`${vendor(s.cm.vendorId).name}: ${inr(s.amt)} ${T('not placed on a line')}`).join('; '),tab:'scope',fix:{act:'alloc-fix',label:T('Place it'),id:up[0].cm.id}})}
  return out}
const _exceptionsV91=exceptions;exceptions=function(){const out=_exceptionsV91();S.events.filter(isLive).forEach(e=>{const owner=user(e.plannerId).name;moneyChecks(e).filter(k=>k.code!=='unplaced').forEach(k=>out.push({sev:k.k==='wait'?'warn':'bad',kind:'Money check',e,owner,txt:`${k.title}: ${k.txt}`,src:'Self-check',tab:k.tab}))});return out};
const moneyCheckBlock=e=>{const ks=moneyChecks(e);const v=quoteView(e);if(!planStage(e)&&!v.rows.length)return '';
  const okRow=()=>{const parts=[];if(v.rows.length)parts.push(`${T('quote lines')}${v.adj.length?' '+T('and adjustments'):''} = ${T('quote total')} ${inr(v.total)}`);if(planStage(e)){const br=moneyBridge(e);br.checks.forEach(k=>parts.push(`${k.name}: ${inr(k.b)}`));parts.push(`${T('payment plan')} = ${br.c.costplus&&e.stage!=='closed'?T('forecast billable incl. GST'):T('agreed incl. GST')} ${inr(br.c.agreedGross)}`);parts.push(T('forecast profit = contract − cost'))}return vRow({left:'',ttl:T('Figures reconcile'),sub:parts.join(' · '),wrap:true,end:st('ok',T('Checked'),true)})};
  if(!ks.length)return okRow();return ks.map(k=>k.fix&&can(k.fix.act==='v91-link'||k.fix.act==='alloc-fix'?'budget':'client')&&!locked(e)?vBan({k:k.k,title:esc(k.title),sub:esc(k.txt),act:k.fix.act,id:k.fix.id||e.id,go:esc(k.fix.label)}):vBan({k:k.k,title:esc(k.title),sub:esc(k.txt),act:'tab',id:'',v:k.tab,go:T('Open')})).join('')};
v7act('v91-bill-changes',()=>can('client'),({id})=>{const e=ev(id);if(!e||locked(e))return;const unb=live(S.changes).filter(ch=>ch.eventId===e.id&&chApproved(ch)&&!ch.billed);unb.forEach(ch=>billChange(ch));toast(`${unb.length} ${T('change(s) added to the payment plan')}`)});
v7act('v91-trueup',()=>can('client'),({id})=>{const e=ev(id);if(!e||locked(e))return;const c=calc(e);if(!c.planGap)return toast(T('Nothing to fix'));let m=live(S.milestones).find(x=>x.eventId===e.id&&x.trueUp&&msCalc(x).got===0);if(m){const before=m.amountPaise;m.amountPaise=Math.max(0,m.amountPaise+c.planGap);touch(m);audit('edit','milestones',m.id,`True-up ${inr(before)} → ${inr(m.amountPaise)}`,e.id)}else{if(c.planGap<0){S.ui.tab='client';saveUI();render();return toast(T('The plan is over the forecast billable; reduce an unpaid instalment'))}m=stamp({id:uid(),eventId:e.id,desc:'True-up to actual cost + fee',amountPaise:c.planGap,dueDate:addDays(e.endDate||e.startDate,30),trueUp:true});S.milestones.push(m);audit('create','milestones',m.id,m.desc,e.id)}save();render();toast(T('True-up instalment set; the plan matches the forecast billable'))});
v7act('v91-balance',()=>can('client'),({id})=>{const e=ev(id);if(!e||locked(e))return;const c=calc(e);if(c.planGap<=0)return toast(T('Nothing to add'));const m=stamp({id:uid(),eventId:e.id,desc:'Balancing instalment',amountPaise:c.planGap,dueDate:addDays(e.endDate||e.startDate,7)});S.milestones.push(m);audit('create','milestones',m.id,`${m.desc} ${inr(m.amountPaise)}`,e.id);save();render();toast(T('Instalment added; the plan matches what is agreed'))});
v7act('v91-link',()=>can('budget'),({id})=>{const e=ev(id);if(!e||locked(e))return;const sc=scopeSummary(e);let n=0,left=0;sc.soft.filter(s=>s.kind==='unlinked').forEach(s=>{const lines=s.lineIds.map(i=>S.scopeLines.find(l=>l.id===i)).filter(Boolean);if(!lines.length){left++;return}const total=s.cm.agreedPaise;const base=sum(lines,l=>l.baselineCostPaise)||lines.length;let used=0;s.cm.allocation=lines.map((l,i)=>{const a=i===lines.length-1?total-used:Math.round(total*((l.baselineCostPaise||1)/base));used+=a;return {scopeLineId:l.id,amountPaise:a}});touch(s.cm);audit('edit','commitments',s.cm.id,`Linked to ${lines.map(l=>l.category).join(', ')} by one tap`,e.id);n++});save();if(left){S.ui.tab='scope';saveUI()}render();toast(n?`${n} ${T('agreement(s) linked')}${left?` · ${left} ${T('need a line; see Scope')}`:''}`:T('No open line to link to; add a scope line'))});

/* ---------- the event's Money tab says how its figures add up ---------- */
const _moneyTabV91=TABFN_V8.money;TABFN_V8.money=function(e,c){const r=_moneyTabV91(e,c);if(!MONEY_ROLE()||!r.body)return r;const br=moneyBridge(e);c=br.c;const closed=e.stage==='closed'||c.cancelled;
  const line=x=>x.total?tot(x.label,x.paise):vRow({left:'',ttl:x.step?`<span class="muted">${x.paise<0?'−':'+'}</span> ${esc(x.label)}`:esc(x.label),sub:esc(x.sub||''),wrap:true,end:amt(x.step?Math.abs(x.paise):x.paise)});
  const profit=closed?vRow({left:'',ttl:T('Cost'),sub:'',end:amt(c.costs)})+tot(T('Final profit'),c.actual):vRow({left:'',ttl:T('Forecast cost'),sub:T('booked, plus what is still to book'),wrap:true,end:amt(c.forecastCost)})+tot(`${c.costplus?T('Forecast profit = your fee'):T('Forecast profit')} · ${pct(c.forecast,c.forecastContract)} ${c.costplus?T('of forecast billable'):T('of the contract')}`,c.forecast);
  const block=`${vSec(T('Checks'))}${moneyCheckBlock(e)}${vSec(T('From quote to contract'))}${br.rows.map(line).join('')}${br.cash.length?vSec(T('Plan and cash'))+br.cash.map(line).join(''):''}${vSec(T('Profit'))}${profit}`;
  let body=r.body;if(c.costplus&&!closed)body=body.replace(`<span>${T('Contract')}</span>`,`<span>${T('Billable so far')}</span>`);
  const oneLine=br.one?`<div class="v-note" data-v92-bridge>${esc(br.one)}</div>`:'';
  const i=body.indexOf('<div class="v-sec">');body=i>=0?body.slice(0,i)+oneLine+block+body.slice(i):body+oneLine+block;return Object.assign({},r,{body})};
/* the Quote tab carries the quote check too, so it is seen before there is a contract */
const _quoteTabV92=TABFN_V8.quote;TABFN_V8.quote=function(e,c){const r=_quoteTabV92(e,c);if(!r.body||!can('quote'))return r;const k=moneyChecks(e).find(x=>x.code==='quote');if(!k)return r;return Object.assign({},r,{body:r.body.replace('<div class="v-list">','<div class="v-list">'+vBan({k:k.k,title:esc(k.title),sub:esc(k.txt),act:'tab',id:'',v:'quote',go:T('Open')}))})};

/* ---------- 4. attention: grouped, ordered by cost of delay ---------- */
const realStuck=stuckItems;
const ATTN_FAM=[
 [/issue/i,'Open issue on site','open issues on site',260],
 [/Collection overdue|Client milestone overdue/i,'Client payment overdue','client payments overdue',160],
 [/Change unanswered/i,'Change unanswered','changes unanswered by vendors',140],
 [/Vendor not confirmed|Vendor has not confirmed/i,'Vendor not confirmed','vendors not confirmed',130],
 [/Scope.*nothing booked/i,'Scope not booked','scope lines with nothing booked',120],
 [/Vendor payment overdue|Bill exception|Retention/i,'Vendor payment to settle','vendor payments to settle',110],
 [/Money check/i,'Money check','money checks',105],
 [/Awaiting your approval|Attendance correction|Vendor quotes to decide/i,'Waiting for your decision','decisions waiting for you',100],
 [/Client decision overdue|Client has not answered|Quote awaiting answer/i,'Client has not answered','client answers awaited',90],
 [/Thin margin|Over budget|Funding need|re-pricing|Unpriced/i,'Margin and budget','margin and budget items',70],
 [/No work order|document expired|Handoff|Sample|Print|stock/i,'Vendor paperwork','vendor paperwork items',60],
 [/Task overdue/i,'Task overdue','tasks overdue',50],
 [/follow-up/i,'Follow-up due','follow-ups due',20]];
const attnFam=t=>ATTN_FAM.find(f=>f[0].test(t))||[null,t,t,40];
function attnGroups(){let items=realStuck();const hasMs=new Set(items.filter(s=>/Client milestone overdue/i.test(s.title)).map(s=>s.e.id));items=items.filter(s=>!(/Collection overdue/i.test(s.title)&&hasMs.has(s.e.id)));const sev={late:300,block:200,wait:100};const rank={late:0,block:1,wait:2};const g={};
  items.forEach(s=>{const f=attnFam(s.title);const d=s.e?daysUntil(s.e.startDate):99;const liveE=s.e&&isLive(s.e)&&daysUntil(s.e.endDate||s.e.startDate)>=0;const prox=!liveE?0:isEventDay(s.e)?300:d<=7?200:d<=30?100:0;const score=sev[s.k]+f[3]+prox;const key=(s.e?s.e.id:'-')+'|'+f[1];const x=g[key]=g[key]||{key,e:s.e,fam:f[1],plural:f[2],items:[],k:s.k,score:0};const sig=String(s.sub).slice(0,28);if(!x.items.some(i=>String(i.sub).slice(0,28)===sig))x.items.push(s);if(rank[s.k]<rank[x.k])x.k=s.k;if(score>x.score)x.score=score});
  return Object.values(g).sort((a,b)=>b.score-a.score||a.fam.localeCompare(b.fam)).map(x=>{const n=x.items.length;const f=x.items[0];x.rep=n===1?f:{k:x.k,title:`${n} ${T(x.plural)}`,sub:x.items.slice(0,2).map(i=>i.sub).join('; ')+(n>2?` · +${n-2}`:''),e:x.e,tab:f.tab,focus:''};x.n=n;return x})}
/* one definition: a "thing" is a group (one kind of problem on one event); an "item" is a single record inside it */
function attnCounts(){const gs=attnGroups();return {things:gs.length,items:sum(gs,x=>x.n),events:new Set(gs.map(x=>x.e.id)).size}}
function attnTop(n){const gs=attnGroups();const out=[];const per={};gs.forEach(x=>{const k=x.e.id;if(out.length<n&&(per[k]||0)<2){out.push(x);per[k]=(per[k]||0)+1}});return {top:out,all:gs}}
PAGES_EXT.stuck=function(){const all=attnGroups();const f=seg('stuck','all');const gs=f==='all'?all:all.filter(x=>x.k===f);const byE=[];const idx={};gs.forEach(x=>{if(idx[x.e.id]==null){idx[x.e.id]=byE.length;byE.push({e:x.e,gs:[]})}byE[idx[x.e.id]].gs.push(x)});const open=S.ui.attnOpen||{};const items=sum(all,x=>x.n);
  const body=byE.map(b=>{const cap=open[b.e.id]?b.gs.length:3;return vSec(esc(b.e.name)+' · '+b.gs.length,`<a href="#event" data-act="open-event" data-id="${b.e.id}">${T('Open event')}</a>`)+b.gs.slice(0,cap).map(x=>stuckBan(x.rep).replace('<span>'+esc(x.e.name)+' · ','<span>')).join('')+(b.gs.length>cap?vRow({act:'v91-attn-more',id:b.e.id,left:'',ttl:`<span class="muted">${b.gs.length-cap} ${T('more on this event')}</span>`}):'')}).join('');
  const ct=attnCounts();const shownItems=sum(gs,x=>x.n);return vFrame({key:'stuck',title:T('Needs attention'),sub:`${ct.things} ${T('things for you')} · ${T('across')} ${ct.events} ${T('events')} · ${T('grouped from')} ${ct.items} ${T('single items')}${f!=='all'?` · ${T('showing')} ${gs.length} ${T('things')} (${shownItems} ${T('items')})`:''} · ${T('most costly to leave first')}`,back:'#home',seg:vSeg('stuck',[['all','All'],['late','Late'],['block','Blocked'],['wait','Waiting']],f),body:`<div class="v-list">${body||vEmpty(T('Nothing needs you. Everything that is waiting is within its time.'))}</div>`})};
v7act('v91-attn-more',SESSION,({id})=>{S.ui.attnOpen=Object.assign({},S.ui.attnOpen,{[id]:true});saveUI();render()});
/* Home: the three things that cost most to leave, one per event where it can be */
const _vHomeV91=vHome;vHome=function(){const real=stuckItems;let h;stuckItems=()=>[];try{h=_vHomeV91()}finally{stuckItems=real}
  const {top,all}=attnTop(isDesk()?3:2);const empty=vSec(`${T('Status')} · ${T('nothing stuck')}`,`<a href="#changed">${T('What changed')}</a>`);
  const sec=all.length?vSec(`${T('Needs you first')} · ${top.length} ${T('of')} ${all.length} ${T('things')}`,`<a href="#stuck">${T('All')} ›</a>`)+top.map(x=>stuckBan(x.rep,true)).join(''):empty;
  if(h.includes(empty))h=h.replace(empty,sec);else if(all.length&&homeShape()==='own')h=h.replace('<div class="v-body"><div class="v-list">','<div class="v-body"><div class="v-list">'+sec);
  h=h.replace(`<a href="#stuck">0 ${T('stuck')}</a>`,`<a href="#stuck">${all.length} ${T('need attention')}</a>`);
  {const n=(S.notes||[]).filter(x=>x.userId===me().id&&!x.read).length;h=h.replace(`<a class="v-ib" href="#search" aria-label="Search">`,`<a class="v-ib" href="#inbox" aria-label="Inbox" title="Inbox" style="position:relative">${I('bell')}${n?`<span class="v91-dot"></span>`:''}</a><a class="v-ib" href="#search" aria-label="Search">`)}
  return h};

/* ---------- 5. navigation: nine places; the rest behind Company, Setup and Search ---------- */
const navFull=navSheetRows;const navFlat=()=>navFull().reduce((a,g)=>a.concat(g[1]),[]);
const hasHub=()=>{const u=me();return !shape().single&&(MONEY_ROLE()||u.role==='owner'||u.role==='manager')};
navSheetRows=function(){const g=navFull();if(shape().single)return g;const flat=navFlat();const has=k=>flat.some(r=>r[0]===k);const n=attnCounts().things;
  const work=[['home','Home'],['events','Events'],['mytasks','Tasks'],['calendar','Calendar'],['stuck','Needs attention',n||'',T('things needing attention, for you')],has('approvals')?['approvals','Sign-offs']:null].filter(Boolean);
  if(!hasHub()){const seen=new Set();return g.map(([l,rows])=>[l,rows.filter(r=>{if(r[0]==='search'||r[0]==='inbox'||seen.has(r[0]))return false;seen.add(r[0]);return true}).map(r=>r[0]==='stuck'?['stuck','Needs attention',n||'']:r)]).filter(x=>x[1].length)}
  const comp=[['overview','Company']];if(has('cockpit'))comp.push(['cockpit','Cockpit']);
  const out=[['Work',work],['Company',comp]];if(has('settings'))out.push(['Setup',[['settings','Setup']]]);else if(has('setup'))out.push(['Setup',[['setup','Setup']]]);return out};
/* the hub lists whatever the menu no longer does, so nothing is orphaned */
const _vOverviewV91=vOverview;vOverview=function(){let h=_vOverviewV91();if(!hasHub())return h;const short=new Set(navSheetRows().reduce((a,g)=>a.concat(g[1].map(r=>r[0])),[]));const rest=navFlat().filter(r=>!short.has(r[0])&&!h.includes(`href="#${r[0]}"`)&&r[0]!=='search'&&r[0]!=='fx');if(!rest.length)return h;
  const sec=vSec(T('Tools and admin'))+rest.map(r=>vRow({href:'#'+r[0],left:'',ttl:esc(T(r[1])),sub:'',end:(r[2]?`<span class="amt sm">${r[2]}</span>`:'')+chev})).join('');const j=h.indexOf('<div class="v-bar">');const at=h.lastIndexOf('</div></div>',j>=0?j:h.length);return at>=0?h.slice(0,at)+sec+h.slice(at):h+sec};

/* search finds screens as well as records */
const _vSearchV91=vSearch;vSearch=function(){let h=_vSearchV91();const q=(S.ui.gq||'').trim().toLowerCase();if(q.length<2)return h;const hits=navFlat().filter(r=>String(T(r[1])).toLowerCase().includes(q)||r[0].includes(q)).slice(0,6);if(!hits.length)return h;const block=`<div class="card" style="margin-bottom:12px" data-v91-screens><div class="eyebrow" style="margin-bottom:6px">${T('Screens')}</div><div class="list">${hits.map(r=>`<div class="item" style="padding:7px 0"><div class="row between"><b>${esc(T(r[1]))}</b><a class="btn sm" href="#${r[0]}">${T('Open')}</a></div></div>`).join('')}</div></div>`;const m=h.match(/<div class="small muted" style="margin-bottom:10px">[^<]*<\/div>/);return m?h.replace(m[0],m[0]+block):h+block};
PAGES_EXT.search=function(){return vSearch()};

/* ---------- copy ---------- */
FLOWS.splice(6,0,{k:'trust',t:'How the money figures are kept honest',s:'One forecast, one payment plan, checked on every event',who:'owner, accountant',steps:[['Forecast profit is always forecast contract − forecast cost','Event › Money › How it adds up'],['A cost is counted once: an agreement not linked to a line is set against the open line it covers, and you are asked to link it','Event › Money › Checks'],['Cost-plus: forecast billable = forecast cost + your fee; "billable so far" is shown apart','Event › Money'],['An approved change puts its instalment (or credit note) on the plan at once','Event › Changes'],['If the plan and the agreed amount ever differ, it shows as a Money check with one tap to fix','Needs attention','#stuck']]});
if(window.FEATURE_MAP)FEATURE_MAP.push(['24 · v9.1 — financial trust, less to look at',[
 ['One forecast','real (browser)','Forecast profit = forecast contract − forecast cost everywhere; cost-plus is measured against forecast billable (cost + fee), not against what is billable today','Event › Money, Scope, Cockpit, Exceptions'],
 ['Cost counted once','real (browser)','An agreement not linked to a scope line is set against the open line of its category before anything is added on top; one tap links it','Event › Money › Checks'],
 ['Changes bill themselves','real (browser)','When a change is both accepted by the client and signed off, its instalment or credit note is created at once','Event › Changes'],
 ['Self-checks','real (browser)','Plan = agreed; forecast identity; unlinked agreements. Shown on the Money tab and in Needs attention as "Money check"','Event › Money; Needs attention'],
 ['Attention','real (browser)','Repeats grouped per event with a count; ordered by cost of delay (severity, kind, how close the event is); three per event; top three on Home','Home; Needs attention'],
 ['Menu','real (browser)','Owner: Home, Events, Tasks, Calendar, Needs attention, Sign-offs, Company, Cockpit, Setup. Everything else from Company, Setup or Search','Menu; Company'],
 ['Sign-in, company isolation, client approvals','not built — needs a server','This file is one browser. Real sign-in, one company unable to see another, and approvals a client cannot forge all need a server','—']]]);

/* the cockpit's blockers are the same grouped list */
if(typeof PAGES_EXT.cockpit==='function'){const _cockpitV91=PAGES_EXT.cockpit;PAGES_EXT.cockpit=function(){const real=stuckItems;let h;stuckItems=()=>attnGroups().map(x=>x.rep);try{h=_cockpitV91()}finally{stuckItems=real}return h.replace(`>${T('All stuck')}<`,`>${T('All')} ›<`).replace(new RegExp(T('Blockers')+' · (\\d+)'),(m,n)=>`${T('Late or blocked')} · ${n} ${T('of')} ${attnCounts().things} ${T('things')}`)}}

