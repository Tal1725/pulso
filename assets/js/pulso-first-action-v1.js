/* PULSO FIRST ACTION V1 — transforma a entrada em uma primeira ação real, sem dados falsos. */
(function(){
  if(window.__pulsoFirstActionV1)return;
  window.__pulsoFirstActionV1=true;
  const KEY='pulso-first-action-v1';
  if(localStorage.getItem(KEY))return;

  const css=()=>{
    if(document.getElementById('pulso-first-action-css'))return;
    const s=document.createElement('style');s.id='pulso-first-action-css';s.textContent=`
      .pulso-first-action{margin:0 0 12px;padding:15px 16px;border:1px solid rgba(255,75,134,.22);border-radius:16px;background:linear-gradient(135deg,rgba(255,75,134,.09),rgba(255,255,255,.035));box-shadow:0 12px 30px rgba(0,0,0,.16)}
      .pulso-first-action-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .pulso-first-action-kicker{font-size:10px;font-weight:900;letter-spacing:.14em;color:#ff4b86}
      .pulso-first-action h3{margin:4px 0 3px;font-size:17px}
      .pulso-first-action p{margin:0;color:#9da3b4;font-size:12px;line-height:1.45}
      .pulso-first-action-close{border:0;background:transparent;color:#777f91;font-size:20px;cursor:pointer}
      .pulso-first-action-steps{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
      .pulso-first-action-step{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);color:#dfe2ea;border-radius:999px;padding:8px 11px;font-size:12px;font-weight:800;cursor:pointer}
      .pulso-first-action-step.done{border-color:rgba(74,222,128,.4);background:rgba(74,222,128,.09);color:#dfffe9}
      .pulso-first-action-note{margin-top:9px;font-size:11px;color:#737b8d}
      .pulso-first-action-pulse{animation:pulsoFirstPulse 1.8s ease-in-out 2}
      @keyframes pulsoFirstPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,75,134,0)}50%{box-shadow:0 0 0 7px rgba(255,75,134,.12)}}
    `;document.head.appendChild(s);
  };

  function finish(){localStorage.setItem(KEY,'1');document.querySelector('.pulso-first-action')?.remove();}

  function mount(){
    if(localStorage.getItem(KEY))return;
    const feed=document.getElementById('feed');
    if(!feed)return;
    const first=feed.querySelector('[data-post]');
    if(!first)return;
    if(document.querySelector('.pulso-first-action'))return;
    css();
    const box=document.createElement('section');
    box.className='pulso-first-action';
    box.innerHTML=`
      <div class="pulso-first-action-top">
        <div><div class="pulso-first-action-kicker">PRIMEIRO PASSO</div><h3>Agora faça o PULSO acontecer.</h3><p>Escolha uma ação em uma publicação real. É assim que a comunidade começa a ganhar vida.</p></div>
        <button class="pulso-first-action-close" type="button" aria-label="Fechar">×</button>
      </div>
      <div class="pulso-first-action-steps">
        <button class="pulso-first-action-step" data-step="like" type="button">♡ Curtir</button>
        <button class="pulso-first-action-step" data-step="follow" type="button">＋ Seguir criador</button>
        <button class="pulso-first-action-step" data-step="comment" type="button">💬 Comentar</button>
      </div>
      <div class="pulso-first-action-note">Você pode fechar esta orientação quando quiser.</div>`;
    feed.parentNode.insertBefore(box,feed);
    first.classList.add('pulso-first-action-pulse');

    box.querySelector('.pulso-first-action-close').onclick=()=>{localStorage.setItem(KEY,'1');box.remove();first.classList.remove('pulso-first-action-pulse')};

    box.querySelector('[data-step="like"]').onclick=()=>{
      const b=first.querySelector('[data-like]');
      if(!b)return;
      b.click();
      setTimeout(()=>first.querySelector('[data-reaction="like"]')?.click(),80);
      box.querySelector('[data-step="like"]').classList.add('done');
      setTimeout(finish,450);
    };
    box.querySelector('[data-step="follow"]').onclick=()=>{
      const b=first.querySelector('[data-follow-user]');
      if(!b){box.querySelector('[data-step="follow"]').classList.add('done');return;}
      b.click();
      box.querySelector('[data-step="follow"]').classList.add('done');
      setTimeout(finish,500);
    };
    box.querySelector('[data-step="comment"]').onclick=()=>{
      const b=first.querySelector('[data-comment]');
      if(!b)return;
      b.focus();
      box.querySelector('[data-step="comment"]').classList.add('done');
      box.querySelector('.pulso-first-action-note').textContent='Escreva algo curto e envie. Sua primeira conversa começa aqui.';
    };
  }

  const start=()=>setTimeout(mount,900);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  new MutationObserver(()=>{if(!document.querySelector('.pulso-first-action'))mount()}).observe(document.body,{childList:true,subtree:true});
})();
