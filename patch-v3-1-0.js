/* D12 Membership V3.1.0 — shared PlayersTurn identity */
(function(){
  const VERSION='3.1.0';
  const ID_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-membership-player-identity';
  const identity={registry:[],my:null,loaded:false,loading:null};
  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const canRegister=()=>typeof role!=='undefined'&&(role==='admin'||role==='user'||(role==='staff'&&!!data?.staff?.permissions?.register_members));
  const isAdmin=()=>typeof role!=='undefined'&&role==='admin';
  const memberById310=id=>(data?.members||[]).find(m=>m.id===id)||(data?.archived_members||[]).find(m=>m.id===id)||(data?.member?.id===id?data.member:null);
  const identityForMember=id=>identity.my?.member_id===id?identity.my:identity.registry.find(p=>p.member_id===id)||null;
  const unlinkedPlayers=()=>identity.registry.filter(p=>!p.member_id);
  const linkedMemberIds=()=>new Set(identity.registry.filter(p=>p.member_id).map(p=>p.member_id));

  async function identityRequest(action,payload={},useAuth=true){
    const r=await fetch(ID_API,{method:'POST',headers:{'Content-Type':'application/json',...(useAuth&&typeof token!=='undefined'&&token?{'Authorization':'Bearer '+token}:{})},body:JSON.stringify({action,...payload})});
    const j=await r.json().catch(()=>({ok:false,error:'Invalid shared identity response.'}));
    if(!r.ok||!j.ok)throw new Error(j.error||'Shared D12 identity request failed.');
    return j;
  }
  window.d12IdentityRequest=identityRequest;

  function mergeIdentity(){
    if(!data)return;
    for(const m of (data.members||[])){
      const p=identityForMember(m.id);m.player_identity=p||null;
      if(p){m.member_code=p.player_code||m.member_code;m.full_name=p.full_name||m.full_name;m.phone=p.phone||m.phone}
    }
    if(data.member){
      const p=identity.my||identityForMember(data.member.id);data.member.player_identity=p||null;
      if(p){data.member.member_code=p.player_code||data.member.member_code;data.member.full_name=p.full_name||data.member.full_name;data.member.phone=p.phone||data.member.phone}
    }
  }
  async function loadIdentity(force=false){
    if(typeof role==='undefined'||!role||!data)return false;
    if(!force&&identity.loaded)return true;
    if(identity.loading)return identity.loading;
    identity.loading=(async()=>{
      try{
        if(role==='member'){
          const j=await identityRequest('my_identity');
          identity.my=j.player||null;identity.registry=identity.my?[identity.my]:[];
        }else if(['admin','staff','user'].includes(role)){
          const j=await identityRequest('registry');
          identity.registry=Array.isArray(j.players)?j.players:[];identity.my=null;
        }else return false;
        identity.loaded=true;mergeIdentity();return true;
      }catch(e){console.warn('D12 shared identity unavailable',e);return false}
      finally{identity.loading=null}
    })();
    return identity.loading;
  }
  window.refreshD12Identity=async()=>{identity.loaded=false;const ok=await loadIdentity(true);if(ok&&typeof render==='function')render()};

  /* Member login now follows PlayersTurn identity: D12P ID + registered WhatsApp / phone. */
  if(typeof chooseLogin==='function'){
    const priorChooseLogin=chooseLogin;
    chooseLogin=function(kind){
      if(kind!=='member')return priorChooseLogin(kind);
      const p=document.querySelector('#loginPanel');p.classList.remove('hidden');
      p.innerHTML=`<div class="login-head"><div><h2>Member Login</h2><p>Use the same Player ID and WhatsApp / phone registered in PlayersTurn.</p></div><button class="icon-btn" type="button" onclick="closeLoginPanel()">×</button></div>
        <div class="v310-login-tabs"><button id="v310SharedTab" class="active" type="button">PlayersTurn Login</button><button id="v310LegacyTab" type="button">Legacy Login</button></div>
        <form id="v310SharedLoginForm">
          <div class="field"><label>D12 PLAYER ID</label><input name="player_code" placeholder="D12P-100001" autocomplete="username" autocapitalize="characters" required autofocus></div>
          <div class="field"><label>REGISTERED WHATSAPP / PHONE</label><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="080XXXXXXXX" required></div>
          <button class="btn good block">View My Membership</button><div id="loginError" class="error"></div>
          <div class="v310-login-note">One D12 identity across <b>PlayersTurn</b> and <b>Membership</b>.</div>
        </form>
        <form id="v310LegacyLoginForm" class="hidden">
          <div class="notice">Legacy access is retained for older membership records that have not yet been linked to a PlayersTurn profile.</div>
          <div class="field"><label>LEGACY MEMBERSHIP ID</label><input name="member_code" placeholder="D12-2026-123456" required></div>
          <div class="field"><label>LEGACY MEMBER PIN</label><input name="pin" type="password" inputmode="numeric" required></div>
          <button class="btn block">Use Legacy Login</button><div id="legacyLoginError" class="error"></div>
        </form>`;
      const shared=document.querySelector('#v310SharedLoginForm'),legacy=document.querySelector('#v310LegacyLoginForm'),st=document.querySelector('#v310SharedTab'),lt=document.querySelector('#v310LegacyTab');
      const mode=x=>{const a=x==='shared';shared.classList.toggle('hidden',!a);legacy.classList.toggle('hidden',a);st.classList.toggle('active',a);lt.classList.toggle('active',!a);(a?shared:legacy).querySelector('input')?.focus()};
      st.addEventListener('click',()=>mode('shared'));lt.addEventListener('click',()=>mode('legacy'));
      shared.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),err=document.querySelector('#loginError');err.textContent='';const btn=e.currentTarget.querySelector('button');btn.disabled=true;btn.textContent='Signing in…';try{const j=await identityRequest('member_login',{player_code:f.get('player_code'),phone:f.get('phone')},false);saveSession(j);identity.my=j.player||null;identity.loaded=!!j.player;await enterApp()}catch(x){err.textContent=x.message}finally{if(btn.isConnected){btn.disabled=false;btn.textContent='View My Membership'}}});
      legacy.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),err=document.querySelector('#legacyLoginError');err.textContent='';try{const j=await request('member_login',{member_code:f.get('member_code'),pin:f.get('pin')},false);saveSession(j);identity.loaded=false;await enterApp()}catch(x){err.textContent=x.message}});
      setTimeout(()=>shared.querySelector('[name=player_code]')?.focus(),50);p.scrollIntoView({behavior:'smooth',block:'nearest'});
    };
  }

  if(typeof enterApp==='function'){
    const priorEnter=enterApp;
    enterApp=async function(){const out=await priorEnter.apply(this,arguments);identity.loaded=false;await loadIdentity(true);if(typeof render==='function')render();return out};
  }
  if(typeof refresh==='function'){
    const priorRefresh=refresh;
    refresh=async function(){const out=await priorRefresh.apply(this,arguments);identity.loaded=false;await loadIdentity(true);return out};
  }

  function playerOptions(selected=''){
    const rows=unlinkedPlayers().slice().sort((a,b)=>String(a.player_code).localeCompare(String(b.player_code)));
    return rows.map(p=>`<option value="${E(p.id)}" ${selected===p.id?'selected':''}>${E(p.player_code)} — ${E(p.full_name)} — ${E(p.phone||'NO WHATSAPP')}</option>`).join('');
  }
  function registrationMarkup(){
    const available=unlinkedPlayers();
    return `<div class="modal-head"><div><h2>Register Membership</h2><p class="muted">Membership now uses the existing PlayersTurn identity. No second Member ID will be created.</p></div><button class="icon-btn" type="button" onclick="closeModal('memberModal')">×</button></div>
      <div class="v310-identity-banner"><span>◎</span><div><b>PlayersTurn is the identity registry</b><small>Select the player below. Their D12P ID, registered WhatsApp number and profile identity will become their Membership login and card identity.</small></div></div>
      <form id="v310RegisterMembership">
        <div class="field"><label>PLAYERSTURN PROFILE *</label><select name="player_id" required><option value="">Select Player ID / name</option>${playerOptions()}</select></div>
        <div class="notice">If a player is not listed, register/update the player in <b>PlayersTurn</b> first. A registered WhatsApp / phone number is required for shared login.</div>
        <button class="btn primary block" ${available.length?'':'disabled'}>Create Membership Profile</button>
      </form>`;
  }
  window.openMemberModal=async function(){
    if(!canRegister())return typeof toast==='function'&&toast('Member registration permission required.');
    if(!identity.loaded)await loadIdentity(true);
    const modal=document.querySelector('#memberModal'),card=modal?.querySelector('.modal-card');if(!modal||!card)return;
    card.innerHTML=registrationMarkup();modal.classList.remove('hidden');
    document.querySelector('#v310RegisterMembership')?.addEventListener('submit',async e=>{
      e.preventDefault();const f=new FormData(e.currentTarget),btn=e.currentTarget.querySelector('button');btn.disabled=true;btn.textContent='Linking PlayersTurn identity…';
      try{
        const j=await identityRequest('link_player',{player_id:f.get('player_id')});
        closeModal('memberModal');await refresh();if(typeof playD12Sound==='function')playD12Sound('member');toast(`${j.member.full_name} registered with Player ID ${j.player.player_code}.`);openCard(j.member.id);
      }catch(x){toast(x.message);btn.disabled=false;btn.textContent='Create Membership Profile'}
    });
  };

  function identityCentre(){
    if(!isAdmin())return '';
    if(!identity.loaded){queueMicrotask(()=>loadIdentity(true).then(ok=>{if(ok&&typeof page!=='undefined'&&page==='members'&&typeof render==='function')render()}));return '<div class="card section"><h3>PlayersTurn Identity</h3><p class="muted">Loading identity links…</p></div>'}
    const linked=linkedMemberIds(),legacy=(data?.members||[]).filter(m=>!linked.has(m.id));
    return `<section class="v310-link-centre"><div class="v310-link-head"><div><span>SHARED D12 IDENTITY</span><h3>PlayersTurn Identity Links</h3><p>${linked.size} membership profile${linked.size===1?'':'s'} linked · ${legacy.length} legacy profile${legacy.length===1?'':'s'} still require review.</p></div><button class="btn" onclick="openMemberModal()">＋ Membership from PlayersTurn</button></div>${legacy.length?`<div class="v310-legacy-list">${legacy.map(m=>`<article><div><b>${E(m.full_name)}</b><small>Legacy ID · ${E(m.member_code)}</small></div><button class="btn small primary" onclick="linkLegacyMember310('${m.id}')">Link Player ID</button></article>`).join('')}</div>`:'<div class="v310-all-linked">✓ All current membership profiles are linked to PlayersTurn identities.</div>'}</section>`;
  }
  if(typeof membersView==='function'){
    const priorMembersView=membersView;
    membersView=function(){
      const html=priorMembersView.apply(this,arguments);
      const cleaned=String(html).replace('<button class="btn small" onclick="document.getElementById(\'csvFile\').click()">Import CSV</button>','');
      return identityCentre()+cleaned;
    };
  }
  window.linkLegacyMember310=async function(memberId){
    if(!isAdmin())return toast('Admin access required.');
    if(!identity.loaded)await loadIdentity(true);
    const m=memberById310(memberId),rows=unlinkedPlayers().filter(p=>p.has_phone);
    if(!m)return toast('Membership record not found.');
    let modal=document.querySelector('#v24Modal');
    if(!modal&&typeof ensureV24Modal==='function'){ensureV24Modal();modal=document.querySelector('#v24Modal')}
    if(!modal)return toast('Link dialog unavailable.');
    const title=modal.querySelector('#v24ModalTitle'),body=modal.querySelector('#v24ModalBody');title.textContent='Link PlayersTurn Identity';
    body.innerHTML=`<div class="v310-identity-banner"><span>⇄</span><div><b>${E(m.full_name)}</b><small>Replace legacy identity ${E(m.member_code)} with the selected PlayersTurn Player ID. Subscription/payment history remains attached to this membership record.</small></div></div><form id="v310LinkLegacy"><div class="field"><label>PLAYERSTURN PROFILE</label><select name="player_id" required><option value="">Select Player ID / name</option>${rows.map(p=>`<option value="${E(p.id)}">${E(p.player_code)} — ${E(p.full_name)} — ${E(p.phone||'')}</option>`).join('')}</select></div><button class="btn primary">Confirm Identity Link</button></form>`;
    modal.classList.remove('hidden');
    body.querySelector('#v310LinkLegacy')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(!confirm(`Link ${m.full_name} to this PlayersTurn profile?\n\nThe D12P Player ID becomes the membership ID. Subscription and payment history are preserved.`))return;try{const j=await identityRequest('link_player',{player_id:f.get('player_id'),membership_id:memberId});modal.classList.add('hidden');await refresh();toast(`Linked to ${j.player.player_code}.`)}catch(x){toast(x.message)}});
  };

  /* Linked profile identity is managed from PlayersTurn. Membership-specific contact fields remain editable here. */
  if(typeof window.openMemberProfile==='function'){
    const priorProfile=window.openMemberProfile;
    window.openMemberProfile=function(id){
      const out=priorProfile.apply(this,arguments),p=identityForMember(id);
      if(p)setTimeout(()=>{
        const form=document.querySelector('#profileEditForm');if(!form)return;
        const name=form.querySelector('[name=full_name]'),phone=form.querySelector('[name=phone]');if(name)name.readOnly=true;if(phone)phone.readOnly=true;
        const photo=document.querySelector('#profilePhotoInput'),photoLabel=photo?.closest('label');if(photoLabel)photoLabel.style.display='none';
        const note=document.createElement('div');note.className='v310-managed-note';note.innerHTML=`<b>◎ PlayersTurn identity</b><span>Player ID ${E(p.player_code)} · Name, WhatsApp number and profile photo are managed in PlayersTurn and synchronized here.</span>`;form.prepend(note);
      },40);
      return out;
    };
  }

  function enhanceCard310(id){
    const m=memberById310(id),p=identityForMember(id),card=document.querySelector('#printCard');if(!m||!p?.qr_token||!card)return;
    const live=location.origin+location.pathname+'?player='+encodeURIComponent(p.qr_token);
    const idLine=card.querySelector('.mc-id');if(idLine)idLine.textContent='PLAYER ID · '+p.player_code;
    const link=card.querySelector('.membership-code-link')||card.querySelector('.barcode-box')?.closest('a');
    if(link){link.href=live;link.target='_blank'}
    const codeLabel=card.querySelector('.code128-panel .code-label');if(codeLabel)codeLabel.textContent='CODE 128 · SHARED D12 PLAYER CARD';
    const qrLabel=card.querySelector('.qr-code-panel .code-label');if(qrLabel)qrLabel.textContent='QR · SHARED D12 PLAYER CARD';
    const qrSmall=card.querySelector('.qr-code-panel small');if(qrSmall)qrSmall.textContent='Open live membership status';
    const foot=card.querySelector('.mc-foot');if(foot)foot.textContent='ONE D12 PLAYER ID · PLAYERSTURN + MEMBERSHIP';
    if(window.JsBarcode){try{JsBarcode('#memberBarcode','D12PLAYER:'+p.qr_token,{format:'CODE128',displayValue:false,height:54,width:1.3,margin:0,background:'#fff',lineColor:'#000'})}catch(e){console.warn(e)}}
    const mount=card.querySelector('#memberQrCode');if(mount&&window.QRCode){mount.innerHTML='';try{new QRCode(mount,{text:live,width:132,height:132,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M})}catch(e){console.warn(e)}}
    const openLink=document.querySelector('#cardMount .row a.btn');if(openLink)openLink.href=live;
  }
  if(typeof openCard==='function'){
    const priorOpenCard=openCard;
    openCard=function(id){const out=priorOpenCard.apply(this,arguments);setTimeout(()=>enhanceCard310(id),190);return out};
  }

  function parseScan310(raw){
    const v=String(raw||'').trim();
    if(/^D12PLAYER:/i.test(v))return{kind:'shared',token:v.replace(/^D12PLAYER:/i,'').trim()};
    try{const u=new URL(v);const p=u.searchParams.get('player');if(p)return{kind:'shared',token:p};const c=u.searchParams.get('card');if(c)return{kind:'legacy',token:c}}catch{}
    if(/^D12M:/i.test(v))return{kind:'legacy',token:v.replace(/^D12M:/i,'').trim()};
    if(/^[a-f0-9]{30,}$/i.test(v)&&!v.includes('-'))return{kind:'shared',token:v};
    return{kind:'legacy',token:v};
  }
  async function scanLookup310(raw){
    const parsed=parseScan310(raw);if(!parsed.token)throw new Error('No D12 membership card token found.');
    return parsed.kind==='shared'?identityRequest('card_status',{qr_token:parsed.token},false):request('card_status',{card_token:parsed.token},false);
  }
  if(typeof scanCard==='function'){
    scanCard=async function(e){e.preventDefault();const input=document.querySelector('#scanInput'),raw=input?.value||'';try{const j=await scanLookup310(raw);document.querySelector('#scanResult').innerHTML=cardStatusHtml(j.member,j.daily_rate);if(input){input.value='';input.focus()}if(typeof playD12Sound==='function')playD12Sound('scan')}catch(x){document.querySelector('#scanResult').innerHTML=`<div class="notice error">${E(x.message)}</div>`}};
  }
  let v310Camera=null;
  async function loadCamera310(){
    if(window.Html5Qrcode)return;
    await new Promise((resolve,reject)=>{const old=document.querySelector('script[data-d12-lib="camera"]');if(old){if(window.Html5Qrcode)return resolve();old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';s.async=true;s.dataset.d12Lib='camera';s.onload=resolve;s.onerror=()=>reject(new Error('Camera scanner library failed to load.'));document.head.appendChild(s)});
  }
  window.startCameraScanner=async function(){
    try{
      await loadCamera310();if(v310Camera)await v310Camera.stop().catch(()=>{});
      v310Camera=new Html5Qrcode('cameraReader');
      await v310Camera.start({facingMode:'environment'},{fps:10,qrbox:{width:280,height:180}},async decoded=>{await v310Camera.stop().catch(()=>{});const j=await scanLookup310(decoded);const host=document.querySelector('#scanResult');if(host)host.innerHTML=cardStatusHtml(j.member,j.daily_rate);if(typeof playD12Sound==='function')playD12Sound('scan')});
      toast('Camera active. Scan the D12 QR or Code 128.');
    }catch(e){toast('Camera could not scan card: '+e.message)}
  };
  window.stopCameraScanner=async()=>{if(v310Camera){await v310Camera.stop().catch(()=>{});v310Camera=null}};

  function memberIdentityBanner(){
    if(typeof role==='undefined'||role!=='member'||!data?.member)return '';
    const p=identity.my;
    return p?`<div class="v310-member-identity"><span>◎</span><div><small>SHARED D12 IDENTITY</small><b>${E(p.player_code)} · ${E(p.full_name)}</b><em>Use this Player ID and your registered WhatsApp / phone for both PlayersTurn and Membership.</em></div><a class="btn small" href="https://playersturn.d12cueclub.com/" target="_blank" rel="noopener">Open PlayersTurn</a></div>`:'<div class="notice">This legacy membership is not yet linked to a PlayersTurn profile. Ask D12 Admin to link your Player ID.</div>';
  }
  if(typeof memberPortalView==='function'){
    const priorPortal=memberPortalView;
    memberPortalView=function(){return memberIdentityBanner()+priorPortal.apply(this,arguments)};
  }

  async function showSharedPublic310(qr){
    const pub=document.querySelector('#publicStatus'),wel=document.querySelector('#welcome'),app=document.querySelector('#app');
    if(!pub)return;wel?.classList.add('hidden');app?.classList.add('hidden');pub.classList.remove('hidden');pub.innerHTML='<div class="public-box"><div class="card section">Checking shared D12 Player ID…</div></div>';
    try{const j=await identityRequest('card_status',{qr_token:qr},false);pub.innerHTML=`<div class="public-box">${cardStatusHtml(j.member,j.daily_rate)}<div class="v310-public-note">Verified through the shared D12 PlayersTurn identity.</div><a class="btn" href="${location.pathname}">Back to Login</a></div>`}catch(x){pub.innerHTML=`<div class="public-box"><div class="card section"><h2>Card Not Found</h2><p>${E(x.message)}</p></div><a class="btn" href="${location.pathname}">Back to Login</a></div>`}finally{app?.classList.add('hidden');wel?.classList.add('hidden')}
  }
  const sharedParam=new URLSearchParams(location.search).get('player');if(sharedParam)setTimeout(()=>showSharedPublic310(sharedParam),0);

  if(typeof render==='function'){
    const priorRender=render;
    render=function(){mergeIdentity();const out=priorRender.apply(this,arguments);document.documentElement.dataset.d12Version=VERSION;requestAnimationFrame(()=>document.querySelectorAll('.brand small').forEach(x=>x.textContent='Membership V3.1.0'));return out};
  }
  document.documentElement.dataset.d12Version=VERSION;
})();