import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';
const sb=createClient('https://vqpavcyehgdifbtvzhcn.supabase.co','sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm',{auth:{persistSession:true,autoRefreshToken:true}});
(async()=>{
  const session=(await sb.auth.getSession()).data.session;
  const uid=session?.user?.id;
  if(!uid)return;
  const install=()=>{
    document.querySelectorAll('[data-post] .video').forEach(media=>{
      if(media.dataset.pulsoInteractionBound==='1')return;
      media.dataset.pulsoInteractionBound='1';
      let lastTap=0;
      media.addEventListener('pointerup',async()=>{
        const now=Date.now();
        if(now-lastTap<320){
          const card=media.closest('[data-post]'),id=card?.dataset.post;
          if(id){
            const q=await sb.from('likes').select('post_id,reaction').eq('post_id',id).eq('user_id',uid).maybeSingle();
            if(!q.error){
              if(q.data?.reaction==='like') await sb.from('likes').delete().eq('post_id',id).eq('user_id',uid);
              else if(q.data) await sb.from('likes').update({reaction:'like'}).eq('post_id',id).eq('user_id',uid);
              else await sb.from('likes').insert({post_id:id,user_id:uid,reaction:'like'});
              if(typeof window.loadFeed==='function')window.loadFeed();
              else document.dispatchEvent(new CustomEvent('pulso-feed-refresh'));
            }
          }
        }
        lastTap=now;
      });
    });
    document.querySelectorAll('[data-post] [data-comment]').forEach(input=>{
      if(input.dataset.pulsoEnterBound==='1')return;
      input.dataset.pulsoEnterBound='1';
      input.addEventListener('keydown',e=>{
        if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();input.closest('[data-post]')?.querySelector('[data-send]')?.click();}
      });
    });
  };
  window.addEventListener('load',install);
  document.addEventListener('pulso-feed-rendered',install);
  setTimeout(install,700);
})();