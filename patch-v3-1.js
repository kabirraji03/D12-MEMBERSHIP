/* D12 Membership V3.0.1 — UI refinement, concise roles, responsive nav containment */
(function(){
  const VERSION='3.0.1';

  function refineChrome(){
    document.querySelectorAll('.brand > small').forEach(el=>{el.textContent='';el.setAttribute('aria-hidden','true')});
    const badge=document.querySelector('#roleBadge');
    if(badge&&typeof role!=='undefined'&&role==='admin')badge.textContent='ADMIN';
    document.querySelectorAll('#topActions .install-app-btn').forEach(el=>el.remove());
    document.querySelectorAll('.v3-hero-brand small').forEach(el=>el.remove());
  }

  if(typeof setNav==='function'){
    const priorSetNav=setNav;
    setNav=function(){
      const out=priorSetNav.apply(this,arguments);
      const badge=document.querySelector('#roleBadge');
      if(badge&&typeof role!=='undefined'&&role==='admin')badge.textContent='ADMIN';
      return out;
    };
  }

  if(typeof render==='function'){
    const priorRender=render;
    render=function(){
      const out=priorRender.apply(this,arguments);
      document.documentElement.dataset.d12Version=VERSION;
      requestAnimationFrame(refineChrome);
      return out;
    };
  }

  refineChrome();
  document.documentElement.dataset.d12Version=VERSION;
})();
