/* D12 Membership V2.4 stability patch — auth isolation + lazy optional libraries */
(function(){
  const LIBS={
    chart:'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',
    camera:'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js',
    pdf:'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js'
  };
  const pending=new Map();
  function loadScriptOnce(key,url,globalName){
    if(globalName&&window[globalName])return Promise.resolve(window[globalName]);
    if(pending.has(key))return pending.get(key);
    const p=new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[data-d12-lib="${key}"]`);
      if(existing){
        existing.addEventListener('load',()=>resolve(globalName?window[globalName]:true),{once:true});
        existing.addEventListener('error',()=>reject(new Error(`${key} library failed to load`)),{once:true});
        return;
      }
      const s=document.createElement('script');
      s.src=url;s.async=true;s.dataset.d12Lib=key;s.crossOrigin='anonymous';
      s.onload=()=>resolve(globalName?window[globalName]:true);
      s.onerror=()=>reject(new Error(`${key} library failed to load`));
      document.head.appendChild(s);
    }).finally(()=>{if(globalName&&!window[globalName])pending.delete(key)});
    pending.set(key,p);return p;
  }

  // Give Admin its own browser credential identity so Staff/legacy passwords cannot autofill into it.
  const priorChooseLogin=window.chooseLogin||chooseLogin;
  window.chooseLogin=chooseLogin=function(kind){
    if(kind!=='admin')return priorChooseLogin(kind);
    const p=document.querySelector('#loginPanel');
    p.classList.remove('hidden');
    p.innerHTML=`<div class="login-head"><div><h2>Admin Login</h2><p>Full system control.</p></div><button class="icon-btn" type="button" onclick="closeLoginPanel()">×</button></div>
      <form id="d12AdminLoginForm" autocomplete="on">
        <div class="field"><label>ACCOUNT</label><input name="username" value="admin" autocomplete="username" readonly aria-readonly="true"></div>
        <div class="field"><label>ADMIN PASSWORD</label><input id="d12AdminPassword" name="admin_password" type="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" required autofocus></div>
        <label class="check"><input id="d12ShowAdminPassword" type="checkbox"> Show password</label>
        <button id="d12AdminSignIn" class="btn primary block" type="submit">Sign In</button>
        <div id="loginError" class="error" aria-live="polite"></div>
      </form>`;
    const form=document.querySelector('#d12AdminLoginForm'),pass=document.querySelector('#d12AdminPassword'),btn=document.querySelector('#d12AdminSignIn'),err=document.querySelector('#loginError');
    document.querySelector('#d12ShowAdminPassword')?.addEventListener('change',e=>{pass.type=e.target.checked?'text':'password'});
    pass?.addEventListener('input',()=>{err.textContent=''});
    form?.addEventListener('submit',async e=>{
      e.preventDefault();
      if(btn.disabled)return;
      const password=pass.value;
      err.textContent='';btn.disabled=true;btn.textContent='Signing in…';
      try{
        const j=await request('staff_login',{role:'admin',password},false);
        saveSession(j);
        await enterApp();
      }catch(x){
        err.textContent=x?.message||'Login failed. Please try again.';
        pass.focus();pass.select();
      }finally{
        if(btn?.isConnected){btn.disabled=false;btn.textContent='Sign In'}
      }
    });
    setTimeout(()=>pass?.focus(),60);
    p.scrollIntoView({behavior:'smooth',block:'nearest'});
  };

  // Load analytics only after the Admin dashboard is already usable.
  if(typeof render==='function'){
    const priorRender=render;let chartRequested=false;
    render=function(...args){
      const out=priorRender.apply(this,args);
      if(typeof role!=='undefined'&&role==='admin'&&typeof page!=='undefined'&&page==='dashboard'&&!window.Chart&&!chartRequested){
        chartRequested=true;
        const start=()=>loadScriptOnce('chart',LIBS.chart,'Chart').then(()=>{
          if(window.Chart){try{window.Chart.defaults.animation=false}catch{};if(role==='admin'&&page==='dashboard')priorRender.apply(this,args)}
        }).catch(e=>{chartRequested=false;console.warn('D12 analytics unavailable',e)});
        if('requestIdleCallback'in window)requestIdleCallback(start,{timeout:1200});else setTimeout(start,180);
      }
      return out;
    };
  }

  // Camera scanner loads only when the user actually presses Scan With Camera.
  if(typeof window.startCameraScanner==='function'){
    const priorCamera=window.startCameraScanner;
    window.startCameraScanner=async function(){
      try{await loadScriptOnce('camera',LIBS.camera,'Html5Qrcode');return await priorCamera.apply(this,arguments)}
      catch(e){console.error(e);if(typeof toast==='function')toast('Camera scanner could not load. Check your connection and try again.')}
    };
  }

  // PDF engine loads only when a PDF is requested.
  ['downloadReceiptPdf','downloadManagementPdf'].forEach(name=>{
    if(typeof window[name]!=='function')return;
    const prior=window[name];
    window[name]=async function(){
      try{await loadScriptOnce('pdf',LIBS.pdf,'jspdf');return prior.apply(this,arguments)}
      catch(e){console.error(e);if(typeof toast==='function')toast('PDF tools could not load. Check your connection and try again.')}
    };
  });

  // Make reloads after deployment prefer the newest app shell.
  window.addEventListener('pageshow',()=>{
    if('serviceWorker'in navigator)navigator.serviceWorker.getRegistration().then(r=>r?.update()).catch(()=>{});
  });
})();
