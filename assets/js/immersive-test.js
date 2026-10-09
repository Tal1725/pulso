/* PULSO — comportamento do teste imersivo; isolado da aplicação original */
(function(){
  'use strict';
  document.body.classList.add('pulso-immersive-test');
  const feed=document.getElementById('feed');
  if(!feed)return;
  function setVisible(post,visible){
    post.classList.toggle('controls-visible',visible);
    post.querySelectorAll('video.video').forEach(v=>{v.controls=visible;});
    if(visible){
      if(!post.querySelector('.immersive-exit')){
        const head=post.querySelector('.posthead');
        if(head){
          const a=document.createElement('a');
          a.className='immersive-exit';
          a.href='app.html';
          a.textContent='Sair do teste';
          a.setAttribute('aria-label','Sair do teste e voltar ao PULSO normal');
          a.addEventListener('click',e=>e.stopPropagation());
          head.appendChild(a);
        }
      }
    }
  }
  function attach(post){
    if(post.dataset.immersiveReady==='1')return;
    post.dataset.immersiveReady='1';
    const media=post.querySelector('.video');
    if(media instanceof HTMLVideoElement){
      media.controls=false;
      media.muted=true;
      media.playsInline=true;
    }
    post.addEventListener('click',e=>{
      if(e.target.closest('button,a,input,textarea,[data-reaction-picker]'))return;
      if(e.target instanceof HTMLVideoElement && post.classList.contains('controls-visible'))return;
      setVisible(post,!post.classList.contains('controls-visible'));
    });
    post.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){if(e.target===post||e.target===media){e.preventDefault();setVisible(post,!post.classList.contains('controls-visible'));}}
    });
  }
  function scan(){feed.querySelectorAll('[data-post]').forEach(attach);}
  const observer=new MutationObserver(scan);
  observer.observe(feed,{childList:true,subtree:true});
  scan();
  if('IntersectionObserver'in window){
    const playObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        const v=entry.target;
        if(!(v instanceof HTMLVideoElement))return;
        if(entry.isIntersecting&&entry.intersectionRatio>.6){
          if(!v.src&&v.dataset.src){v.src=v.dataset.src;v.load();}
          v.muted=true;
          const promise=v.play();
          if(promise&&promise.catch)promise.catch(()=>{});
        }else{try{v.pause();}catch(e){}}
      });
    },{threshold:[0,.6,1]});
    const mediaObserver=new MutationObserver(()=>feed.querySelectorAll('video.video').forEach(v=>{if(!v.dataset.immersiveObserved){v.dataset.immersiveObserved='1';playObserver.observe(v);}}));
    mediaObserver.observe(feed,{childList:true,subtree:true});
    feed.querySelectorAll('video.video').forEach(v=>{v.dataset.immersiveObserved='1';playObserver.observe(v);});
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const p=document.querySelector('.post.controls-visible');if(p)setVisible(p,false);}});
  document.addEventListener('pulso-published',()=>setTimeout(scan,100));
})();
