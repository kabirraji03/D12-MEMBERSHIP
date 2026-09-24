/* D12 Membership V2.4.2 — graphical Members / Payments / Renewals UX */
(function(){
  const VERSION='2.4.2';
  const UX={status:'all',plan:'all',winner:'all',from:'',to:'',sort:'name',dir:'asc',page:1,pageSize:9,renewalDays:7,q:'',searchTimer:null};
  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cash=v=>typeof money==='function'?money(v):`₦${Number(v||0).toLocaleString()}`;
  const stat=m=>typeof statusOf==='function'?statusOf(m):{label:m?.membership_status||'INACTIVE',days:m?.days_remaining??null,paused:!!m?.perk_paused};
  const member=id=>(data?.members||[]).find(m=>m.id===id)||(data?.archived_members||[]).find(m=>m.id===id)||null;
  const paymentsFor=id=>(data?.payments||[]).filter(p=>p.member_id===id);
  const paidFor=id=>paymentsFor(id).filter(p=>p.payment_status==='Paid');
  const fmt=v=>v?new Date(v).toLocaleDateString('en-GB'):'—';
  const initials=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
  const avatar=(m,cls='v242-avatar')=>m?.photo_data?`<img class="${cls}" src="${m.photo_data}" alt="${E(m.full_name)}">`:`<div class="${cls} avatar-fallback">${E(initials(m?.full_name))}</div>`;
  const activeLabel=m=>stat(m).label;
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const pct=(n,d)=>d?clamp(Math.round(n/d*100),0,100):0;

  function lifecycle(m){
    const st=stat(m),a=m?.activation_date?new Date(m.activation_date+'T00:00:00Z'):null,e=m?.expiry_date?new Date(m.expiry_date+'T00:00:00Z'):null;
    if(!a||!e||Number.isNaN(+a)||Number.isNaN(+e))return{remaining:0,total:0,percent:0};
    const total=Math.max(1,Math.floor((e-a)/86400000)+1),remaining=Math.max(0,Number(st.days??0));
    return{remaining,total,percent:clamp(Math.round(remaining/total*100),0,100)};
  }
  function miniRing(m,size=72){
    const st=stat(m),days=st.days??0,life=lifecycle(m),tone=st.label==='ACTIVE'?'var(--green)':st.label==='EXPIRING SOON'?'var(--amber)':st.label==='EXPIRED'?'var(--red)':'var(--muted)';
    return`<div class="v242-ring" style="--p:${life.percent};--ring:${tone};--sz:${size}px"><div><b>${days??'—'}</b><span>${st.label==='EXPIRED'?'expired':'days'}</span></div></div>`;
  }
  function lifecycleBar(m){
    const st=stat(m),life=lifecycle(m),tone=st.label==='ACTIVE'?'good':st.label==='EXPIRING SOON'?'soon':st.label==='EXPIRED'?'bad':'neutral';
    return`<div class="v242-life"><div class="v242-life-meta"><span>${fmt(m.activation_date)}</span><b>${life.percent}% remaining</b><span>${fmt(m.expiry_date)}</span></div><div class="v242-progress ${tone}"><i style="width:${life.percent}%"></i></div></div>`;
  }
  function planBreakdown(ms){
    const plans=[...new Set(ms.map(m=>m.current_plan_name||'Inactive'))],max=Math.max(1,...plans.map(p=>ms.filter(m=>(m.current_plan_name||'Inactive')===p).length));
    return plans.map(p=>{const n=ms.filter(m=>(m.current_plan_name||'Inactive')===p).length;return`<div class="v242-bar-row"><span>${E(p)}</span><div><i style="width:${pct(n,max)}%"></i></div><b>${n}</b></div>`}).join('');
  }
  function statusDonut(ms){
    const total=Math.max(1,ms.length),a=ms.filter(m=>activeLabel(m)==='ACTIVE').length,s=ms.filter(m=>activeLabel(m)==='EXPIRING SOON').length,x=ms.filter(m=>activeLabel(m)==='EXPIRED').length,i=Math.max(0,ms.length-a-s-x),p1=pct(a,total),p2=p1+pct(s,total),p3=p2+pct(x,total);
    return`<div class="v242-donut" style="background:conic-gradient(var(--green) 0 ${p1}%,var(--amber) ${p1}% ${p2}%,var(--red) ${p2}% ${p3}%,var(--muted) ${p3}% 100%)"><div><b>${ms.length}</b><span>members</span></div></div><div class="v242-legend"><span><i class="g"></i>Active <b>${a}</b></span><span><i class="a"></i>Soon <b>${s}</b></span><span><i class="r"></i>Expired <b>${x}</b></span><span><i class="n"></i>Inactive <b>${i}</b></span></div>`;
  }
  function lastPaid(m){return paidFor(m.id).sort((a,b)=>String(b.transaction_at||b.payment_date||'').localeCompare(String(a.transaction_at||a.payment_date||'')))[0]||null}
  function memberCard(m){
    const st=stat(m),last=lastPaid(m),lifetime=paidFor(m.id).reduce((a,p)=>a+Number(p.amount||0),0),eligible=['ACTIVE','EXPIRING SOON'].includes(st.label)&&!st.paused;
    return`<article class="v242-member-card glass-analytics-card" data-status="${E(st.label)}">
      <div class="v242-member-head">${avatar(m)}<div class="v242-member-id"><button class="link-btn v242-name" onclick="openMemberProfile('${m.id}')">${E(m.full_name)}</button><span>${E(m.member_code)}</span><div class="v242-badges">${typeof pill==='function'?pill(m):''}${st.paused?'<span class="pill pause">PAUSED</span>':''}</div></div>${miniRing(m)}</div>
      <div class="v242-member-stats"><div><span>Plan</span><b>${E(m.current_plan_name||'No plan')}</b></div><div><span>Lifetime paid</span><b>${cash(lifetime)}</b></div><div><span>B&R wins</span><b>🏆 ${Number(m.break_run_wins||0)}</b></div></div>
      ${lifecycleBar(m)}
      <div class="v242-life-notes"><span>◉ Joined ${fmt(m.registered_at)}</span><span>◆ ${last?`Last payment ${fmt(last.payment_date)}`:'No payment yet'}</span>${st.paused?`<span>⏸ Hold until ${fmt(m.break_run_pause_until)}</span>`:''}</div>
      <div class="v242-card-actions"><button class="btn small primary" onclick="openMemberProfile('${m.id}')">Profile</button><button class="btn small" onclick="openCard('${m.id}')">Card</button><button class="btn small perk" ${eligible?'':'disabled'} onclick="breakRunWinner('${m.id}')">🏆 B&R</button><button class="btn small" onclick="resetMemberPin('${m.id}')">PIN</button><button class="btn small" onclick="archiveMember('${m.id}')">Archive</button><button class="btn small danger" onclick="deleteMember('${m.id}')">Delete</button></div>
    </article>`;
  }
  function filteredMembers(){
    let rows=[...(data?.members||[])],q=UX.q.trim().toLowerCase();
    if(q)rows=rows.filter(m=>[m.full_name,m.member_code,m.phone,m.email,m.current_plan_name].some(v=>String(v||'').toLowerCase().includes(q)));
    if(UX.status!=='all')rows=rows.filter(m=>UX.status==='paused'?!!m.perk_paused:activeLabel(m)===UX.status);
    if(UX.plan!=='all')rows=rows.filter(m=>String(m.current_plan_name||'')===UX.plan);
    if(UX.winner==='yes')rows=rows.filter(m=>Number(m.break_run_wins||0)>0);if(UX.winner==='no')rows=rows.filter(m=>Number(m.break_run_wins||0)===0);
    if(UX.from)rows=rows.filter(m=>String(m.registered_at||'').slice(0,10)>=UX.from);if(UX.to)rows=rows.filter(m=>String(m.registered_at||'').slice(0,10)<=UX.to);
    const mult=UX.dir==='asc'?1:-1;rows.sort((a,b)=>{let av,bv;if(UX.sort==='name'){av=a.full_name||'';bv=b.full_name||''}else if(UX.sort==='expiry'){av=a.expiry_date||'';bv=b.expiry_date||''}else if(UX.sort==='registered'){av=a.registered_at||'';bv=b.registered_at||''}else{av=Number(stat(a).days??999999);bv=Number(stat(b).days??999999)}return(av>bv?1:av<bv?-1:0)*mult});return rows;
  }
  function memberFilters(ms){
    const plans=[...new Set(ms.map(m=>m.current_plan_name).filter(Boolean))];
    const chips=[['all','All'],['ACTIVE','Active'],['EXPIRING SOON','Expiring'],['paused','Paused'],['EXPIRED','Expired']];
    return`<div class="v242-filter-shell glass-analytics-card"><div class="v242-search"><span>⌕</span><input id="v242MemberSearch" value="${E(UX.q)}" placeholder="Search member, ID, phone, plan…" oninput="v242Search(this.value)"></div><div class="v242-filter-chips">${chips.map(([v,l])=>`<button class="${UX.status===v?'active':''}" onclick="setV242Status('${v}')">${l}</button>`).join('')}</div><select class="v242-select" onchange="setV242Filter('plan',this.value)"><option value="all">All plans</option>${plans.map(p=>`<option ${UX.plan===p?'selected':''}>${E(p)}</option>`).join('')}</select><details class="v242-advanced"><summary>More filters</summary><div class="v242-advanced-grid"><label>Break & Run<select onchange="setV242Filter('winner',this.value)"><option value="all">All</option><option value="yes" ${UX.winner==='yes'?'selected':''}>Winner</option><option value="no" ${UX.winner==='no'?'selected':''}>No win</option></select></label><label>Registered from<input type="date" value="${E(UX.from)}" onchange="setV242Filter('from',this.value)"></label><label>To<input type="date" value="${E(UX.to)}" onchange="setV242Filter('to',this.value)"></label><label>Sort<select onchange="setV242Filter('sort',this.value)"><option value="name">Name</option><option value="expiry" ${UX.sort==='expiry'?'selected':''}>Expiry</option><option value="registered" ${UX.sort==='registered'?'selected':''}>Registered</option><option value="days" ${UX.sort==='days'?'selected':''}>Days left</option></select></label><label>Order<select onchange="setV242Filter('dir',this.value)"><option value="asc">Ascending</option><option value="desc" ${UX.dir==='desc'?'selected':''}>Descending</option></select></label></div></details></div>`;
  }

  window.v242Search=v=>{UX.q=String(v||'');UX.page=1;clearTimeout(UX.searchTimer);UX.searchTimer=setTimeout(()=>{render();setTimeout(()=>{const el=document.querySelector('#v242MemberSearch');if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length)}},0)},170)};
  window.setV242Status=v=>{UX.status=v;UX.page=1;render()};
  window.setV242Filter=(k,v)=>{UX[k]=v;UX.page=1;render()};
  window.setMemberFilter=v=>{UX.status=v||'all';UX.page=1;page='members';render()};
  window.v242Page=d=>{UX.page=Math.max(1,UX.page+d);render()};

  membersView=function(){
    const ms=data?.members||[],rows=filteredMembers(),active=ms.filter(m=>activeLabel(m)==='ACTIVE').length,soon=ms.filter(m=>activeLabel(m)==='EXPIRING SOON').length,paused=ms.filter(m=>m.perk_paused).length,totalPaid=(data?.payments||[]).filter(p=>p.payment_status==='Paid'&&ms.some(m=>m.id===p.member_id)).reduce((a,p)=>a+Number(p.amount||0),0),pages=Math.max(1,Math.ceil(rows.length/UX.pageSize));if(UX.page>pages)UX.page=pages;const shown=rows.slice((UX.page-1)*UX.pageSize,UX.page*UX.pageSize);
    return`<section class="v242-page"><div class="v242-hero"><div><span class="v242-eyebrow">MEMBERSHIP COMMAND CENTRE</span><h2>People, status & lifecycle</h2><p>Recognise members instantly, understand subscription health and open full history in one click.</p></div><button class="btn primary" onclick="openMemberModal()">＋ Register Member</button></div>
      <div class="v242-kpi-row"><div class="v242-kpi cyan"><span>👥</span><div><small>Total members</small><b>${ms.length}</b></div></div><div class="v242-kpi green"><span>✓</span><div><small>Active</small><b>${active}</b></div></div><div class="v242-kpi amber"><span>◷</span><div><small>Expiring soon</small><b>${soon}</b></div></div><div class="v242-kpi violet"><span>Ⅱ</span><div><small>Paused</small><b>${paused}</b></div></div><div class="v242-kpi blue"><span>₦</span><div><small>Member revenue</small><b>${cash(totalPaid)}</b></div></div></div>
      <div class="v242-analytics-pair"><div class="glass-analytics-card v242-analytics-card"><div class="v242-card-title"><div><small>STATUS MIX</small><h3>Membership health</h3></div></div><div class="v242-status-visual">${statusDonut(ms)}</div></div><div class="glass-analytics-card v242-analytics-card"><div class="v242-card-title"><div><small>PLAN MIX</small><h3>Subscriptions at a glance</h3></div></div><div class="v242-plan-bars">${planBreakdown(ms)||'<div class="empty">No plans yet.</div>'}</div></div></div>
      ${memberFilters(ms)}
      <div class="v242-section-head"><div><h3>Member gallery</h3><p>${rows.length} matching · page ${UX.page} of ${pages}</p></div><div class="v242-page-actions"><button class="btn small" onclick="document.getElementById('csvFile').click()">Import CSV</button><button class="btn small" onclick="exportCsv()">Export CSV</button></div></div>
      <div class="v242-member-grid">${shown.length?shown.map(memberCard).join(''):'<div class="empty glass-analytics-card">No members match these filters.</div>'}</div>
      <div class="pagination"><button class="btn" ${UX.page<=1?'disabled':''} onclick="v242Page(-1)">← Previous</button><span>${UX.page} / ${pages}</span><button class="btn" ${UX.page>=pages?'disabled':''} onclick="v242Page(1)">Next →</button></div>
      <input id="csvFile" class="v242-hidden-file" type="file" accept=".csv,text/csv" onchange="importCsv()">
    </section>`;
  };

  function monthSeries(ps,n=6){
    const out=[],d=new Date();d.setDate(1);for(let i=n-1;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1),key=`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`,val=ps.filter(p=>String(p.payment_date||'').startsWith(key)).reduce((a,p)=>a+Number(p.amount||0),0);out.push({key,label:x.toLocaleDateString('en-GB',{month:'short'}),value:val})}return out;
  }
  function barChart(items,format=cash){const max=Math.max(1,...items.map(x=>x.value));return`<div class="v242-mini-chart">${items.map(x=>`<div class="v242-mini-col" title="${E(x.label)}: ${E(format(x.value))}"><b>${x.value?E(format(x.value)):''}</b><div><i style="height:${Math.max(5,pct(x.value,max))}%"></i></div><span>${E(x.label)}</span></div>`).join('')}</div>`}
  function paymentAvatar(p){const m=member(p.member_id);return avatar(m||{full_name:p.d12_membership_members?.full_name},'v242-avatar pay')}
  function paymentCard(p){
    const m=member(p.member_id),name=m?.full_name||p.d12_membership_members?.full_name||'Unknown member',plan=p.d12_membership_plans?.name||'—',paid=p.payment_status==='Paid',pending=p.payment_status==='Pending';
    return`<article class="v242-payment-card glass-analytics-card">${paymentAvatar(p)}<div class="v242-payment-main"><div class="v242-payment-title"><div><button class="link-btn v242-name" ${m?`onclick="openMemberProfile('${m.id}')"`:''}>${E(name)}</button><span>${E(p.receipt_number||'Pending receipt')}</span></div><b>${cash(p.amount)}</b></div><div class="v242-payment-meta"><span>◈ ${E(plan)}</span><span>◷ ${fmt(p.payment_date)}</span><span>▣ ${E(p.payment_method||'—')}</span>${p.reference?`<span># ${E(p.reference)}</span>`:''}</div></div><div class="v242-payment-status"><span class="v242-pay-pill ${paid?'paid':pending?'pending':'rejected'}">${E(p.payment_status)}</span>${pending?`<div class="v242-pending-actions"><input id="act-${p.id}" type="date" value="${typeof today==='function'?today():''}" class="compact-date"><button class="btn small good" onclick="verifyPayment('${p.id}')">Verify</button><button class="btn small danger" onclick="rejectPayment('${p.id}')">Reject</button></div>`:`<button class="btn small" onclick="showReceipt('${p.id}')">Receipt</button>`}</div></article>`;
  }
  paymentsView=function(){
    const ps=data?.payments||[],paid=ps.filter(p=>p.payment_status==='Paid'),pending=ps.filter(p=>p.payment_status==='Pending'),now=new Date(),ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`,monthPaid=paid.filter(p=>String(p.payment_date||'').startsWith(ym)),total=paid.reduce((a,p)=>a+Number(p.amount||0),0),month=monthPaid.reduce((a,p)=>a+Number(p.amount||0),0),avg=paid.length?Math.round(total/paid.length):0,plans=(data?.plans||[]).filter(p=>p.active&&p.price),ms=data?.members||[],series=monthSeries(paid),methods=[...new Set(paid.map(p=>p.payment_method||'Other'))].map(k=>({label:k,value:paid.filter(p=>(p.payment_method||'Other')===k).reduce((a,p)=>a+Number(p.amount||0),0)})).sort((a,b)=>b.value-a.value),methodMax=Math.max(1,...methods.map(x=>x.value));
    return`<section class="v242-page"><div class="v242-hero"><div><span class="v242-eyebrow">FINANCIAL PULSE</span><h2>Payments & receipts</h2><p>Track revenue, verify pending payments and recognise each member at a glance.</p></div><button class="btn" onclick="downloadPaymentStatement()">⇩ Statement CSV</button></div>
      <div class="v242-kpi-row"><div class="v242-kpi blue"><span>₦</span><div><small>Verified revenue</small><b>${cash(total)}</b></div></div><div class="v242-kpi green"><span>↗</span><div><small>This month</small><b>${cash(month)}</b></div></div><div class="v242-kpi amber"><span>◷</span><div><small>Pending</small><b>${pending.length}</b></div></div><div class="v242-kpi violet"><span>≈</span><div><small>Average payment</small><b>${cash(avg)}</b></div></div></div>
      <div class="v242-analytics-pair"><div class="glass-analytics-card v242-analytics-card"><div class="v242-card-title"><div><small>6-MONTH REVENUE</small><h3>Revenue pulse</h3></div></div>${barChart(series)}</div><div class="glass-analytics-card v242-analytics-card"><div class="v242-card-title"><div><small>PAYMENT CHANNELS</small><h3>Method distribution</h3></div></div><div class="v242-plan-bars">${methods.length?methods.map(x=>`<div class="v242-bar-row"><span>${E(x.label)}</span><div><i style="width:${pct(x.value,methodMax)}%"></i></div><b>${cash(x.value)}</b></div>`).join(''):'<div class="empty">No verified payments yet.</div>'}</div></div></div>
      <div class="glass-analytics-card v242-payment-entry"><div class="v242-card-title"><div><small>NEW TRANSACTION</small><h3>Record payment</h3></div></div><form id="paymentForm"><div class="v242-form-grid"><label>Member<select name="member_id" required><option value="">Select member</option>${ms.map(m=>`<option value="${m.id}">${E(m.full_name)} — ${E(m.member_code)}</option>`).join('')}</select></label><label>Plan<select name="plan_id" required><option value="">Select plan</option>${plans.map(p=>`<option value="${p.id}">${E(p.name)} — ${cash(p.price)}</option>`).join('')}</select></label><label>Amount<input name="amount" type="number" min="1" required></label><label>Date<input name="payment_date" type="date" value="${typeof today==='function'?today():''}"></label><label>Method<select name="payment_method"><option>Transfer</option><option>Cash</option><option>POS</option><option>Other</option></select></label><label>Reference<input name="reference" placeholder="Optional"></label></div><button class="btn primary">Record as Pending</button></form></div>
      <div class="v242-section-head"><div><h3>Transaction stream</h3><p>Newest activity first · click member names for lifecycle history.</p></div></div><div class="v242-payment-list">${ps.length?ps.map(paymentCard).join(''):'<div class="empty glass-analytics-card">No payments recorded yet.</div>'}</div>
    </section>`;
  };

  function lastContact(id){return(data?.contacts||[]).filter(c=>c.member_id===id).sort((a,b)=>String(b.contacted_at||'').localeCompare(String(a.contacted_at||'')))[0]||null}
  function renewalCard(m){
    const st=stat(m),c=lastContact(m.id),days=Number(st.days??0),tone=st.label==='EXPIRED'?'critical':days<=3?'urgent':days<=7?'soon':'calm';
    return`<article class="v242-renewal-card glass-analytics-card ${tone}"><div class="v242-renewal-head">${avatar(m)}<div><button class="link-btn v242-name" onclick="openMemberProfile('${m.id}')">${E(m.full_name)}</button><span>${E(m.member_code)} · ${E(m.current_plan_name||'No plan')}</span>${typeof pill==='function'?pill(m):''}</div>${miniRing(m,68)}</div><div class="v242-renewal-line"><span>Expiry</span><b>${fmt(m.expiry_date)}</b></div><div class="v242-renewal-line"><span>Last contact</span><b>${c?`${fmt(c.contacted_at)} · ${E(c.channel)}`:'Never contacted'}</b></div><div class="v242-renewal-actions"><button class="btn small good" onclick="contactRenewal('${m.id}','WhatsApp')">◉ WhatsApp</button><button class="btn small" onclick="contactRenewal('${m.id}','SMS')">✉ SMS</button><button class="btn small" onclick="contactRenewal('${m.id}','Email')">@ Email</button><button class="btn small" onclick="openMemberProfile('${m.id}')">History</button></div></article>`;
  }
  window.setRenewalDays=n=>{UX.renewalDays=Number(n);render()};
  renewalsView=function(){
    const ms=data?.members||[],expired=ms.filter(m=>activeLabel(m)==='EXPIRED'),due3=ms.filter(m=>activeLabel(m)!=='EXPIRED'&&Number(stat(m).days)>=0&&Number(stat(m).days)<=3),due7=ms.filter(m=>activeLabel(m)!=='EXPIRED'&&Number(stat(m).days)>3&&Number(stat(m).days)<=7),due30=ms.filter(m=>activeLabel(m)!=='EXPIRED'&&Number(stat(m).days)>7&&Number(stat(m).days)<=30),rows=ms.filter(m=>activeLabel(m)==='EXPIRED'||(Number.isFinite(Number(stat(m).days))&&Number(stat(m).days)<=UX.renewalDays)).sort((a,b)=>Number(stat(a).days??999)-Number(stat(b).days??999)),total=Math.max(1,expired.length+due3.length+due7.length+due30.length),contacted=rows.filter(m=>!!lastContact(m.id)).length;
    return`<section class="v242-page"><div class="v242-hero"><div><span class="v242-eyebrow">RENEWAL CONTROL</span><h2>Retention & outreach</h2><p>See urgency visually, recognise members by photo and contact them without digging through tables.</p></div><div class="v242-horizon">${[3,7,14,30].map(n=>`<button class="${UX.renewalDays===n?'active':''}" onclick="setRenewalDays(${n})">${n}d</button>`).join('')}</div></div>
      <div class="v242-kpi-row"><div class="v242-kpi red"><span>!</span><div><small>Expired</small><b>${expired.length}</b></div></div><div class="v242-kpi orange"><span>3</span><div><small>Due ≤3 days</small><b>${due3.length}</b></div></div><div class="v242-kpi amber"><span>7</span><div><small>Due 4–7 days</small><b>${due7.length}</b></div></div><div class="v242-kpi cyan"><span>30</span><div><small>Due 8–30 days</small><b>${due30.length}</b></div></div><div class="v242-kpi green"><span>✓</span><div><small>Contacted in view</small><b>${contacted}/${rows.length}</b></div></div></div>
      <div class="glass-analytics-card v242-renewal-pipeline"><div class="v242-card-title"><div><small>RISK PIPELINE</small><h3>Renewal urgency</h3></div><span>${rows.length} in current ${UX.renewalDays}-day view</span></div><div class="v242-stack"><i class="expired" style="width:${pct(expired.length,total)}%"></i><i class="d3" style="width:${pct(due3.length,total)}%"></i><i class="d7" style="width:${pct(due7.length,total)}%"></i><i class="d30" style="width:${pct(due30.length,total)}%"></i></div><div class="v242-stack-labels"><span>■ Expired</span><span>■ ≤3d</span><span>■ 4–7d</span><span>■ 8–30d</span></div></div>
      <div class="v242-section-head"><div><h3>Members requiring attention</h3><p>Sorted by urgency · use History to view the full membership lifecycle.</p></div></div><div class="v242-renewal-grid">${rows.length?rows.map(renewalCard).join(''):'<div class="empty glass-analytics-card">No members need renewal attention in this window.</div>'}</div>
    </section>`;
  };

  document.documentElement.dataset.d12Version=VERSION;
})();
