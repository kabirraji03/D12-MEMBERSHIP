/* D12 Cue Club Membership V2.3 correctness patch */
statusOf=function(m){
  if(!m?.expiry_date)return{label:'INACTIVE',days:null,cls:'inactive',paused:false};
  const utcDay=s=>s?Date.parse(s+'T00:00:00Z'):(()=>{const d=new Date();return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())})();
  const now=utcDay(),expiry=utcDay(m.expiry_date),windowDays=Number(data?.settings?.expiring_soon_days||7);
  const pauseUntil=m.break_run_pause_until?utcDay(m.break_run_pause_until):null;
  const rawPaused=!!(pauseUntil&&now<=pauseUntil&&m.break_run_hold_days!=null);
  const paused=rawPaused||!!m.perk_paused;
  let days;
  if(paused){days=Number(m.break_run_hold_days??m.days_remaining);if(!Number.isFinite(days))days=Math.floor((expiry-now)/86400000)+1;}
  else days=Math.floor((expiry-now)/86400000)+1;
  const label=days<=0?'EXPIRED':days<=windowDays?'EXPIRING SOON':'ACTIVE';
  return{label,days:Math.max(0,days),cls:label==='ACTIVE'?'active':label==='EXPIRING SOON'?'soon':'expired',paused};
};

dashboardView=function(){
  const ms=data.members||[],ps=data.payments||[];
  const active=ms.filter(m=>statusOf(m).label==='ACTIVE').length;
  const soon=ms.filter(m=>statusOf(m).label==='EXPIRING SOON').length;
  const expired=ms.filter(m=>statusOf(m).label==='EXPIRED').length;
  const revenue=ps.filter(p=>p.payment_status==='Paid').reduce((a,p)=>a+Number(p.amount),0);
  const watch=ms.filter(m=>['EXPIRING SOON','EXPIRED'].includes(statusOf(m).label)).sort((a,b)=>(statusOf(a).days??99999)-(statusOf(b).days??99999)).slice(0,10);
  return`<div class="grid kpis"><div class="card kpi"><span>ACTIVE MEMBERS</span><b>${active}</b></div><div class="card kpi"><span>EXPIRING SOON</span><b>${soon}</b></div><div class="card kpi"><span>EXPIRED</span><b>${expired}</b></div><div class="card kpi"><span>VERIFIED REVENUE</span><b>${money(revenue)}</b></div></div><div class="card section"><h2>Renewal Watch</h2>${memberStatusTable(watch,false)}</div><div class="card section"><div class="notice">Status totals are calculated live from each member's expiry date. Expiring Soon is shown separately from Active.</div></div>`;
};

attachSearch=function(){const el=$('#memberSearch');if(el)el.addEventListener('input',e=>{searchTerm=e.target.value;const host=$('#memberTableHost');if(host)host.outerHTML=memberStatusTable(filteredMembers(),role==='admin')})};

exportCsv=function(){
  const rows=[['Member ID','Full Name','Phone','Email','Plan','Expiry','Days Remaining','Status','Break & Run Wins'],...(data.members||[]).map(m=>{const s=statusOf(m);return[m.member_code,m.full_name,m.phone||'',m.email||'',m.current_plan_name||'',m.expiry_date||'',s.days??'',s.label,m.break_run_wins||0]})];
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n'),a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='D12_Membership_Status_V2_3.csv';a.click();URL.revokeObjectURL(a.href);
};

let __d12v23day=new Date().toISOString().slice(0,10);
setInterval(()=>{const d=new Date().toISOString().slice(0,10);if(d!==__d12v23day){__d12v23day=d;if(data&&role)render()}},60000);
