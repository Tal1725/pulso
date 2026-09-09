/* PULSO — experiência de aplicativo */
(function(){
  if(window.__pulsoAppShell)return; window.__pulsoAppShell=true;
  function install(){
    document.body.classList.add('pulso-app-shell');
    if(document.getElementById('pulsoAppBottomNav'))return;
    const nav=document.createElement('nav'); nav.id='pulsoAppBottomNav'; nav.className='app-bottom-nav'; nav.setAttribute('aria-label','Navegação do PULSO');
    nav.innerHTML='<button data-appnav="home" class="active"><span>⌂</span>Início</button><button data-appnav="search"><span>⌕</span>Explorar</button><button data-appnav="create" class="create"><span>＋</span>Publicar</button><button data-appnav="alerts"><span>♡</span>Alertas</button><button data-appnav="profile"><span>◉</span>Perfil</button>';
    document.body.appendChild(nav);
    nav.addEventListener('click',function(e){
      const b=e.target.closest('button[data-appnav]'); if(!b)return;
      nav.querySelectorAll('button').forEach(x=>x.classList.remove('active')); b.classList.add('active');
      const type=b.dataset.appnav;
      if(type==='search')document.getElementById('searchOpen')?.click();
      if(type==='create'){document.getElementById('caption')?.focus();document.getElementById('caption')?.scrollIntoView({behavior:'smooth',block:'center'});}
      if(type==='alerts')document.getElementById('notificationBtn')?.click();
      if(type==='profile')document.getElementById('profileBtn')?.click();
      if(type==='home')window.scrollTo({top:0,behavior:'smooth'});
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
