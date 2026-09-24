/* D12 Membership V2.4.1 — undo/redo, liquid glass, report hygiene, mobile nav */
(function(){
  const VERSION='2.4.1';
  const HISTORY_KEY='d12m_v241_action_history';
  let suppressHistory=false;

  function loadHistory(){
    try{const h=JSON.parse(localStorage.getItem(HISTORY_KEY)||'{}');return{undo:Array.isArray(h.undo)?h.undo:[],redo:Array.isArray(h.redo)?h.redo:[]}}catch{return{undo:[],redo:[]}}
  }
  let history=loadHistory();
  const saveHistory=()=>localStorage.setItem(HISTORY_KEY,JSON.stringify({undo:history.undo.slice(-20),redo:history.redo.slice(-20)}));
  const findMember=id=>(data?.members||[]).find(m=>m.id===id)||(data?.archived_members||[]).find(m=>m.id===id)||null;
  const memberPatch=m=>m?{id:m.id,full_name:m.full_name||'',phone:m.phone||'',email:m.email||'',gender:m.gender||'',address:m.address||'',emergency_contact:m.emergency_contact||'',notes:m.notes||''}:null;
  const clone=v=>JSON.parse(JSON.stringify(v??null));

  function captureAction(action,payload){
    if(typeof role==='undefined'||role!=='admin')return null;
    if(action==='save_settings')return{kind:action,label:'Club settings change',before:{daily_rate:Number(data?.settings?.daily_rate||0),expiring_soon_days:Number(data?.settings?.expiring_soon_days||7)},redo:{action,payload:clone(payload)}};
    if(action==='save_plan'){
      const p=(data?.plans||[]).find(x=>x.id===payload.id);if(!p)return null;
      return{kind:action,label:`${p.name} plan change`,before:{id:p.id,price:Number(p.price||0),active:!!p.active},redo:{action,payload:clone(payload)}};
    }
    if(action==='update_member'){
      const m=findMember(payload.id);if(!m)return null;
      return{kind:action,label:`Profile edit · ${m.full_name}`,before:memberPatch(m),redo:{action,payload:clone(payload)}};
    }
    if(action==='save_member_photo'){
      const m=findMember(payload.id);if(!m)return null;
      return{kind:action,label:`Photo change · ${m.full_name}`,before:{id:m.id,photo_data:m.photo_data||''},redo:{action,payload:clone(payload)}};
    }
    if(action==='archive_member'){
      const m=(data?.members||[]).find(x=>x.id===payload.id);if(!m)return null;
      return{kind:action,label:`Archive · ${m.full_name}`,before:{id:m.id},redo:{action,payload:clone(payload)}};
    }
    if(action==='restore_member'){
      const m=(data?.archived_members||[]).find(x=>x.id===payload.id);if(!m)return null;
      return{kind:action,label:`Restore · ${m.full_name}`,before:{id:m.id,reason:m.archived_reason||'Archived by Admin'},redo:{action,payload:clone(payload)}};
    }
    if(action==='update_staff'){
      const st=(data?.staff||[]).find(x=>x.id===payload.id);if(!st)return null;
      return{kind:action,label:`Staff settings · ${st.full_name}`,before:{id:st.id,full_name:st.full_name,active:!!st.active,permissions:clone(st.permissions||{})},redo:{action,payload:clone(payload)}};
    }
    return null;
  }

  if(typeof request==='function'){
    const rawRequest=request;
    window.__d12RawRequest=rawRequest;
    request=async function(action,payload={},useAuth=true){
      const entry=!suppressHistory?captureAction(action,payload):null;
      const result=await rawRequest(action,payload,useAuth);
      if(entry){entry.at=new Date().toISOString();history.undo.push(entry);history.redo=[];saveHistory();queueMicrotask(updateUndoRedoButtons)}
      return result;
    };
  }

  async function applyInverse(entry){
    const r=window.__d12RawRequest||request;
    if(entry.kind==='save_settings')return r('save_settings',entry.before);
    if(entry.kind==='save_plan')return r('save_plan',entry.before);
    if(entry.kind==='update_member')return r('update_member',entry.before);
    if(entry.kind==='save_member_photo')return r('save_member_photo',entry.before);
    if(entry.kind==='archive_member')return r('restore_member',{id:entry.before.id});
    if(entry.kind==='restore_member')return r('archive_member',{id:entry.before.id,reason:entry.before.reason||'Undo restore'});
    if(entry.kind==='update_staff')return r('update_staff',entry.before);
    throw new Error('This action cannot be undone safely.');
  }
  async function applyRedo(entry){const r=window.__d12RawRequest||request;return r(entry.redo.action,entry.redo.payload)}

  window.undoLastAction=async()=>{
    if(role!=='admin'||!history.undo.length)return;
    const entry=history.undo.at(-1);
    if(!confirm(`Undo last reversible action?\n\n${entry.label}`))return;
    try{suppressHistory=true;await applyInverse(entry);history.undo.pop();history.redo.push(entry);saveHistory();await refresh();toast(`Undone: ${entry.label}`)}catch(e){toast(e.message||'Undo failed.')}finally{suppressHistory=false;updateUndoRedoButtons()}
  };
  window.redoLastAction=async()=>{
    if(role!=='admin'||!history.redo.length)return;
    const entry=history.redo.at(-1);
    if(!confirm(`Redo action?\n\n${entry.label}`))return;
    try{suppressHistory=true;await applyRedo(entry);history.redo.pop();history.undo.push(entry);saveHistory();await refresh();toast(`Redone: ${entry.label}`)}catch(e){toast(e.message||'Redo failed.')}finally{suppressHistory=false;updateUndoRedoButtons()}
  };

  function updateUndoRedoButtons(){
    const host=document.querySelector('#topActions');if(!host||typeof role==='undefined'||role!=='admin')return;
    let wrap=document.querySelector('#undoRedoControls');
    if(!wrap){
      wrap=document.createElement('div');wrap.id='undoRedoControls';wrap.className='undo-redo-controls';
      wrap.innerHTML='<button id="undoBtn" class="btn glass-tool" type="button" onclick="undoLastAction()" title="Undo last reversible action">↶ <span>Undo</span></button><button id="redoBtn" class="btn glass-tool" type="button" onclick="redoLastAction()" title="Redo last undone action">↷ <span>Redo</span></button>';
      host.prepend(wrap);
    }
    const u=wrap.querySelector('#undoBtn'),r=wrap.querySelector('#redoBtn');
    if(u){u.disabled=!history.undo.length;u.title=history.undo.length?`Undo: ${history.undo.at(-1).label}`:'Nothing to undo'}
    if(r){r.disabled=!history.redo.length;r.title=history.redo.length?`Redo: ${history.redo.at(-1).label}`:'Nothing to redo'}
  }

  const glassOn=()=>localStorage.getItem('d12LiquidGlass')!=='off';
  function applyGlass(){document.documentElement.classList.toggle('liquid-glass',glassOn());document.documentElement.classList.toggle('liquid-glass-off',!glassOn())}
  applyGlass();
  window.setLiquidGlass=enabled=>{localStorage.setItem('d12LiquidGlass',enabled?'on':'off');applyGlass();toast(`Liquid Glass ${enabled?'enabled':'disabled'} on this device.`)};

  if(typeof settingsView==='function'){
    const priorSettingsView=settingsView;
    settingsView=function(){return priorSettingsView()+`<div class="card section glass-settings-card"><div class="row split"><div><h2>Liquid Glass Interface</h2><p class="muted">Use translucent blur, reflective highlights and glass navigation. This preference is saved on this device.</p></div><label class="glass-switch"><input id="liquidGlassToggle" type="checkbox" ${glassOn()?'checked':''}><span class="glass-switch-track"><span class="glass-switch-thumb"></span></span><b>${glassOn()?'ON':'OFF'}</b></label></div></div>`};
  }

  function activeReportData(){
    const members=[...(data?.members||[])];
    const ids=new Set(members.map(m=>m.id));
    const payments=(data?.payments||[]).filter(p=>p.payment_status==='Paid'&&ids.has(p.member_id));
    const perks=(data?.perks||[]).filter(p=>ids.has(p.member_id));
    return{members,payments,perks};
  }
  function reportProfileName(m){return `<b>${esc(m.full_name)}</b><br><small>${esc(m.member_code)}</small>`}
  function reportsView241(){
    const {members:ms,payments:ps,perks}=activeReportData(),total=ps.reduce((a,p)=>a+Number(p.amount),0),expired=ms.filter(m=>statusOf(m).label==='EXPIRED').length,renewed=new Set(ps.map(p=>p.member_id)).size,rate=ms.length?Math.round(renewed/ms.length*100):0;
    return`<div class="report-scope-note">Reports include <b>current non-archived members only</b>. Archived and permanently deleted members are excluded.</div><div class="grid kpis"><div class="card kpi"><span>TOTAL REVENUE</span><b>${money(total)}</b></div><div class="card kpi"><span>ACTIVE MEMBERS</span><b>${ms.filter(m=>['ACTIVE','EXPIRING SOON'].includes(statusOf(m).label)).length}</b></div><div class="card kpi"><span>EXPIRED</span><b>${expired}</b></div><div class="card kpi"><span>RENEWAL COVERAGE</span><b>${rate}%</b></div><div class="card kpi"><span>BREAK & RUN PERKS</span><b>${perks.length}</b></div></div><div class="card section"><div class="row split"><div><h2>Management Reports</h2><p class="muted">Live report for current member records only.</p></div><div class="row"><button class="btn" onclick="exportManagementCsv()">Download CSV</button><button class="btn primary" onclick="downloadManagementPdf()">Download PDF</button></div></div><div class="table-wrap"><table><thead><tr><th>Member</th><th>Plan</th><th>Status</th><th>Registered</th><th>Expiry</th><th>B&R Wins</th><th>Total Paid</th></tr></thead><tbody>${ms.map(m=>`<tr><td>${reportProfileName(m)}</td><td>${esc(m.current_plan_name||'—')}</td><td>${pill(m)}</td><td>${m.registered_at?new Date(m.registered_at).toLocaleDateString('en-GB'):'—'}</td><td>${m.expiry_date?new Date(m.expiry_date).toLocaleDateString('en-GB'):'—'}</td><td>${m.break_run_wins||0}</td><td>${money(ps.filter(p=>p.member_id===m.id).reduce((a,p)=>a+Number(p.amount),0))}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
  window.exportManagementCsv=()=>{
    const {members:ms,payments:ps}=activeReportData(),rows=[['Member ID','Name','Plan','Status','Registered','Expiry','B&R Wins','Total Paid'],...ms.map(m=>[m.member_code,m.full_name,m.current_plan_name||'',statusOf(m).label,m.registered_at||'',m.expiry_date||'',m.break_run_wins||0,ps.filter(p=>p.member_id===m.id).reduce((a,p)=>a+Number(p.amount),0)])];
    const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='D12_Current_Members_Management_Report.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800);
  };
  async function ensurePdf(){
    if(window.jspdf)return window.jspdf;
    await new Promise((resolve,reject)=>{const existing=document.querySelector('script[data-d12-v241-pdf]');if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';sc.async=true;sc.dataset.d12V241Pdf='1';sc.onload=resolve;sc.onerror=reject;document.head.appendChild(sc)});
    return window.jspdf;
  }
  window.downloadManagementPdf=async()=>{
    try{await ensurePdf()}catch{return toast('PDF tools could not load. Check your connection and try again.')}
    const {members:ms,payments:ps}=activeReportData(),{jsPDF}=window.jspdf,doc=new jsPDF();
    doc.setFontSize(18);doc.text('D12 CUE CLUB — Current Member Report',15,20);doc.setFontSize(9);doc.text('Archived and deleted members are excluded from this management report.',15,28);doc.text(`Generated ${new Date().toLocaleString()} | Members: ${ms.length} | Revenue: ${money(ps.reduce((a,p)=>a+Number(p.amount),0))}`,15,35);let y=47;
    ms.forEach((m,i)=>{if(y>280){doc.addPage();y=20}doc.text(`${i+1}. ${m.full_name} | ${m.member_code} | ${m.current_plan_name||'—'} | ${statusOf(m).label} | Exp ${m.expiry_date||'—'}`,15,y);y+=7});doc.save('D12_Current_Members_Report.pdf');
  };

  if(typeof wireView==='function'){
    const priorWire=wireView;
    wireView=function(){
      priorWire();
      document.querySelector('#liquidGlassToggle')?.addEventListener('change',e=>{setLiquidGlass(e.target.checked);const b=e.target.closest('.glass-switch')?.querySelector('b');if(b)b.textContent=e.target.checked?'ON':'OFF'});
      updateUndoRedoButtons();applyGlass();
    };
  }

  if(typeof render==='function'){
    const priorRender=render;
    render=function(){const out=priorRender.apply(this,arguments);if(typeof role!=='undefined'&&role==='admin'&&typeof page!=='undefined'&&page==='reports'){const v=document.querySelector('#view');if(v)v.innerHTML=reportsView241()}document.documentElement.dataset.d12Version=VERSION;setTimeout(()=>{updateUndoRedoButtons();applyGlass()},0);return out};
  }

  const topActions=document.querySelector('#topActions');
  if(topActions){new MutationObserver(()=>updateUndoRedoButtons()).observe(topActions,{childList:true})}
  document.documentElement.dataset.d12Version=VERSION;
})();
