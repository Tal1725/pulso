/* PULSO — interações da prévia imersiva isoladas; ativadas apenas em celulares. */
(function(){
  'use strict';
  const mobile=window.matchMedia('(max-width: 699px)');
  if(!mobile.matches)return;
  document.body.classList.add('pulso-immersive-test');
  const feed=document.getElementById('feed');
  if(!feed)return;

  function setVisible(post,visible){
    post.classList.toggle('controls-visible',visible);
    post.querySelectorAll('video.video').forEach(v=>{v.controls=false;});
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
    setVisible(post,true);
    post.addEventListener('click',e=>{
      if(e.target.closest('button,a,input,textarea,[data-reaction-picker]'))return;
      if(e.target instanceof HTMLVideoElement){
        if(e.target.paused)e.target.play().catch(()=>{});else e.target.pause();
      }
    });
    post.querySelector('[data-focus]')?.addEventListener('click',e=>{
      e.preventDefault();e.stopImmediatePropagation();
      const open=post.classList.toggle('comments-visible');
      if(open)setTimeout(()=>post.querySelector('[data-comment]')?.focus(),80);
    },true);
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
          if(!v.src&&v.dataset.src){v.src=v.dataset.src;v.removeAttribute('data-src');v.load();}
          v.muted=true;
          const promise=v.play();if(promise&&promise.catch)promise.catch(()=>{});
        }else{try{v.pause();}catch(e){}}
      });
    },{threshold:[0,.6,1]});
    const observeVideos=()=>feed.querySelectorAll('video.video').forEach(v=>{
      if(v.dataset.immersiveObserved)return;v.dataset.immersiveObserved='1';playObserver.observe(v);
    });
    new MutationObserver(observeVideos).observe(feed,{childList:true,subtree:true});
    observeVideos();
  }

  if(!document.querySelector('.immersive-bottom-nav')){
    const nav=document.createElement('nav');
    nav.className='immersive-bottom-nav';
    nav.setAttribute('aria-label','Navegação PULSO');
    nav.innerHTML='<button type="button" data-nav="home"><span class="nav-icon">⌂</span><span>Início</span></button><button type="button" data-nav="friends"><span class="nav-icon">♧</span><span>Amigos</span></button><button type="button" class="publish-nav" data-nav="publish"><span class="nav-icon">+</span><span>Publicar</span></button><button type="button" data-nav="messages"><span class="nav-icon">▤</span><span>Mensagens</span></button><button type="button" data-nav="profile"><span class="nav-icon">♙</span><span>Perfil</span></button>';
    document.body.appendChild(nav);
    nav.addEventListener('click',e=>{
      const b=e.target.closest('button[data-nav]');if(!b)return;
      const action=b.dataset.nav;
      if(action==='home'){feed.scrollTo({top:0,behavior:'smooth'});document.body.classList.remove('composer-open');document.querySelector('.immersive-scrim')?.remove();}
      if(action==='friends'){document.getElementById('feedFollowing')?.click();feed.scrollTo({top:0,behavior:'instant'});}
      if(action==='messages'){document.getElementById('messagesBtn')?.click();}
      if(action==='profile'){document.getElementById('profileBtn')?.click();}
      if(action==='publish'){
        const opened=document.body.classList.toggle('composer-open');
        if(opened){
          if(!document.querySelector('.immersive-scrim')){const s=document.createElement('div');s.className='immersive-scrim';s.addEventListener('click',()=>{document.body.classList.remove('composer-open');s.remove();});document.body.appendChild(s);}
          document.querySelector('#caption')?.focus();
        }else document.querySelector('.immersive-scrim')?.remove();
      }
    });
  }
  document.addEventListener('pulso-published',()=>{document.body.classList.remove('composer-open');document.querySelector('.immersive-scrim')?.remove();setTimeout(scan,100);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('composer-open');document.querySelector('.immersive-scrim')?.remove();document.querySelectorAll('.post.comments-visible').forEach(p=>p.classList.remove('comments-visible'));}});
  mobile.addEventListener?.('change',e=>{if(!e.matches){document.body.classList.remove('pulso-immersive-test');document.querySelector('.immersive-bottom-nav')?.remove();}});
})();
