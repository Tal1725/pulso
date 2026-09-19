/* PULSO — SOCIAL FAILSAFE v11
   Um único controlador para Curtir/Reagir.
   Idempotente: módulos importados com query-string diferente não podem registrar
   o mesmo listener duas vezes.
*/
if(!window.__PULSO_SOCIAL_FAILSAFE_V11__){
window.__PULSO_SOCIAL_FAILSAFE_V11__=true;
import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm').then(({createClient})=>{
const sb=createClient('https://vqpavcyehgdifbtvzhcn.supabase.co','sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
async function me(){const{data,error}=await sb.auth.getSession();if(error)throw error;const id=data.session?.user?.id;if(!id)throw new Error('Sessão expirada. Entre novamente no PULSO.');return id}
function setBusy(b,v){if(!b)return;b.disabled=v;if(v)b.dataset.likeBusy='1';else delete b.dataset.likeBusy}
async function like(button){
 const card=button?.closest('article[data-post]'),postId=card?.dataset?.post;
 if(!postId||button?.dataset.likeBusy==='1')return;
 setBusy(button,true);
 try{
  const u=await me();
  const q=await sb.from('likes').select('post_id,reaction').eq('post_id',postId).eq('user_id',u).limit(1);
  if(q.error)throw q.error;
  const exists=!!q.data?.length;
  if(exists){
   const r=await sb.from('likes').delete().eq('post_id',postId).eq('user_id',u);
   if(r.error)throw r.error;
  }else{
   const r=await sb.from('likes').insert({post_id:postId,user_id:u,reaction:'like'});
   if(r.error)throw r.error;
  }
  const c=await sb.from('likes').select('post_id').eq('post_id',postId);
  if(c.error)throw c.error;
  const liked=!exists,total=c.data?.length||0;
  button.classList.toggle('active',liked);
  button.textContent=`${liked?'👍':'♡'} ${liked?'Curtido':'Curtir'} · ${total}`;
  card.querySelector('.reaction-picker')?.classList.remove('is-open');
  document.dispatchEvent(new CustomEvent('pulso-like-changed',{detail:{postId,liked,count:total}}));
 }catch(e){console.error('[PULSO LIKE]',e);alert('Não foi possível curtir: '+(e?.message||'erro'))}
 finally{setBusy(button,false)}
}
function removeOldAvatarUI(root=document){
 const selectors=['#avatarRedeBtn','#avatarRedeBtnStatic','.avatar-rede-card','.avatar-rede-badge','.pulso-avatar-card','.pulso-avatar-widget','.pulso-mini-avatar','.mini-avatar-ai','[data-avatar-rede]','[data-mini-avatar]','[data-pulso-avatar]'];
 root.querySelectorAll?.(selectors.join(',')).forEach(el=>el.remove());
}
function bind(){
 removeOldAvatarUI();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>removeOldAvatarUI(),{once:true});
 new MutationObserver(m=>{for(const x of m)for(const n of x.addedNodes)if(n.nodeType===1)removeOldAvatarUI(n)}).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('click',e=>{
  const b=e.target.closest('button[data-like]');
  if(!b)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();like(b);
 },true);
 window.pulsoLikeFailsafe='2026-09-19-v11';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
}).catch(e=>console.error('[PULSO SOCIAL FAILSAFE LOAD]',e));
}
