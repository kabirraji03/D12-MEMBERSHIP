// D12 PLAYERS TURN v1.0.2 seamless player-ticket follow hotfix
const D12_TICKET_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-player-ticket';
pollTicket=async function(first=false){
  try{
    const d=await api(D12_TICKET_API,'ticket_status',{ticket:ticketParam},false);
    online=true;
    renderTicket(d);
    handleTicketNotifications(d,first);
  }catch(e){
    online=false;
    const b=$('#ticketBody');
    if(b)b.innerHTML=`<div class="empty">${esc(e.message)}</div>`;
  }
};