/* ===== x99_boot.js ===== */
/* ===== BOOT ===== */
act('login-sample',()=>{startSession('u1','sample');location.hash='home';render();if(!S.onboarded)setTimeout(mTour,300)});
/* Startup never waits forever: the file store gets 4 s (another tab on an older version can block it), and a
   failing step is recorded instead of freezing the loading screen. cloud.js shows a recovery screen if needed. */
(async()=>{try{load();bindUI()}catch(e){console.error('boot load',e);window.__bootError=e;return}
  try{await Promise.race([loadFiles(),new Promise(r=>setTimeout(r,4000))])}catch(e){console.error(e)}
  BOOT_EXT.forEach(f=>{try{f()}catch(e){console.error('boot ext',e);S.errors.push({ts:nowISO(),where:'boot',msg:String(e.message).slice(0,200)})}});
  try{render()}catch(e){console.error('boot render',e);window.__bootError=e;return}
  window.__ready=true;
  setInterval(()=>{if(!currentSession())return;if(route()==='event'&&S.ui.tab==='runsheet'&&!document.querySelector('.modal'))render()},60000);})();

