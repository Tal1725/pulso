const PULSO_IA={imageUrl:'',videoUrl:'',type:'image'};

function pulsoIaEl(tag,attrs={},html=''){const e=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));e.innerHTML=html;return e}

function pulsoIaBuild(){
  if(document.getElementById('pulsoIaModal'))return;
  const nav=document.querySelector('.nav');
  if(nav){
    const b=pulsoIaEl('button',{id:'pulsoIaOpen',class:'pulso-ia-btn',type:'button'},'✨ Criar com IA');
    nav.insertBefore(b,nav.firstChild);
    b.addEventListener('click',()=>document.getElementById('pulsoIaModal').hidden=false)
  }
  const modal=pulsoIaEl('div',{id:'pulsoIaModal',class:'pulso-ia-modal',hidden:''},`<div class="pulso-ia-card" role="dialog" aria-modal="true" aria-labelledby="pulsoIaTitle"><div class="pulso-ia-head"><div><h2 id="pulsoIaTitle">✨ PULSO IA</h2><div class="pulso-ia-note">Criação local, sem API externa, sem cartão e sem cobrança. Gere uma arte e transforme-a em vídeo curto.</div></div><button class="pulso-ia-close" id="pulsoIaClose" type="button" aria-label="Fechar">×</button></div><label class="pulso-ia-label" for="pulsoIaPrompt">O que você quer criar?</label><textarea id="pulsoIaPrompt" class="pulso-ia-prompt" maxlength="500" placeholder="Ex.: cidade futurista, carro esportivo, luz neon, estilo cinematográfico"></textarea><div class="pulso-ia-types"><button class="pulso-ia-type active" data-ia-type="image" type="button">🖼️ Imagem</button><button class="pulso-ia-type" data-ia-type="video" type="button">🎬 Vídeo curto</button></div><div class="pulso-ia-actions"><button id="pulsoIaGenerate" class="pulso-ia-generate" type="button">Criar grátis</button><button id="pulsoIaPublish" class="pulso-ia-publish" type="button" hidden>Usar no post</button></div><div id="pulsoIaStatus" class="pulso-ia-status"></div><div id="pulsoIaResult" class="pulso-ia-result"></div></div>`);
  document.body.appendChild(modal);
  document.getElementById('pulsoIaClose').onclick=()=>modal.hidden=true;
  modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});
  document.querySelectorAll('.pulso-ia-type').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.pulso-ia-type').forEach(x=>x.classList.remove('active'));btn.classList.add('active');PULSO_IA.type=btn.dataset.iaType;document.getElementById('pulsoIaResult').innerHTML='';document.getElementById('pulsoIaPublish').hidden=true}));
  document.getElementById('pulsoIaGenerate').onclick=pulsoIaGenerate;
  document.getElementById('pulsoIaPublish').onclick=pulsoIaUseInPost;
}

function pulsoIaPalette(text){
  const t=text.toLowerCase();
  if(/neon|cyber|futur|digital|tecnol/.test(t))return ['#080018','#6d00ff','#ff1688','#00e5ff'];
  if(/nature|natureza|floresta|praia|mar|montanha/.test(t))return ['#061b13','#0b6b4f','#37d67a','#b7ff5a'];
  if(/amor|romant|casal|coração/.test(t))return ['#22000f','#8e124e','#ff3d81','#ffd1e2'];
  if(/festa|balada|música|musica|show/.test(t))return ['#12001f','#7a00ff','#ff5c00','#ffe600'];
  return ['#090b12','#171d31','#d10072','#ffffff'];
}

