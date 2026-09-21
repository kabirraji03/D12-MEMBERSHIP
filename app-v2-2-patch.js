attachSearch=function(){const el=$('#memberSearch');if(el)el.addEventListener('input',e=>{searchTerm=e.target.value;const host=$('#memberTableHost');if(host)host.outerHTML=memberStatusTable(filteredMembers(),role==='admin')})};
setInterval(async()=>{if(role==='member'&&token){try{data=await request('bootstrap');render()}catch(x){logoutLocal(true);toast(x.message)}}},60000);
