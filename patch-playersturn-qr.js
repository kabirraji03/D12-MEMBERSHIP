// D12 Membership interoperability patch: QR points to the live membership-status webpage.
(function(){
  if(typeof openCard!=='function')return;
  const originalOpenCard=openCard;
  openCard=function(id,loginPin=null){
    originalOpenCard(id,loginPin);
    setTimeout(()=>{
      try{
        const pool=role==='member'?[data.member]:(data.members||[]),m=pool.find(x=>x.id===id);
        if(!m?.card_token||!window.QRCode)return;
        const live='https://membership.d12cueclub.com/?card='+encodeURIComponent(m.card_token);
        const card=document.querySelector('#printCard');if(!card||card.querySelector('.mc-live-qr'))return;
        const wrap=document.createElement('a');wrap.className='mc-live-qr';wrap.href=live;wrap.target='_blank';wrap.rel='noopener';wrap.innerHTML='<div id="memberLiveQr"></div><small>SCAN QR TO VERIFY LIVE MEMBERSHIP</small>';
        const foot=card.querySelector('.mc-foot');if(foot)card.insertBefore(wrap,foot);else card.appendChild(wrap);
        new QRCode(wrap.querySelector('#memberLiveQr'),{text:live,width:118,height:118,correctLevel:QRCode.CorrectLevel.M});
      }catch(e){console.error('D12 membership QR patch',e)}
    },120);
  };
})();
