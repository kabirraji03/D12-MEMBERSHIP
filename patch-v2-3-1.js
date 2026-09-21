/* D12 Cue Club Membership V2.3.1 branding patch */
(function(){
  const logoSrc=window.D12_LOGO_SRC||'';
  const logoHtml=(cls,alt='D12 Cue Club logo')=>`<img class="${cls}" data-d12-logo src="${logoSrc}" alt="${alt}">`;

  function hydrateLogos(root=document){
    root.querySelectorAll?.('[data-d12-logo]').forEach(img=>{if(logoSrc&&img.src!==logoSrc)img.src=logoSrc;});
  }

  function decoratePublicStatus(){
    document.querySelectorAll('#publicStatus .status-hero,#scanResult .status-hero').forEach(hero=>{
      if(!hero.querySelector('.status-branding'))hero.insertAdjacentHTML('afterbegin',`<div class="status-branding">${logoHtml('status-logo')}</div>`);
      hydrateLogos(hero);
    });
  }

  function addPortalLogo(){
    const hero=document.querySelector('#view .status-hero');
    if(hero&&role==='member'&&!hero.querySelector('.portal-branding')){
      hero.insertAdjacentHTML('afterbegin',`<div class="portal-branding">${logoHtml('portal-logo')}</div>`);
    }
    hydrateLogos(hero||document);
  }

  if(typeof render==='function'){
    const previousRender=render;
    render=function(...args){
      const out=previousRender.apply(this,args);
      requestAnimationFrame(()=>{addPortalLogo();decoratePublicStatus();});
      return out;
    };
  }

  if(typeof cardStatusHtml==='function'){
    const previousCardStatusHtml=cardStatusHtml;
    cardStatusHtml=function(...args){
      const html=previousCardStatusHtml.apply(this,args);
      return html.replace('<div class="card status-hero">',`<div class="card status-hero"><div class="status-branding">${logoHtml('status-logo')}</div>`);
    };
  }

  if(typeof openCard==='function'){
    const previousOpenCard=openCard;
    openCard=function(...args){
      const out=previousOpenCard.apply(this,args);
      setTimeout(()=>{
        const card=document.querySelector('#printCard');
        if(card&&!card.querySelector('.mc-brand-logo')){
          card.insertAdjacentHTML('afterbegin',logoHtml('mc-brand-logo'));
          const wordmark=card.querySelector('.mc-logo');
          if(wordmark)wordmark.innerHTML='<small>OFFICIAL MEMBERSHIP CARD</small>';
        }
        hydrateLogos(card||document);
      },0);
      return out;
    };
  }

  const observer=new MutationObserver(()=>{addPortalLogo();decoratePublicStatus();});
  observer.observe(document.body,{childList:true,subtree:true});
  hydrateLogos();
  addPortalLogo();
  decoratePublicStatus();
})();
