const PULSO_IA={
  imageUrl:'',videoUrl:'',type:'image'
};

function pulsoIaEl(tag,attrs={},html=''){const e=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));e.innerHTML=html;return e}

function pulsoIaBuild(){
  if(document.getElementById('pulsoIaModal'))return;
  const nav=document.querySelector('.nav');
  if(nav){const b=pulsoIaEl('button',{id:'pulsoIaOpen',class:'pulso-ia-btn',type:'button'},'✨ Criar com IA');nav.insertBefore(b,nav.firstChild);b.addEventListener('click',()=>document.getElementById('pulsoIaModal').hidden=false)}
  const modal=pulsoIaEl('div',{id:'pulsoIaModal',class:'pulso-ia-modal',hidden:''},`<div class="pulso-ia-card" role="dialog" aria-modal="true" aria-labelledby="pulsoIaTitle"><div class="pulso-ia-head"><div><h2 id="pulsoIaTitle">✨ PULSO IA</h2><div class="pulso-ia-note">Crie imagens gratuitamente e transforme uma imagem em um vídeo curto com movimento.</div></div><button class="pulso-ia-close" id="pulsoIaClose" type="button" aria-label="Fechar">×</button></div><label class="pulso-ia-label" for="pulsoIaPrompt">O que você quer criar?</label><textarea id="pulsoIaPrompt" class="pulso-ia-prompt" maxlength="500" placeholder="Ex.: uma pessoa em uma cidade futurista, estilo cinematográfico, luz neon rosa e roxa"></textarea><div class="pulso-ia-types"><button class="pulso-ia-type active" data-ia-type="image" type="button">🖼️ Imagem</button><button class="pulso-ia-type" data-ia-type="video" type="button">🎬 Vídeo curto</button></div><div class="pulso-ia-actions"><button id="pulsoIaGenerate" class="pulso-ia-generate" type="button">Gerar grátis</button><button id="pulsoIaPublish" class="pulso-ia-publish" type="button" hidden>Usar no post</button></div><div id="pulsoIaStatus" class="pulso-ia-status"></div><div id="pulsoIaResult" class="pulso-ia-result"></div></div>`);
  document.body.appendChild(modal);
  document.getElementById('pulsoIaClose').onclick=()=>modal.hidden=true;
  modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});
  document.querySelectorAll('.pulso-ia-type').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.pulso-ia-type').forEach(x=>x.classList.remove('active'));btn.classList.add('active');PULSO_IA.type=btn.dataset.iaType;document.getElementById('pulsoIaResult').innerHTML='';document.getElementById('pulsoIaPublish').hidden=true}));
  document.getElementById('pulsoIaGenerate').onclick=pulsoIaGenerate;
  document.getElementById('pulsoIaPublish').onclick=pulsoIaUseInPost;
}

async function pulsoIaGenerate(){
  const prompt=document.getElementById('pulsoIaPrompt').value.trim();
  const status=document.getElementById('pulsoIaStatus'),result=document.getElementById('pulsoIaResult'),btn=document.getElementById('pulsoIaGenerate');
  if(!prompt){status.textContent='Escreva uma ideia para a IA criar.';return}
  btn.disabled=true;result.innerHTML='';document.getElementById('pulsoIaPublish').hidden=true;
  try{
    status.textContent='Criando sua imagem gratuitamente…';
    const safe=encodeURIComponent(`${prompt}, vertical 9:16, high quality, social media content, clean composition`);
    const seed=Math.floor(Math.random()*1000000000);
    const url=`https://image.pollinations.ai/prompt/${safe}?width=768&height=1365&nologo=true&seed=${seed}`;
    const img=new Image();img.alt='Imagem criada pelo PULSO IA';img.src=url;
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject});
    PULSO_IA.imageUrl=url;
    if(PULSO_IA.type==='image'){
      result.appendChild(img);status.textContent='Imagem criada. Você pode usar no post.';document.getElementById('pulsoIaPublish').hidden=false;
    }else{
      status.textContent='Imagem criada. Gerando um vídeo curto com movimento…';
      const video=await pulsoIaMakeShortVideo(url);PULSO_IA.videoUrl=video;const v=pulsoIaEl('video',{controls:'',playsinline:'',autoplay:'',loop:''});v.src=video;result.appendChild(v);status.textContent='Vídeo curto criado. Pronto para usar no post.';document.getElementById('pulsoIaPublish').hidden=false;
    }
  }catch(e){console.error(e);status.textContent='Não foi possível gerar agora. Tente novamente em alguns segundos.'}
  finally{btn.disabled=false}
}

async function pulsoIaMakeShortVideo(imageUrl){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=540;canvas.height=960;
  const img=new Image();img.crossOrigin='anonymous';img.src=imageUrl;await new Promise((r,j)=>{img.onload=r;img.onerror=j});
  const stream=canvas.captureStream(24);let mime='video/webm;codecs=vp9';if(!MediaRecorder.isTypeSupported(mime))mime='video/webm';
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2200000});const chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  const done=new Promise(resolve=>rec.onstop=()=>resolve(new Blob(chunks,{type:mime})));rec.start();
  const start=performance.now(),duration=4200;
  await new Promise(resolve=>{function frame(now){const p=Math.min((now-start)/duration,1);const scale=1+0.06*p;const w=canvas.width*scale,h=canvas.height*scale;ctx.fillStyle='#05060b';ctx.fillRect(0,0,canvas.width,canvas.height);const x=(canvas.width-w)/2,y=(canvas.height-h)/2;ctx.drawImage(img,x,y,w,h);if(p<1)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)});
  rec.stop();const blob=await done;return URL.createObjectURL(blob);
}

function pulsoIaUseInPost(){
  const modal=document.getElementById('pulsoIaModal');const media=PULSO_IA.type==='video'?PULSO_IA.videoUrl:PULSO_IA.imageUrl;const caption=document.getElementById('caption');
  if(caption)caption.value=(caption.value?caption.value+'\n\n':'')+'Criado com o PULSO IA ✨';
  const status=document.getElementById('pulsoIaStatus');status.textContent='Conteúdo preparado. Agora use o botão Publicar normalmente.';
  if(media) sessionStorage.setItem('pulso_ia_media_url',media);
  setTimeout(()=>{modal.hidden=true},900);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pulsoIaBuild);else pulsoIaBuild();