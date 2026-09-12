// PULSO IA — LOCAL V4
// Interface local garantida. Remove o estúdio antigo e usa somente recursos locais do navegador.
(function(){
  const oldIds=['aiModal','pulsoIaModal'];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function ensureModal(){
    oldIds.forEach(id=>{ if(id!=='pulsoIaModal') document.getElementById(id)?.remove(); });
    let modal=document.getElementById('pulsoIaModal');
    if(!modal){
      modal=document.createElement('div'); modal.id='pulsoIaModal'; modal.className='pulso-ia-modal-v4';
      modal.innerHTML=`<div class="pulso-ia-card-v4" role="dialog" aria-modal="true" aria-labelledby="pulsoIaTitle">
        <div class="pulso-ia-head-v4"><div><div class="pulso-ia-kicker-v4">PULSO IA</div><h2 id="pulsoIaTitle">Crie dentro do PULSO</h2><p>Sem cartão • sem conta externa • processamento no seu navegador.</p></div><button id="pulsoIaClose" class="pulso-ia-close-v4" type="button">×</button></div>
        <div class="pulso-ia-modes-v4"><button type="button" class="active" data-local-mode="image">🖼️ Imagem</button><button type="button" data-local-mode="video">🎬 Vídeo curto</button></div>
        <label class="pulso-ia-label-v4" for="pulsoIaPrompt">O que você quer criar?</label>
        <textarea id="pulsoIaPrompt" class="pulso-ia-prompt-v4" placeholder="Ex.: uma pessoa caminhando em uma cidade futurista, visual cinematográfico, noite, neon magenta..."></textarea>
        <div class="pulso-ia-presets-v4"><button type="button" data-local-preset="cinematográfico">🎞️ Cinematográfico</button><button type="button" data-local-preset="futuro neon">✨ Neon</button><button type="button" data-local-preset="natureza">🌿 Natureza</button><button type="button" data-local-preset="esporte">⚡ Esporte</button></div>
        <div id="pulsoIaStatus" class="pulso-ia-status-v4">Pronto para criar.</div>
        <div id="pulsoIaPreview" class="pulso-ia-preview-v4"></div>
        <div class="pulso-ia-actions-v4"><button id="pulsoIaGenerate" class="primary" type="button">✨ Criar agora</button><button id="pulsoIaVideo" type="button">🎬 Criar vídeo</button><button id="pulsoIaUse" type="button" disabled>Usar na publicação</button></div>
        <p class="pulso-ia-note-v4">Observação: esta versão não chama serviço pago. A criação visual é feita localmente no dispositivo.</p>
      </div>`;
      document.body.appendChild(modal);
    }
    return modal;
  }
  function addStyles(){if(document.getElementById('pulsoIaV4Style'))return;const s=document.createElement('style');s.id='pulsoIaV4Style';s.textContent=`.pulso-ia-modal-v4{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,3,8,.82);backdrop-filter:blur(16px)}.pulso-ia-modal-v4.open{display:flex}.pulso-ia-card-v4{width:min(720px,100%);max-height:92vh;overflow:auto;background:#0b0d13;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:26px;padding:24px;box-shadow:0 30px 100px rgba(0,0,0,.6)}.pulso-ia-head-v4{display:flex;justify-content:space-between;gap:18px}.pulso-ia-kicker-v4{color:#ff168c;font-size:12px;font-weight:900;letter-spacing:.14em}.pulso-ia-head-v4 h2{margin:5px 0;font-size:28px}.pulso-ia-head-v4 p{margin:0;color:#aeb3c2}.pulso-ia-close-v4{border:0;background:rgba(255,255,255,.08);color:#fff;width:40px;height:40px;border-radius:50%;font-size:25px;cursor:pointer}.pulso-ia-modes-v4,.pulso-ia-presets-v4{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.pulso-ia-modes-v4 button,.pulso-ia-presets-v4 button{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;border-radius:999px;padding:10px 13px;font-weight:800;cursor:pointer}.pulso-ia-modes-v4 button.active{background:linear-gradient(135deg,#ff168c,#7c4dff);border-color:transparent}.pulso-ia-label-v4{display:block;font-weight:800;margin:8px 0}.pulso-ia-prompt-v4{width:100%;min-height:125px;box-sizing:border-box;resize:vertical;background:#06070b;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:15px;font:inherit;outline:0}.pulso-ia-prompt-v4:focus{border-color:#ff168c}.pulso-ia-status-v4{min-height:24px;margin-top:12px;color:#c8ccda}.pulso-ia-preview-v4{margin-top:14px;text-align:center}.pulso-ia-preview-v4 img,.pulso-ia-preview-v4 video{max-width:100%;max-height:440px;border-radius:18px;background:#05060a}.pulso-ia-actions-v4{display:flex;gap:9px;flex-wrap:wrap;margin-top:15px}.pulso-ia-actions-v4 button{border:1px solid rgba(255,255,255,.12);background:#fff;color:#08090d;border-radius:14px;padding:12px 16px;font-weight:900;cursor:pointer}.pulso-ia-actions-v4 button.primary{background:linear-gradient(135deg,#ff168c,#7c4dff);color:#fff;border:0}.pulso-ia-actions-v4 button:disabled{opacity:.45;cursor:not-allowed}.pulso-ia-note-v4{font-size:12px;color:#858b9b;line-height:1.5;margin-bottom:0}`;document.head.appendChild(s)}
  function wire(){
    const m=ensureModal(), prompt=document.getElementById('pulsoIaPrompt'), status=document.getElementById('pulsoIaStatus'), preview=document.getElementById('pulsoIaPreview'), use=document.getElementById('pulsoIaUse'); let mode='image', lastFile=null;
    const open=()=>{m.classList.add('open');prompt?.focus()}; const close=()=>m.classList.remove('open');
    document.getElementById('pulsoIaClose').onclick=close;
    m.onclick=e=>{if(e.target===m)close()};
    m.querySelectorAll('[data-local-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.localMode;m.querySelectorAll('[data-local-mode]').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('pulsoIaVideo').style.display=mode==='video'?'inline-block':'none';});
    m.querySelectorAll('[data-local-preset]').forEach(b=>b.onclick=()=>{prompt.value=(prompt.value?prompt.value+', ':'')+b.dataset.localPreset;prompt.focus()});
    const showFile=(file,type)=>{lastFile=file;use.disabled=false;const url=URL.createObjectURL(file);preview.innerHTML=type==='video'?`<video src="${url}" controls playsinline></video>`:`<img src="${url}" alt="Criação do PULSO IA">`;return url};
    document.getElementById('pulsoIaGenerate').onclick=async()=>{try{status.textContent='✨ Criando localmente...';let blob;if(window.pulsoIaGenerate) blob=await window.pulsoIaGenerate();else throw new Error('motor local indisponível');lastFile=new File([blob],`pulso-ia-${Date.now()}.png`,{type:'image/png'});showFile(lastFile,'image');status.textContent='✅ Imagem criada sem serviço externo.'}catch(e){status.textContent='Não foi possível criar a imagem local: '+e.message}};
    document.getElementById('pulsoIaVideo').onclick=async()=>{try{status.textContent='🎬 Criando vídeo local de 5 segundos...';const blob=await window.pulsoIaMakeShortVideo();lastFile=new File([blob],`pulso-ia-${Date.now()}.webm`,{type:'video/webm'});showFile(lastFile,'video');status.textContent='✅ Vídeo criado localmente.'}catch(e){status.textContent='Não foi possível criar o vídeo: '+e.message}};
    use.onclick=()=>{if(!lastFile)return;window.pulsoApprovedMedia={file:lastFile,source:'pulso-ia-local-v4'};const cap=document.querySelector('#caption');if(cap&&!cap.value)cap.value='Criado com o PULSO IA ✨';close();document.querySelector('#publishBtn')?.focus()};
    document.querySelectorAll('[data-pulso-ia]').forEach(b=>{b.removeEventListener('click',open);b.addEventListener('click',open)});
    if(!document.querySelector('[data-pulso-ia]')){const host=document.querySelector('.composer-actions')||document.querySelector('.composer');if(host){const b=document.createElement('button');b.type='button';b.className='pill';b.dataset.pulsoIa='1';b.textContent='✨ IA';b.onclick=open;host.prepend(b)}}
    window.pulsoIaOpen=open;window.pulsoIaClose=close;
  }
  function start(){addStyles();wire();const obs=new MutationObserver(()=>{const legacy=document.getElementById('aiModal');if(legacy)legacy.remove();});obs.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
