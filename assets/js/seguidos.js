/* PULSO — Lista "Seguindo"
   Usa a mesma chave localStorage do sistema de follow.
*/
(function(){
  'use strict';
  const KEY='pulso_following_v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}};
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function getNames(){
    return Object.keys(read()).filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  }
  function render(){
    const box=document.getElementById('followingList');
    const count=document.getElementById('followingCount');
    if(!box) return;
    const names=getNames();
    if(count) count.textContent=names.length;
    if(!names.length){
      box.innerHTML='<div class="following-empty"><strong>Você ainda não segue ninguém.</strong><span>Explore os criadores do PULSO e toque em Seguir para vê-los aqui.</span></div>';
      return;
    }
    box.innerHTML=names.map(name=>`<div class="following-item" data-follow-name="${esc(name)}"><div class="following-avatar">${esc(name.charAt(0).toUpperCase())}</div><div class="following-info"><strong>${esc(name)}</strong><span>@${esc(name.replace(/\s+/g,'').toLowerCase())}</span></div><button class="following-unfollow" type="button" aria-label="Deixar de seguir ${esc(name)}">Seguindo ✓</button></div>`).join('');
    box.querySelectorAll('.following-unfollow').forEach(btn=>btn.addEventListener('click',()=>{
      const item=btn.closest('.following-item');
      const name=item?.dataset.followName;
      if(!name) return;
      const state=read(); delete state[name]; localStorage.setItem(KEY,JSON.stringify(state)); render();
      document.dispatchEvent(new CustomEvent('pulso:following-changed'));
    }));
  }
  function init(){
    const nav=document.querySelector('[data-nav="following"], a[href="#following"], [data-view="following"]');
    const section=document.getElementById('followingSection');
    if(section) render();
    if(nav&&section) nav.addEventListener('click',()=>{section.hidden=false; render();});
    window.addEventListener('storage',render);
    document.addEventListener('pulso:following-changed',render);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
