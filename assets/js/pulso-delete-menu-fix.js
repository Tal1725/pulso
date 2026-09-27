/* PULSO — menu de exclusão do proprietário, correção robusta */
(()=>{const norm=v=>String(v??'').trim().toLowerCase();let busy=false;
async function repair(){if(busy)return;const s=window.supabase;if(!s)return;busy=true;try{
const{data:{session}}=await s.auth.getSession();const me=norm(session?.user?.id);if(!me)return;
const cards=[...document.querySelectorAll('#feed article[data-post]')];if(!cards.length)return;
const ids=cards.map(c=>c.dataset.post).filter(Boolean);const{data:rows,error}=await s.from('posts').select('id,user_id').in('id',ids);if(error)return;
const owners=new Map((rows||[]).map(r=>[String(r.id),norm(r.user_id)]));
for(const card of cards){const owner=owners.get(card.dataset.post);if(owner!==me)continue;
if(card.querySelector('[data-delete]'))continue;
card.style.position='relative';
const b=document.createElement('button');b.className='post-menu';b.type='button';b.dataset.delete='';b.title='Excluir publicação';b.setAttribute('aria-label','Excluir publicação');b.textContent='⋯';
Object.assign(b.style,{position:'absolute',top:'12px',right:'12px',zIndex:'9999',display:'flex',alignItems:'center',justifyContent:'center',width:'40px',height:'40px',minWidth:'40px',minHeight:'40px',padding:'0',margin:'0',border:'1px solid rgba(0,0,0,.12)',borderRadius:'50%',background:'#fff',color:'#222',fontSize:'24px',fontWeight:'800',lineHeight:'1',cursor:'pointer',boxShadow:'0 4px 16px rgba(0,0,0,.18)'});
b.onclick=async e=>{e.preventDefault();e.stopPropagation();if(!confirm('Excluir esta publicação? Esta ação não pode ser desfeita.'))return;b.disabled=true;
const{error}=await s.from('posts').delete().eq('id',card.dataset.post).eq('user_id',session.user.id);if(error){b.disabled=false;alert('Não foi possível excluir: '+error.message);return}card.remove()};
card.appendChild(b)}
}finally{busy=false}}
document.addEventListener('pulso-feed-rendered',()=>setTimeout(repair,50));
window.addEventListener('load',()=>setTimeout(repair,500));
setInterval(repair,5000);
setTimeout(repair,1000)})();