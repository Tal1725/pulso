const PULSO_AI_KEY='pulso_pollinations_key';
const PULSO_AI_BASE='https://gen.pollinations.ai';

function esc(s){return String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
function key(){return localStorage.getItem(PULSO_AI_KEY)||'';}
function ensureModal(){
  if(document.getElementById('pulsoAiModal')) return;
  const d=document.createElement('div');d.id='pulsoAiModal';d.className='modal';d.hidden=true;
  d.innerHTML=`<div class="modal-card pulso-ai-card"><div class="modal-head"><div><h2>✨ Estúdio IA</h2><span class="modal-subtitle">Crie imagens e vídeos curtos para o PULSO</span></div><button class="modal-close" id="pulsoAiClose">×</button></div><div class="pulso-ai-tabs"><button class="active" data-ai-tab="image">🖼️ Imagem</button><button data-ai-tab="video">🎬 Vídeo curto</button></div><div class="pulso-ai-body"><label>Descreva o que você quer criar</label><textarea id="pulsoAiPrompt" maxlength="1000" placeholder="Ex.: um jogador de futebol comemorando um gol em um estádio lotado, estilo cinematográfico"></textarea><div class="pulso-ai-options"><label>Modelo <select id="pulsoAiModel"><option value="flux">FLUX — imagem</option><option value="zimage">Z-Image — imagem</option><option value="veo">Veo — vídeo</option><option value="seedance-2.0-mini">Seedance — vídeo</option><option value="wan-fast">Wan Fast — vídeo</option></select></label><label id="pulsoAiDurationWrap" hidden>Duração <select id="pulsoAiDuration"><option value="4">4 segundos</option><option value="5">5 segundos</option><option value="6">6 segundos</option><option value="8">8 segundos</option></select></label></div><div class="pulso-ai-key"><label>Chave Pollinations gratuita</label><input id="pulsoAiKey" type="password" placeholder="Cole sua chave pk_..."><small>A chave fica somente neste navegador. O PULSO não salva nem publica sua chave.</small></div><button id="pulsoAiGenerate" class="pill primary pulso-ai-generate">✨ Gerar</button><div id="pulsoAiStatus" class="pulso-ai-status"></div><div id="pulsoAiResult" class="pulso-ai-result"></div></div></div>`;
  document.body.appendChild(d);
  document.getElementById('pulsoAiKey').value=key();
  document.getElementById('pulsoAiClose').onclick=()=>d.hidden=true;
  d.addEventListener('click',e=>{if(e.target===d)d.hidden=true;});
  d.querySelectorAll('[data-ai-tab]').forEach(b=>b.onclick=()=>{d.querySelectorAll('[data-ai-tab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');const v=b.dataset.aiTab==='video';document.getElementById('pulsoAiDurationWrap').hidden=!v;document.getElementById('pulsoAiModel').value=v?'veo':'flux';document.getElementById('pulsoAiGenerate').dataset.type=v?'video':'image';});
  document.getElementById('pulsoAiGenerate').onclick=generate;
}
async function generate(){
 const btn=document.getElementById('pulsoAiGenerate'),type=btn.dataset.type||'image',prompt=document.getElementById('pulsoAiPrompt').value.trim(),k=document.getElementById('pulsoAiKey').value.trim(),model=document.getElementById('pulsoAiModel').value,dur=document.getElementById('pulsoAiDuration').value,status=document.getElementById('pulsoAiStatus'),out=document.getElementById('pulsoAiResult');
 if(!prompt){status.textContent='Escreva uma descrição para a criação.';return;}
 if(!k){status.textContent='Cole uma chave Pollinations gratuita para gerar. Ela fica apenas neste navegador.';return;}
 localStorage.setItem(PULSO_AI_KEY,k);btn.disabled=true;status.textContent=type==='video'?'Gerando seu vídeo curto… isso pode levar um pouco.':'Gerando sua imagem…';out.innerHTML='';
 try{
   const url=type==='image'?`${PULSO_AI_BASE}/image/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&width=1024&height=1024`: `${PULSO_AI_BASE}/video/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&duration=${encodeURIComponent(dur)}`;
   const r=await fetch(url,{headers:{Authorization:`Bearer ${k}`}}); if(!r.ok) throw new Error(`HTTP ${r.status}`); const blob=await r.blob(); if(!blob.size) throw new Error('Resposta vazia');
   const objectUrl=URL.createObjectURL(blob); if(type==='image'){out.innerHTML=`<img src="${objectUrl}" alt="Imagem criada no Estúdio IA"><a class="pill" download="pulso-ia.png" href="${objectUrl}">⬇️ Salvar imagem</a>`;}else{out.innerHTML=`<video src="${objectUrl}" controls playsinline></video><a class="pill" download="pulso-ia.mp4" href="${objectUrl}">⬇️ Salvar vídeo</a>`;} status.textContent='Pronto. Você pode salvar e publicar no PULSO.';
 }catch(e){status.textContent=`Não foi possível gerar agora. Verifique a chave e tente novamente. (${e.message})`;}finally{btn.disabled=false;}
}
function mount(){ensureModal();const side=document.querySelector('.side');if(!side||document.getElementById('pulsoAiBtn'))return;const b=document.createElement('button');b.id='pulsoAiBtn';b.className='pill';b.type='button';b.style='width:100%;margin:0 0 14px;text-align:left;font-weight:800';b.textContent='✨ Estúdio IA — Imagens e Vídeos';b.onclick=()=>{ensureModal();document.getElementById('pulsoAiModal').hidden=false;};side.prepend(b);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
