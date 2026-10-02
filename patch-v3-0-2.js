/* D12 Membership V3.0.2 — renewal reminder approval workflow */
(function(){
  const VERSION='3.0.2';
  const APPROVAL_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-membership-renewal-approvals';
  const approvalState={loaded:false,loading:null,required:false,requests:[],filter:'pending',loadedAt:0};
  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>v?new Date(v).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
  const isStaff=()=>typeof role!=='undefined'&&role==='staff';
  const isAdmin=()=>typeof role!=='undefined'&&role==='admin';
  const canRenew=()=>isAdmin()||(isStaff()&&!!data?.staff?.permissions?.renewals);
  const findMember=id=>(data?.members||[]).find(m=>m.id===id)||(data?.archived_members||[]).find(m=>m.id===id)||null;
  const ngTel=v=>{let x=String(v||'').replace(/\D/g,'');if(x.startsWith('0'))x='234'+x.slice(1);return x};

  async function approvalRequest(action,payload={}){
    const r=await fetch(APPROVAL_API,{method:'POST',headers:{'Content-Type':'application/json',...(typeof token!=='undefined'&&token?{'Authorization':'Bearer '+token}:{})},body:JSON.stringify({action,...payload})});
    const j=await r.json().catch(()=>({ok:false,error:'Invalid approval response.'}));
    if(!r.ok||!j.ok)throw new Error(j.error||'Renewal approval request failed.');
    return j;
  }

  async function ensureApprovalState(force=false){
    if(!(isAdmin()||isStaff())||typeof token==='undefined'||!token)return false;
    if(!force&&approvalState.loaded&&Date.now()-approvalState.loadedAt<15000)return true;
    if(approvalState.loading)return approvalState.loading;
    approvalState.loading=(async()=>{
      try{
        const j=await approvalRequest('state');
        approvalState.required=!!j.approval_required;
        approvalState.requests=Array.isArray(j.requests)?j.requests:[];
        approvalState.loaded=true;
        approvalState.loadedAt=Date.now();
        return true;
      }catch(e){
        console.error('D12 renewal approval state',e);
        if(typeof toast==='function')toast(e.message||'Could not load renewal approval settings.');
        return false;
      }finally{approvalState.loading=null}
    })();
    return approvalState.loading;
  }
  window.refreshRenewalApprovalState=async()=>{const ok=await ensureApprovalState(true);if(ok&&typeof render==='function')render()};

  function counts(){
    return ['pending','approved','sent','rejected','cancelled'].reduce((o,s)=>(o[s]=approvalState.requests.filter(r=>r.status===s).length,o),{});
  }
  function approvalRows(){
    const rows=approvalState.requests.filter(r=>approvalState.filter==='all'||r.status===approvalState.filter);
    if(!rows.length)return '<div class="v302-empty">No reminder requests in this view.</div>';
    return `<div class="v302-approval-list">${rows.map(r=>{
      const m=r.d12_membership_members||{},s=r.d12_membership_staff||{};
      return `<article class="v302-approval-row status-${E(r.status)}"><div class="v302-request-main"><span class="v302-channel">${r.channel==='WhatsApp'?'◉':r.channel==='SMS'?'▤':'✉'}</span><div><b>${E(m.full_name||'Member')}</b><small>${E(m.member_code||'')} · ${E(m.current_plan_name||'No plan')} · expires ${E(m.expiry_date||'—')}</small><span>Requested by ${E(s.full_name||s.username||'Staff')} · ${fmt(r.requested_at)}</span></div></div><div class="v302-request-side"><span class="v302-status ${E(r.status)}">${E(String(r.status||'').toUpperCase())}</span>${r.status==='pending'?`<div class="v302-actions"><button class="btn small good" onclick="reviewRenewalReminder('${r.id}','approved')">Approve</button><button class="btn small danger" onclick="reviewRenewalReminder('${r.id}','rejected')">Reject</button></div>`:''}${r.reviewed_at?`<small>${E(r.reviewed_by||'Admin')} · ${fmt(r.reviewed_at)}</small>`:''}${r.sent_at?`<small>Sent ${fmt(r.sent_at)}</small>`:''}</div></article>`;
    }).join('')}</div>`;
  }

  function approvalSettingsCard(){
    if(!approvalState.loaded){queueMicrotask(()=>ensureApprovalState().then(ok=>{if(ok&&typeof page!=='undefined'&&page==='settings'&&typeof render==='function')render()}));return `<div class="card section v302-approval-card"><h2>Renewal Reminder Approval</h2><p class="muted">Loading approval policy and reminder requests…</p></div>`}
    const c=counts();
    return `<div class="card section v302-approval-card"><div class="row split v302-policy-head"><div><span class="v302-eyebrow">STAFF REMINDER CONTROL</span><h2>Renewal Reminder Approval</h2><p class="muted">Choose whether staff renewal reminders require Admin approval before they can be sent.</p></div><label class="v302-policy-switch"><input id="v302ApprovalToggle" type="checkbox" ${approvalState.required?'checked':''} onchange="setRenewalApprovalPolicy(this.checked)"><span><i></i></span><b>${approvalState.required?'APPROVAL ON':'APPROVAL OFF'}</b></label></div><div class="v302-policy-explain ${approvalState.required?'on':'off'}"><span>${approvalState.required?'✓':'→'}</span><div><b>${approvalState.required?'Admin approval required':'Direct staff reminders enabled'}</b><small>${approvalState.required?'Staff can submit reminder requests. Admin must approve each request before that staff member can send it.':'Staff with Renewals permission can send WhatsApp, SMS or Email reminders immediately without individual approval.'}</small></div></div><div class="v302-tabs">${[['pending','Pending',c.pending],['approved','Approved',c.approved],['sent','Sent',c.sent],['rejected','Rejected',c.rejected],['all','All',approvalState.requests.length]].map(([v,l,n])=>`<button class="${approvalState.filter===v?'active':''}" onclick="setRenewalApprovalFilter('${v}')">${l}<span>${n}</span></button>`).join('')}<button class="v302-refresh" onclick="refreshRenewalApprovalState()">↻ Refresh</button></div>${approvalRows()}</div>`;
  }

  window.setRenewalApprovalFilter=v=>{approvalState.filter=v;if(typeof render==='function')render()};
  window.setRenewalApprovalPolicy=async required=>{
    try{
      const j=await approvalRequest('set_policy',{required:!!required});
      approvalState.required=!!j.approval_required;approvalState.loadedAt=Date.now();
      await ensureApprovalState(true);
      if(typeof render==='function')render();
      if(typeof playD12Sound==='function')playD12Sound('save');
      if(typeof toast==='function')toast(approvalState.required?'Renewal reminder approval is ON.':'Renewal reminder approval is OFF. Staff can send reminders directly.');
    }catch(e){if(typeof toast==='function')toast(e.message);await ensureApprovalState(true);if(typeof render==='function')render()}
  };
  window.reviewRenewalReminder=async(id,decision)=>{
    const verb=decision==='approved'?'approve':'reject';
    if(!confirm(`Confirm you want to ${verb} this renewal reminder request?`))return;
    try{
      await approvalRequest('decide',{id,decision});
      await ensureApprovalState(true);
      if(typeof playD12Sound==='function')playD12Sound(decision==='approved'?'save':'danger');
      if(typeof toast==='function')toast(`Reminder request ${decision}.`);
      if(typeof render==='function')render();
    }catch(e){if(typeof toast==='function')toast(e.message)}
  };

  function staffPolicyNotice(){
    if(!approvalState.loaded){queueMicrotask(()=>ensureApprovalState().then(ok=>{if(ok&&typeof page!=='undefined'&&page==='renewals'&&typeof render==='function')render()}));return '<div class="notice">Loading reminder approval policy…</div>'}
    if(!canRenew())return '<div class="notice"><b>Renewal monitoring access</b><br>You can monitor subscription status and upcoming expiries. Admin must enable the Renewals permission on your staff account before you can send reminders.</div>';
    const mine=approvalState.requests.filter(r=>r.staff_id===data?.staff?.id),pending=mine.filter(r=>r.status==='pending').length,approved=mine.filter(r=>r.status==='approved').length;
    return `<div class="v302-staff-policy ${approvalState.required?'on':'off'}"><span>${approvalState.required?'◆':'✓'}</span><div><b>${approvalState.required?'Admin approval is required':'Direct reminders are enabled'}</b><small>${approvalState.required?`Click a reminder button to request approval. Once approved, click the same reminder button again to send. ${pending} pending · ${approved} approved.`:'Your Renewals permission allows reminders to be sent immediately.'}</small></div></div>`;
  }

  function openReminderChannel(m,channel){
    const expiry=m?.expiry_date||'soon';
    const text=`Hello ${m.full_name}, your D12 Cue Club membership ${m.membership_status==='EXPIRED'?'has expired':`expires on ${expiry}`}. Please contact D12 Cue Club to renew your subscription.`;
    if(channel==='WhatsApp'){const tel=ngTel(m.phone);if(!tel)throw new Error('This member has no phone number for WhatsApp.');open(`https://wa.me/${tel}?text=${encodeURIComponent(text)}`,'_blank')}
    else if(channel==='SMS'){if(!m.phone)throw new Error('This member has no phone number for SMS.');location.href=`sms:${m.phone}?body=${encodeURIComponent(text)}`}
    else if(channel==='Email'){if(!m.email)throw new Error('This member has no email address.');location.href=`mailto:${m.email}?subject=${encodeURIComponent('D12 Cue Club Membership Renewal')}&body=${encodeURIComponent(text)}`}
  }

  const previousContactRenewal=typeof window.contactRenewal==='function'?window.contactRenewal:null;
  window.contactRenewal=async function(id,channel){
    if(!isStaff())return previousContactRenewal?previousContactRenewal.apply(this,arguments):undefined;
    if(!canRenew()){if(typeof toast==='function')toast('Admin must enable Renewals permission before you can send reminders.');return}
    const m=findMember(id);if(!m)return typeof toast==='function'&&toast('Member not found.');
    try{
      if(channel==='WhatsApp'&&!m.phone)throw new Error('This member has no phone number for WhatsApp.');
      if(channel==='SMS'&&!m.phone)throw new Error('This member has no phone number for SMS.');
      if(channel==='Email'&&!m.email)throw new Error('This member has no email address.');
      const j=await approvalRequest('request_or_send',{member_id:id,channel,note:`Renewal reminder from D12 Membership V${VERSION}`});
      approvalState.required=!!j.approval_required;
      if(j.pending&&!j.send_allowed){
        await ensureApprovalState(true);
        if(typeof playD12Sound==='function')playD12Sound('soft');
        if(typeof toast==='function')toast('Approval request sent to Admin. You can send this reminder after approval.');
        if(typeof render==='function')render();
        return;
      }
      if(j.send_allowed){
        openReminderChannel(m,channel);
        await ensureApprovalState(true);
        if(typeof refresh==='function')await refresh();
        if(typeof page!=='undefined')page='renewals';
        if(typeof render==='function')render();
        if(typeof playD12Sound==='function')playD12Sound('reminder');
        if(typeof toast==='function')toast(j.approved?'Approved reminder sent and recorded.':`${channel} reminder sent and recorded.`);
      }
    }catch(e){if(typeof toast==='function')toast(e.message||'Could not process renewal reminder.')}
  };

  if(typeof settingsView==='function'){
    const priorSettingsView=settingsView;
    settingsView=function(){return priorSettingsView.apply(this,arguments)+approvalSettingsCard()};
  }
  if(typeof renewalsView==='function'){
    const priorRenewalsView=renewalsView;
    renewalsView=function(){return isStaff()?staffPolicyNotice()+priorRenewalsView.apply(this,arguments):priorRenewalsView.apply(this,arguments)};
  }
  if(typeof enterApp==='function'){
    const priorEnterApp=enterApp;
    enterApp=async function(){const out=await priorEnterApp.apply(this,arguments);if(isAdmin()||isStaff()){const ok=await ensureApprovalState(true);if(ok&&typeof render==='function')render()}return out};
  }
  if(typeof render==='function'){
    const priorRender=render;
    render=function(){const out=priorRender.apply(this,arguments);document.documentElement.dataset.d12Version=VERSION;requestAnimationFrame(()=>document.querySelectorAll('.brand small').forEach(x=>x.textContent='Membership V3.0.2'));return out};
  }
  document.documentElement.dataset.d12Version=VERSION;
})();