/* D12 Membership V2.4 release hotfix: own-card member photo */
(function(){
  if(typeof openCard!=='function')return;
  const prior=openCard;
  openCard=function(id,...args){
    const selfMember=(typeof data!=='undefined'&&data?.member?.id===id)?data.member:null;
    const listed=(typeof data!=='undefined')?((data?.members||[]).find(x=>x.id===id)||(data?.archived_members||[]).find(x=>x.id===id)):null;
    const m=selfMember||listed;
    const out=prior(id,...args);
    setTimeout(()=>{
      const card=document.querySelector('#printCard');
      if(card&&m?.photo_data&&!card.querySelector('.mc-photo')){
        const img=document.createElement('img');
        img.className='mc-photo';img.src=m.photo_data;img.alt=m.full_name||'D12 member';
        const name=card.querySelector('.mc-name');
        if(name)name.insertAdjacentElement('beforebegin',img);else card.prepend(img);
      }
    },180);
    return out;
  };
})();
