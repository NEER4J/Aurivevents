/* ===== x99_boot.js ===== */
/* ===== BOOT ===== */
act('login-sample',()=>{startSession('u1','sample');location.hash='home';render();if(!S.onboarded)setTimeout(mTour,300)});
(async()=>{load();bindUI();try{await loadFiles()}catch(e){console.error(e)}BOOT_EXT.forEach(f=>{try{f()}catch(e){console.error('boot ext',e);S.errors.push({ts:nowISO(),where:'boot',msg:String(e.message).slice(0,200)})}});render();window.__ready=true;
  setInterval(()=>{if(!currentSession())return;if(route()==='event'&&S.ui.tab==='runsheet'&&!document.querySelector('.modal'))render()},60000);})();