function pulsoIaMakeArtwork(prompt){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1365;
  const ctx=canvas.getContext('2d');const [bg,c1,c2,light]=pulsoIaPalette(prompt);
  const seed=[...prompt].reduce((a,c)=>((a*31+c.charCodeAt(0))>>>0),7);
  let s=seed;
  const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
  const g=ctx.createLinearGradient(0,0,768,1365);g.addColorStop(0,bg);g.addColorStop(.52,c1);g.addColorStop(1,'#020307');ctx.fillStyle=g;ctx.fillRect(0,0,768,1365);
  for(let i=0;i<18;i++){
    const x=rnd()*768,y=rnd()*1365,r=40+rnd()*240;const rg=ctx.createRadialGradient(x,y,0,x,y,r);rg.addColorStop(0,c2);rg.addColorStop(1,'transparent');ctx.globalAlpha=.08+rnd()*.12;ctx.fillStyle=rg;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=2;
  for(let i=0;i<7;i++){ctx.beginPath();ctx.arc(384,690,130+i*75,-1.2,1.2);ctx.stroke()}
  ctx.fillStyle=light;ctx.font='700 24px Arial';ctx.globalAlpha=.8;ctx.fillText('PULSO IA • CRIAÇÃO LOCAL',42,58);
  ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.font='700 54px Arial';
  const words=prompt.replace(/\s+/g,' ').trim().slice(0,72);const lines=[];let line='';
  words.split(' ').forEach(w=>{const test=line?line+' '+w:w;if(ctx.measureText(test).width>650){lines.push(line);line=w}else line=test});if(line)lines.push(line);
  const startY=1030;lines.slice(0,3).forEach((l,i)=>ctx.fillText(l,42,startY+i*66));
  ctx.fillStyle=c2;ctx.fillRect(42,1255,150,8);ctx.fillStyle='rgba(255,255,255,.55)';ctx.font='400 20px Arial';ctx.fillText('Sinta o ritmo do conteúdo real.',42,1305);
  return new Promise(resolve=>canvas.toBlob(b=>resolve({blob:b,canvas}), 'image/png',.95));
}

async function pulsoIaGenerate(){
  const prompt=document.getElementById('pulsoIaPrompt').value.trim(),status=document.getElementById('pulsoIaStatus'),result=document.getElementById('pulsoIaResult'),btn=document.getElementById('pulsoIaGenerate');
  if(!prompt){status.textContent='Escreva uma ideia para criar.';return}
  btn.disabled=true;result.innerHTML='';document.getElementById('pulsoIaPublish').hidden=true;
  try{
    status.textContent='Criando no próprio PULSO…';
    const {blob}=await pulsoIaMakeArtwork(prompt);
    const imageUrl=URL.createObjectURL(blob);PULSO_IA.imageUrl=imageUrl;
    if(PULSO_IA.type==='image'){
      const img=new Image();img.alt='Imagem criada pelo PULSO IA';img.src=imageUrl;result.appendChild(img);status.textContent='Arte criada no PULSO, sem serviço externo.';document.getElementById('pulsoIaPublish').hidden=false;
    }else{
      status.textContent='Criando vídeo curto com movimento…';
      const video=await pulsoIaMakeShortVideo(imageUrl);PULSO_IA.videoUrl=video;
      const v=pulsoIaEl('video',{controls:'',playsinline:'',autoplay:'',loop:''});v.src=video;result.appendChild(v);status.textContent='Vídeo curto criado no PULSO. Pronto para publicar.';document.getElementById('pulsoIaPublish').hidden=false;
    }
  }catch(e){console.error(e);status.textContent='Não foi possível criar agora. Tente novamente.'}
  finally{btn.disabled=false}
}

async function pulsoIaMakeShortVideo(imageUrl){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=540;canvas.height=960;const img=new Image();img.src=imageUrl;await new Promise((r,j)=>{img.onload=r;img.onerror=j});
  const stream=canvas.captureStream(24);let mime='video/webm;codecs=vp9';if(!MediaRecorder.isTypeSupported(mime))mime='video/webm';
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2200000}),chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);const done=new Promise(resolve=>rec.onstop=()=>resolve(new Blob(chunks,{type:mime})));
  rec.start();const start=performance.now(),duration=5000;await new Promise(resolve=>{function frame(now){const p=Math.min((now-start)/duration,1),ease=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2,scale=1+.08*ease,w=canvas.width*scale,h=canvas.height*scale,x=(canvas.width-w)/2,y=(canvas.height-h)/2;ctx.fillStyle='#05060b';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,x,y,w,h);ctx.globalAlpha=.12;ctx.fillStyle='#fff';ctx.font='700 18px Arial';ctx.fillText('PULSO IA',20,35);ctx.globalAlpha=1;if(p<1)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)});rec.stop();const blob=await done;return URL.createObjectURL(blob)
}

async function pulsoIaUseInPost(){
  const modal=document.getElementById('pulsoIaModal'),status=document.getElementById('pulsoIaStatus'),caption=document.getElementById('caption');
  try{
    status.textContent='Preparando o arquivo para publicação…';let file;
    if(PULSO_IA.type==='video'){const blob=await fetch(PULSO_IA.videoUrl).then(r=>r.blob());file=new File([blob],'pulso-ia-video.webm',{type:'video/webm',lastModified:Date.now()})}
    else{const blob=await fetch(PULSO_IA.imageUrl).then(r=>r.blob());file=new File([blob],'pulso-ia-imagem.png',{type:'image/png',lastModified:Date.now()})}
    window.pulsoApprovedMedia={file,source:'pulso-ia'};
    if(caption)caption.value=(caption.value?caption.value+'\n\n':'')+'Criado com o PULSO IA ✨';
    status.textContent='Conteúdo preparado. Agora toque em Publicar.';
    setTimeout(()=>{modal.hidden=true;document.getElementById('publishBtn')?.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('publishBtn')?.focus()},700)
  }catch(e){console.error(e);status.textContent='Não consegui preparar o arquivo. Tente criar novamente.'}
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pulsoIaBuild);else pulsoIaBuild();
