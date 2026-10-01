/* D12 Membership V3.0.1 — staff plans + renewal monitoring hotfix */
(function(){
  const VERSION='3.0.1';
  const STAFF_PLANS_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-membership-staff-plans';
  const staffCan=p=>typeof role!=='undefined'&&role==='staff'&&!!data?.staff?.permissions?.[p];
  const renewalIcon='<span class="v3-nav-icon v3-icon-renewals" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V3l-2 2a8 8 0 1 0 2.2 8M19 3h-4"/></svg></span>';
  let plansLoading=null;

  async function ensureStaffPlans(force=false){
    if(typeof role==='undefined'||role!=='staff'||!staffCan('payments')||!data)return false;
    if(!force&&Array.isArray(data.plans)&&data.plans.length)return true;
    if(plansLoading)return plansLoading;
    plansLoading=(async()=>{
      try{
        const r=await fetch(STAFF_PLANS_API,{method:'POST',headers:{'Content-Type':'application/json',...(typeof token!=='undefined'&&token?{'Authorization':'Bearer '+token}:{})},body:'{}'});
        const j=await r.json().catch(()=>({ok:false,error:'Invalid plan response.'}));
        if(!r.ok||!j.ok)throw new Error(j.error||'Could not load membership plans.');
        data.plans=Array.isArray(j.plans)?j.plans:[];
        return true;
      }catch(e){
        console.error('D12 staff plans',e);
        if(typeof toast==='function')toast(e.message||'Could not load membership plans.');
        return false;
      }finally{plansLoading=null}
    })();
    return plansLoading;
  }

  if(typeof enterApp==='function'){
    const priorEnterApp=enterApp;
    enterApp=async function(){
      const out=await priorEnterApp.apply(this,arguments);
      if(typeof role!=='undefined'&&role==='staff'&&staffCan('payments')){
        const loaded=await ensureStaffPlans();
        if(loaded&&typeof render==='function')render();
      }
      return out;
    };
  }

  if(typeof refresh==='function'){
    const priorRefresh=refresh;
    refresh=async function(){
      const out=await priorRefresh.apply(this,arguments);
      if(typeof role!=='undefined'&&role==='staff'&&staffCan('payments')){
        const loaded=await ensureStaffPlans();
        if(loaded&&typeof render==='function')render();
      }
      return out;
    };
  }

  if(typeof navItems==='function'){
    const priorNavItems=navItems;
    navItems=function(){
      const items=priorNavItems.apply(this,arguments)||[];
      if(typeof role!=='undefined'&&role==='staff'&&(staffCan('view_members')||staffCan('renewals'))&&!items.some(x=>x?.[0]==='renewals')){
        const idx=items.findIndex(x=>['payments','scanner'].includes(x?.[0]));
        const item=['renewals',renewalIcon,'Renewals'];
        if(idx>=0)items.splice(idx,0,item);else items.push(item);
      }
      return items;
    };
  }

  if(typeof renewalsView==='function'){
    const priorRenewalsView=renewalsView;
    renewalsView=function(){
      const html=priorRenewalsView.apply(this,arguments);
      if(typeof role!=='undefined'&&role==='staff'&&!staffCan('renewals')){
        return '<div class="notice"><b>Renewal monitoring access</b><br>You can monitor subscription status and upcoming expiries. Sending renewal reminders requires the Renewals permission from Admin.</div>'+html;
      }
      return html;
    };
  }

  if(typeof window.contactRenewal==='function'){
    const priorContactRenewal=window.contactRenewal;
    window.contactRenewal=async function(){
      if(typeof role!=='undefined'&&role==='staff'&&!staffCan('renewals')){
        if(typeof toast==='function')toast('Monitoring only. Admin must enable Renewals permission to send reminders.');
        return;
      }
      return priorContactRenewal.apply(this,arguments);
    };
  }

  if(typeof paymentsView==='function'){
    const priorPaymentsView=paymentsView;
    paymentsView=function(){
      if(typeof role!=='undefined'&&role==='staff'&&staffCan('payments')&&(!Array.isArray(data?.plans)||!data.plans.length)){
        ensureStaffPlans().then(ok=>{if(ok&&typeof page!=='undefined'&&page==='payments'&&typeof render==='function')render()});
        return '<div class="card section"><h2>New Transaction</h2><p class="muted">Loading active D12 membership subscription plans…</p></div>'+priorPaymentsView.apply(this,arguments);
      }
      return priorPaymentsView.apply(this,arguments);
    };
  }

  if(typeof render==='function'){
    const priorRender=render;
    render=function(){
      const out=priorRender.apply(this,arguments);
      document.documentElement.dataset.d12Version=VERSION;
      requestAnimationFrame(()=>{
        document.querySelectorAll('.brand small').forEach(x=>x.textContent='Membership V3.0.1');
      });
      return out;
    };
  }

  document.documentElement.dataset.d12Version=VERSION;
})();
