import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';
const db=createClient('https://vqpavcyehgdifbtvzhcn.supabase.co','sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm');
(function(){
 if(window.__pulsoDeleteOwnerGuard)return;window.__pulsoDeleteOwnerGuard=true;
 let uid=null;const cache=new Map();
 async function session(){if(uid!==null)return uid;const{data}=await db.auth.getSession();uid=data.session?.user?.id||false;return uid||null}
 async function check(btn){const card=btn.closest('[data-post]');const id=card?.dataset.post;if(!id)return;const me=await session();if(!me){btn.remove();return}if(cache.has(id)){if(cache.get(id)!==me)btn.remove();return}const{data,error}=await db.from('posts').select('user_id').eq('id',id).maybeSingle();if(error||!data){btn.remove();return}cache.set(id,data.user_id);if(data.user_id!==me)btn.remove()}
 function scan(){document.querySelectorAll('[data-post] [data-delete]').forEach(check)}
 document.addEventListener('click',async e=>{const btn=e.target.closest?.('[data-delete]');if(!btn)return;const card=btn.closest('[data-post]'),id=card?.dataset.post,me=await session();if(!id||!me)return;const{data}=await db.from('posts').select('user_id').eq('id',id).maybeSingle();if(!data||data.user_id!==me){e.preventDefault();e.stopImmediatePropagation();btn.remove();alert('Você só pode excluir suas próprias publicações.')}} ,true);
 const style=document.createElement('style');style.textContent='[data-delete][data-pulso-hidden]{display:none!important}';document.head.appendChild(style);
 scan();const mo=new MutationObserver(()=>{clearTimeout(window.__pulsoDeleteGuardTimer);window.__pulsoDeleteGuardTimer=setTimeout(scan,80)});mo.observe(document.body,{childList:true,subtree:true});
})();