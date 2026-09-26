/* PULSO — correção isolada do menu de exclusão */
(()=>{const norm=v=>String(v??'').trim().toLowerCase();
async function repair(){const s=window.supabase;if(!s)return;const{data:{session}}=await s.auth.getSession();const me=session?.user?.id;if(!me)return;
const cards=[...document.querySelectorAll('#feed [data-post]')];if(!cards.length)return;
const ids=cards.map(c=>c.dataset.post).filter(Boolean);const{data:rows,error}=await s.from('posts').select('id,user_id').in('id',ids);if(error)return;
const owners=new Map((rows||[]).map(r=>[String(r.id),norm(r.user_id)]));
for(const card of cards){if(owners.get(card.dataset.post)!==norm(me))continue;const head=card.querySelector('.posthead');if(!head||head.querySelector('[data-delete]'))continue;
const b=document.createElement('button');b.className='post-menu';b.type='button';b.dataset.delete='';b.title='Excluir publicação';b.ariaLabel='Excluir publicação';b.textContent='⋯';
Object.assign(b.style,{display:'inline-flex',alignItems:'center',justifyContent:'center',minWidth:'40px',minHeight:'40px',border:'0',borderRadius:'999px',cursor:'pointer',fontSize:'24px',lineHeight:'1',background:'rgba(0,0,0,.06)',color:'inherit',position:'relative',zIndex:'20'});
b.onclick=async e=>{e.preventDefault();e.stopPropagation();if(!confirm('Excluir esta publicação? Esta ação não pode ser desfeita.'))return;b.disabled=true;
const{error}=await s.from('posts').delete().eq('id',card.dataset.post).eq('user_id',me);if(error){b.disabled=false;alert('Não foi possível excluir: '+error.message);return}card.remove()};head.appendChild(b)}}
document.addEventListener('pulso-feed-rendered',()=>setTimeout(repair,0));new MutationObserver(()=>repair()).observe(document.getElementById('feed')||document.body,{childList:true,subtree:true});setTimeout(repair,1200)})();