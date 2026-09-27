// D12 PLAYERS TURN v1.0.1 usability hotfix
refresh=async function(silent=true){
  if(!token)return;
  try{
    const next=await turn('bootstrap');
    data=next;online=true;
    const active=document.activeElement;
    const editing=!!active&&['INPUT','SELECT','TEXTAREA'].includes(active.tagName);
    if(!(silent&&editing))renderApp(false);else updateSyncOnly();
    if(!silent)toast('Live board refreshed');
  }catch(e){
    online=false;
    if(!silent)toast(e.message);
    updateSyncOnly();
  }
};