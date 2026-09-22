/* D12 Cue Club Membership V2.3.2 — QR card + member status patch */
(function(){
  const VERSION='2.3.2';

  function memberStatusMarkup(m){
    if(!m)return '';
    const s=typeof statusOf==='function'?statusOf(m):{label:m.membership_status||'INACTIVE',days:m.days_remaining??null,cls:'inactive',paused:!!m.perk_paused};
    const plan=typeof esc==='function'?esc(m.current_plan_name||'Not active'):(m.current_plan_name||'Not active');
    const expiry=typeof esc==='function'?esc(m.expiry_date||'—'):(m.expiry_date||'—');
    const label=typeof esc==='function'?esc(s.label):s.label;
    const pause=s.paused?`<span class="pill pause">BREAK & RUN PAUSE</span>`:'';
    return `<div class="member-status-overview">
      <div class="member-status-primary"><span>CURRENT MEMBERSHIP STATUS</span><div><strong class="member-status-value ${s.cls}">${label}</strong>${pause}</div></div>
      <div class="member-status-stat"><span>PLAN</span><b>${plan}</b></div>
      <div class="member-status-stat"><span>DAYS REMAINING</span><b>${s.days??'—'}</b></div>
      <div class="member-status-stat"><span>EXPIRES</span><b>${expiry}</b></div>
    </div>`;
  }

  function enhanceMemberPortal(){
    if(typeof role==='undefined'||role!=='member'||typeof data==='undefined'||!data?.member)return;
    const hero=document.querySelector('#view .status-hero');
    if(!hero||hero.querySelector('.member-status-overview'))return;
    const logo=hero.querySelector('.portal-branding,.status-branding');
    if(logo)logo.insertAdjacentHTML('afterend',memberStatusMarkup(data.member));
    else hero.insertAdjacentHTML('afterbegin',memberStatusMarkup(data.member));
  }

  function enhanceMembershipCard(){
    const card=document.querySelector('#printCard');
    if(!card||card.querySelector('.qr-code-panel'))return;
    const barcodeBox=card.querySelector('.barcode-box');
    const link=barcodeBox?.closest('a');
    if(!barcodeBox||!link)return;

    link.classList.add('membership-code-link');
    link.setAttribute('aria-label','Open live D12 membership status');

    const barcodePanel=document.createElement('div');
    barcodePanel.className='code128-panel';
    const barcodeLabel=document.createElement('div');
    barcodeLabel.className='code-label';
    barcodeLabel.textContent='CODE 128 · DESK SCANNER';
    link.insertBefore(barcodePanel,barcodeBox);
    barcodePanel.appendChild(barcodeLabel);
    barcodePanel.appendChild(barcodeBox);

    const qrPanel=document.createElement('div');
    qrPanel.className='qr-code-panel';
    qrPanel.innerHTML='<div class="code-label">QR · PHONE CAMERA</div><div class="qr-code-box" id="memberQrCode"></div><small>Open live membership status</small>';
    link.appendChild(qrPanel);

    const mount=qrPanel.querySelector('#memberQrCode');
    if(typeof QRCode!=='undefined'){
      try{
        new QRCode(mount,{text:link.href,width:132,height:132,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
      }catch(e){
        console.error('D12 QR generation failed',e);
        mount.innerHTML='<span class="qr-fallback">QR unavailable</span>';
      }
    }else{
      mount.innerHTML='<span class="qr-fallback">QR unavailable</span>';
    }

    const foot=card.querySelector('.mc-foot');
    if(foot)foot.textContent='SCAN QR WITH A PHONE CAMERA OR USE CODE 128 WITH A BARCODE SCANNER';
  }

  if(typeof render==='function'){
    const previousRender=render;
    render=function(...args){
      const out=previousRender.apply(this,args);
      requestAnimationFrame(enhanceMemberPortal);
      return out;
    };
  }

  if(typeof openCard==='function'){
    const previousOpenCard=openCard;
    openCard=function(...args){
      const out=previousOpenCard.apply(this,args);
      setTimeout(enhanceMembershipCard,80);
      return out;
    };
  }

  const observer=new MutationObserver(()=>{
    enhanceMemberPortal();
    enhanceMembershipCard();
  });
  observer.observe(document.body,{childList:true,subtree:true});

  document.documentElement.dataset.d12Version=VERSION;
  enhanceMemberPortal();
})();
