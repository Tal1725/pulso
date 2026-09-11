/* PULSO — correção de publicação somente-texto V3
   Corrige texto sem criar loop de MutationObserver. */
(() => {
  'use strict';
  function installStyle(){
    if(document.getElementById('pulso-text-post-style')) return;
    const s=document.createElement('style');
    s.id='pulso-text-post-style';
    s.textContent=`
      #feed article.post[data-pulso-text="1"] .pulso-text-media{display:flex!important;align-items:center;gap:8px;margin:0;padding:28px 18px 10px;color:#ff4b86;font-size:12px;font-weight:900;letter-spacing:.04em}
      #feed article.post[data-pulso-text="1"] .caption{display:block!important;visibility:visible!important;opacity:1!important;color:#fff!important;font-size:17px!important;line-height:1.55!important;white-space:pre-wrap!important;padding:10px 18px 18px!important;min-height:0!important;background:transparent!important}
    `;
    document.head.appendChild(s);
  }
  function fixTextPosts(){
    installStyle();
    document.querySelectorAll('#feed article.post').forEach(card=>{
      const caption=card.querySelector('.caption');
      if(!caption)return;
      const media=card.querySelector('.video');
      const text=caption.textContent.trim();
      const looksText=!media || (media.tagName==='VIDEO' && !(media.getAttribute('src')||'').trim());
      if(!looksText)return;
      card.dataset.pulsoText='1';
      if(media)media.remove();
      if(!card.querySelector('.pulso-text-media')){
        const box=document.createElement('div');
        box.className='pulso-text-media';
        box.innerHTML='✦ <span>Publicação de texto</span>';
        caption.before(box);
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fixTextPosts,{once:true});
  else fixTextPosts();
  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;fixTextPosts()});
  });
  observer.observe(document.getElementById('feed')||document.documentElement,{childList:true,subtree:true});
})();