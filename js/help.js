/* ===== help.js — Help & tutorials page =====
   Role-aware: owners get the full walkthrough and how profit is worked out;
   staff get their own steps and never see profit explanations. */
(function () {
  const isOwner = () => can('profit');
  const ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const I = {
    event: ic('<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>'),
    client: ic('<path d="M12 2v20M17 6.5c0-1.9-2.2-3.5-5-3.5S7 4.6 7 6.5 9.2 10 12 10s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5"/>'),
    vendor: ic('<path d="M3 9.5 4.5 4h15L21 9.5"/><path d="M3 9.5c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3"/><path d="M5 12.5V20h14v-7.5"/>'),
    pay: ic('<rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="M2.5 10.5h19M6.5 15h3"/>'),
    expense: ic('<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h3"/>'),
    change: ic('<path d="M12 5v14M5 12h14"/>'),
    staff: ic('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5a6.5 6.5 0 0 1 3 5.5"/>'),
    export: ic('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>')
  };

  function steps() {
    const own = [
      ['event', 'Add the event', 'Name, client, date, venue, guests and the contract value — what the client is paying in total. For a wedding, tick the functions.', 'new-event'],
      ['client', 'Add how the client pays', 'In the event’s Client tab, add milestones: e.g. ₹10 lakh on signing, ₹10 lakh a month before, ₹10 lakh after. Record each payment as it arrives.', 'client'],
      ['vendor', 'Add every vendor with the agreed price', 'In the Vendors tab, add the decorator, caterer, photographer… with the amount you agreed and, if you like, what you estimated when quoting. Your profit updates straight away.', 'vendors'],
      ['pay', 'Record payments to vendors', 'Tap Record payment on a vendor. If the same amount was paid to them in the last 72 hours, the app stops you and shows the earlier payment.', 'vendors'],
      ['expense', 'Add small spending as it happens', 'Flowers, fuel, food for the crew: Expenses tab → + Add expense. Photo, amount, category, company or own money. Works with no signal.', 'expenses'],
      ['change', 'Record anything the client adds later', 'Changes tab: “Added 50 guests, +₹60,000”. Tick “Client has approved” and it’s added to the contract value.', 'changes'],
      ['staff', 'Pay your team back', 'Reimbursements shows what each person spent from their own pocket. Transfer it, then tap Mark all as paid.', 'reimb'],
      ['export', 'Send it to your accountant', 'Settings → Export: one Excel file per event, plus a zip of the bill photos.', 'settings']
    ];
    const staff = [
      ['expense', 'Add an expense in 20 seconds', 'Open the event → Expenses → + Add expense. Take a photo of the bill (or skip), type the amount, tap a category, choose company or own money, save. Works with no signal.', 'expenses'],
      ['pay', 'Record a payment to a vendor', 'Open the event → Vendors → Record payment. If it looks like the same payment was already made, the app stops you — check before you pay again.', 'vendors'],
      ['vendor', 'Add a vendor', 'Vendors tab → + Add vendor, with the price that was agreed.', 'vendors'],
      ['staff', 'See what you’re owed', 'Reimbursements shows everything you paid from your own pocket, until the owner marks it paid.', 'reimb']
    ];
    return isOwner() ? own : staff;
  }

  const FAQ = () => [
    ['Why is my profit lower than the money I have?', 'Profit is worked out from what you have <b>promised</b> vendors (committed), not what you have paid so far. If you agreed ₹8,50,000 with the decorator and paid ₹3,00,000, the cost is ₹8,50,000. This stops the “we made more than we thought” surprise after the wedding.', true],
    ['What is the difference between expected and actual profit?', 'Expected profit uses the estimates you typed when you added each vendor. Actual profit uses the prices you agreed. The gap shows where your guesses were off — use it on the next quote.', true],
    ['The app said “this looks like a duplicate”', 'Someone recorded the same amount to the same vendor on this event in the last 72 hours. Usually it’s the same payment entered twice. If it really is a second payment, tap “Yes — tell me why” and write a reason (at least 10 characters). The reason is saved with the payment.'],
    ['It warned me I’m paying more than agreed', 'The total paid to that vendor would go above the agreed amount. Sometimes the price really went up — you can still save it. If so, also edit the vendor’s agreed amount so profit stays correct.'],
    ['I entered something wrong. How do I delete it?', 'Nothing is ever deleted. Tap <b>Void</b> and say why. The record stays visible, crossed out, and is left out of every total — so nothing disappears without a trace.'],
    ['Who added this payment?', 'Every record shows who added it and when, in small text underneath: “Added by Rahul · 14 Jan, 2:15 pm”.'],
    ['I have no signal at the venue', 'Keep going. Expenses and other changes are saved on your phone and marked “Waiting to sync”. They upload by themselves when you’re back online.'],
    ['Can my staff see our profit?', 'No. Staff can add events, vendors, payments and expenses, but never see profit or margin anywhere in the app.', true],
    ['How do I add someone to my team?', 'Settings → Team → + Add team member. Choose Owner (sees everything) or Staff (no profit).', true],
    ['Where are quotes, tasks, crew and run sheets?', 'Tap <b>More</b> at the bottom right — every other tool is there, grouped (Work, Clients & sales, People & vendors, Money, Reports, Setup). For one event, open it and tap <b>⋯</b> next to the tabs for Quote, Budget, Tasks, Crew, Run sheet, Documents and more.'],
    ['Where are GST, TDS and foreign currency?', 'In the forms, under <b>More options</b>. Company-wide rules are in Settings → All settings.', true],
    ['How do I switch to Malayalam?', 'Open the menu (tap your initial, top right) and tap മലയാളം at the bottom.'],
    ['I forgot my password', 'On the sign-in screen tap “Forgot password?”. We email you a link to choose a new one.']
  ].filter(f => !f[2] || isOwner());

  const WORDS = () => [
    ['Event', 'One job for one client. A wedding, a birthday, a company’s annual day.'],
    ['Function', 'A part of an event: engagement, haldi, mehendi, the wedding itself, reception.'],
    ['Client', 'The person, family or company paying you.'],
    ['Vendor', 'Anyone you pay to do part of the work: decorator, caterer, photographer, DJ, priest, driver.'],
    ['Committed', 'The amount you have promised to pay a vendor, whether or not you’ve paid it yet.'],
    ['Paid', 'Money that has actually gone out.'],
    ['Outstanding', 'Committed minus paid: what you still owe.'],
    ['Advance', 'An early payment to a vendor to lock them in, usually 30–50%.'],
    ['Contract value', 'The total the client has agreed to pay, plus approved changes.'],
    ['Milestone', 'One instalment of the client’s payment: “₹10 lakh on signing”.'],
    ['Received', 'Money the client has actually paid so far.'],
    ['Expense', 'Small spending that isn’t a vendor contract: flowers, fuel, food for the crew, printing.'],
    ['Reimbursement', 'Paying back a team member who spent their own money.'],
    ['Profit / margin', 'Contract value minus everything going out, in ₹ and as a %.', true],
    ['Change', 'Something the client adds or removes after the deal: “add 50 guests”.']
  ].filter(w => !w[2] || isOwner());

  const faqRows = q => FAQ().filter(f => !q || (f[0] + ' ' + f[1]).toLowerCase().includes(q)).map(f => `<details class="hp-q" ${q ? 'open' : ''}><summary>${f[0]}</summary><div class="hp-a">${f[1]}</div></details>`).join('') || '<div class="v-note">Nothing matches. Try another word.</div>';

  /* one page in the app's own pattern: header, then titled cards */
  function vHelp() {
    const own = isOwner();
    const q = (S.ui.helpq || '').toLowerCase();
    const ic = k => `<span class="hp-ic">${I[k] || ''}</span>`;
    const stepsRows = steps().map(([i, t, d, go], n) => vRow({ act: 'help-go', v: go, left: ic(i), ttl: `${n + 1}. ${t}`, sub: d, wrap: true, end: `<span class="hp-go">Show me</span>` })).join('');
    const kv = rows => `<dl class="v-kv hp-kv">${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>`;
    const standalone = document.documentElement.classList.contains('standalone');
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const install = standalone ? vRow({ ttl: 'You’re using the installed app', end: '' })
      : (window.__installPrompt || ios) ? vRow({ act: 'acc-install', left: ic('export'), ttl: window.__installPrompt ? 'Install the app' : 'Add to Home Screen', sub: 'Opens full screen, starts faster and works with no signal.' })
      : `<div class="v-note">On Android, open this page in Chrome and choose <b>Install app</b> from the ⋮ menu. On iPhone, open it in Safari, tap Share, then <b>Add to Home Screen</b>.</div>`;
    const body = `<div class="v-list">
      <div class="v-note hp-lead">${own ? 'Aurivevents is a notebook that adds up by itself. Write down what the client is paying and what you’ve promised everyone else, and it always shows how much you’ll make.' : 'Record payments and expenses as they happen. The owner sees everything add up straight away.'}</div>
      ${vSec(own ? 'Getting started' : 'Your everyday jobs')}${stepsRows}
      ${own ? `${vSec('The one rule that matters')}<div class="v-pad"><p style="margin:0">Profit is always worked out from what you’ve <b>promised</b> vendors — never from what you’ve paid so far.</p></div>
        ${kv([['Family pays you', '₹30,00,000'], ['You promised the decorator', '₹8,50,000'], ['…and paid so far', '₹3,00,000'], ['All vendors and spending', '₹27,20,000'], ['<b>What you’ll make</b>', '<b>₹2,80,000</b>']])}
        <div class="v-note">The decorator costs ₹8,50,000, not ₹3,00,000. Adding up payments makes every event look profitable until the last bills arrive.</div>
        ${vSec('The six numbers on every event')}${kv([['Contract value', 'What the client agreed to pay, plus approved changes.'], ['Committed', 'Everything you’ve agreed with vendors.'], ['Paid', 'What has actually gone out to vendors.'], ['Expenses', 'Small spending on this event.'], ['Actual profit', 'Contract − committed − expenses.'], ['Expected profit', 'Contract − your estimates.']])}` : ''}
      ${vSec('Questions')}<div class="v-pad"><input id="help-q" placeholder="Search help" value="${esc(S.ui.helpq || '')}" autocomplete="off"></div><div class="hp-faq">${faqRows(q)}</div>
      ${vSec('Words we use')}${kv(WORDS().map(([w, d]) => [w, d]))}
      ${vSec('Use it like an app')}${install}
      <div class="v-note hp-foot">${own ? 'Still stuck? Tell us what you were trying to do — every question makes the app better.' : 'Still stuck? Ask the owner of your company.'}</div>
    </div>`;
    return vFrame({ key: 'help', title: 'Help', sub: 'How Aurivevents works', back: '#home', body });
  }

  /* jump straight to the screen (and open the form) a step talks about */
  act('help-go', ({ v }) => {
    if (v === 'new-event') { location.hash = 'home'; return setTimeout(() => mQuickEnquiry(), 250) }
    if (v === 'reimb' || v === 'settings') { location.hash = v; return }
    const list = S.events.filter(e => !e.history && eventVisible(e) && !['lost', 'cancelled', 'closed'].includes(e.stage));
    const e = (S.ui.eventId && list.find(x => x.id === S.ui.eventId)) || list.sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    if (!e) { toast('Add an event first'); location.hash = 'home'; return setTimeout(() => mQuickEnquiry(), 250) }
    S.ui.tab = { expenses: 'money' }[v] || v; S.ui.eventId = e.id; save(); go('event', e.id);
  });
  document.addEventListener('input', e => {
    if (e.target.id !== 'help-q') return;
    S.ui.helpq = e.target.value; const q = S.ui.helpq.toLowerCase();
    const box = document.querySelector('.hp-faq'); if (box) box.innerHTML = faqRows(q);
  });

  window.PAGES_EXT = window.PAGES_EXT || {};
  PAGES_EXT.help = vHelp;
  NAV_EXT.push(n => { if (!n.some(x => x[0] === 'help')) n.push(['help', 'Help', '']) });
  window.AURIV_HELP = { vHelp, faq: () => FAQ() };
})();
