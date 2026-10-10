import{firebaseAuth,firebaseDb}from'./firebase-config.js';
import{addDoc,collection}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
const CLOUDINARY_CLOUD_NAME='zzllchy7',CLOUDINARY_UPLOAD_PRESET='pulso_publico',$=s=>document.querySelector(s);
let publishing=false;
const msg=(t,e)=>{const x=$('#publishMsg');if(x){x.textContent=t;x.style.color=e?'#ff6b6b':'';}};
async function publish(){
 if(publishing)return;const b=$('#publishBtn');if(!b)return;
 const caption=$('#caption')?.value?.trim()||'',file=window.pulsoApprovedMedia?.file||$('#video')?.files?.[0]||$('#photoInput')?.files?.[0]||$('#cameraVideoInput')?.files?.[0]||$('#audioInput')?.files?.[0],uid=firebaseAuth.currentUser?.uid;
 if(!file&&!caption){msg('Escolha um vídeo, foto, áudio ou escreva algo.',true);return}if(!uid){msg('Sessão expirada. Entre novamente no PULSO.',true);return}
 publishing=true;b.disabled=true;b.textContent='Publicando...';
 try{let type='text',url=null;
  if(file){const mime=file.type||'';type=mime.startsWith('image/')?'image':mime.startsWith('audio/')?'audio':'video';msg('Enviando mídia...');const endpoint='https://api.cloudinary.com/v1_1/'+CLOUDINARY_CLOUD_NAME+'/'+(type==='image'?'image':'video')+'/upload',form=new FormData();form.append('file',file);form.append('upload_preset',CLOUDINARY_UPLOAD_PRESET);form.append('folder','pulso/'+uid);const r=await fetch(endpoint,{method:'POST',body:form}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d?.error?.message||'Cloudinary recusou o arquivo.');url=d.secure_url||d.url;if(!url)throw Error('O armazenamento não retornou a URL da mídia.');}
  const ref=await addDoc(collection(firebaseDb,'Posts'),{user_id:uid,caption,media_type:type,media_url:url,video_url:type==='video'?url:null,created_at:new Date().toISOString()});
  window.pulsoApprovedMedia=null;['caption','video','photoInput','cameraVideoInput','audioInput'].forEach(id=>{const x=$('#'+id);if(x)x.value=''});msg('✅ Publicado com sucesso!');document.dispatchEvent(new CustomEvent('pulso-published',{detail:{postId:ref.id,mediaType:type,mediaUrl:url}}));
 }catch(e){console.error('[PULSO publish]',e);msg('❌ '+(e.message||'Não foi possível publicar.'),true)}finally{publishing=false;b.disabled=false;b.textContent='Publicar'}
}
window.pulsoPublish=publish;window.pulsoPublisherVersion='firebase-v4';
let audioRecorder=null,audioChunks=[];
async function recordAudio(){
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Seu navegador não liberou acesso ao microfone.');
  if(typeof MediaRecorder==='undefined')throw Error('Seu navegador não suporta gravação de áudio.');
  if(audioRecorder?.state==='recording'){audioRecorder.stop();return}
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});audioChunks=[];
  const m=document.createElement('div');m.id='pulsoAudioRecorder';m.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML='<div style="background:#17171b;color:#fff;border-radius:20px;padding:24px;text-align:center;width:min(420px,100%)"><h2>🎤 Gravando áudio</h2><p>O microfone está ativo.</p><button id="pulsoStopAudio" type="button">⏹ Parar gravação</button> <button id="pulsoCancelAudio" type="button">Cancelar</button></div>';
  document.body.appendChild(m);const options=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?{mimeType:'audio/webm;codecs=opus'}:{};audioRecorder=new MediaRecorder(stream,options);
  audioRecorder.ondataavailable=e=>{if(e.data.size)audioChunks.push(e.data)};
  audioRecorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(audioChunks,{type:audioRecorder.mimeType||'audio/webm'});window.pulsoApprovedMedia={file:new File([blob],'pulso-audio-'+Date.now()+'.webm',{type:blob.type})};$('#pulsoAudioRecorder')?.remove();msg('🎤 Áudio gravado. Agora clique em Publicar.');audioRecorder=null};
  $('#pulsoStopAudio').onclick=()=>audioRecorder?.stop();$('#pulsoCancelAudio').onclick=()=>{if(audioRecorder){audioRecorder.ondataavailable=null;audioRecorder.onstop=null;audioRecorder.stop();audioRecorder=null}stream.getTracks().forEach(t=>t.stop());$('#pulsoAudioRecorder')?.remove();audioChunks=[]};audioRecorder.start(250);
 }catch(e){msg('❌ '+(e.message||'Não foi possível acessar o microfone.'),true);console.error('[PULSO audio]',e)}
}
window.pulsoRecordAudio=recordAudio;
let cameraStream=null,cameraRecorder=null,cameraChunks=[];
async function openCamera(){
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Seu navegador não liberou acesso à câmera.');
  if(cameraStream)return;
  cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:true});
  const m=document.createElement('div');m.id='pulsoCameraModal';m.style.cssText='position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;padding:16px';
  m.innerHTML='<div style="width:min(520px,100%);background:#17171b;color:#fff;border-radius:20px;padding:16px;text-align:center"><h2>📹 Câmera</h2><video id="pulsoCameraPreview" autoplay playsinline muted style="width:100%;max-height:60vh;object-fit:cover;border-radius:16px;background:#000"></video><div style="display:flex;gap:10px;justify-content:center;margin-top:14px"><button id="pulsoCameraRecord" type="button">🔴 Gravar</button><button id="pulsoCameraStop" type="button" disabled>⏹ Parar</button><button id="pulsoCameraClose" type="button">Fechar</button></div><p id="pulsoCameraMsg"></p></div>';
  document.body.appendChild(m);const video=$('#pulsoCameraPreview');video.srcObject=cameraStream;
  const stopStream=()=>{cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null;cameraRecorder=null;cameraChunks=[];m.remove()};
  $('#pulsoCameraRecord').onclick=()=>{if(!cameraStream||cameraRecorder)return;cameraChunks=[];const options=MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')?{mimeType:'video/webm;codecs=vp8,opus'}:{};cameraRecorder=new MediaRecorder(cameraStream,options);cameraRecorder.ondataavailable=e=>{if(e.data.size)cameraChunks.push(e.data)};cameraRecorder.onstop=()=>{const blob=new Blob(cameraChunks,{type:cameraRecorder.mimeType||'video/webm'});window.pulsoApprovedMedia={file:new File([blob],'pulso-camera-'+Date.now()+'.webm',{type:blob.type})};$('#pulsoCameraMsg').textContent='✅ Vídeo gravado. Clique em Publicar.';$('#pulsoCameraRecord').disabled=false;$('#pulsoCameraStop').disabled=true};cameraRecorder.start(250);$('#pulsoCameraRecord').disabled=true;$('#pulsoCameraStop').disabled=false;$('#pulsoCameraMsg').textContent='🔴 Gravando...'};
  $('#pulsoCameraStop').onclick=()=>{if(cameraRecorder?.state==='recording')cameraRecorder.stop()};
  $('#pulsoCameraClose').onclick=stopStream;
 }catch(e){cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null;msg('❌ '+(e.message||'Não foi possível acessar a câmera.'),true);console.error('[PULSO camera]',e)}
}
window.pulsoOpenCamera=openCamera;
let photoStream=null;
async function openPhotoCamera(){
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Seu navegador não liberou acesso à câmera.');
  if(photoStream)return;
  photoStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
  const m=document.createElement('div');m.id='pulsoPhotoModal';m.style.cssText='position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;padding:16px';
  m.innerHTML='<div style="width:min(520px,100%);background:#17171b;color:#fff;border-radius:20px;padding:16px;text-align:center"><h2>📸 Tirar foto</h2><video id="pulsoPhotoPreview" autoplay playsinline muted style="width:100%;max-height:65vh;object-fit:cover;border-radius:16px;background:#000"></video><div style="display:flex;gap:10px;justify-content:center;margin-top:14px"><button id="pulsoPhotoCapture" type="button">📸 Tirar foto</button><button id="pulsoPhotoClose" type="button">Fechar</button></div><p id="pulsoPhotoMsg"></p></div>';
  document.body.appendChild(m);const video=$('#pulsoPhotoPreview');video.srcObject=photoStream;
  const close=()=>{photoStream?.getTracks().forEach(t=>t.stop());photoStream=null;m.remove()};
  $('#pulsoPhotoCapture').onclick=()=>{if(!video.videoWidth)return;const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{if(!blob)return;window.pulsoApprovedMedia={file:new File([blob],'pulso-foto-'+Date.now()+'.jpg',{type:'image/jpeg'})};$('#pulsoPhotoMsg').textContent='✅ Foto capturada. Clique em Publicar.';close();msg('📸 Foto capturada. Agora clique em Publicar.');},'image/jpeg',.92)};
  $('#pulsoPhotoClose').onclick=close;
 }catch(e){photoStream?.getTracks().forEach(t=>t.stop());photoStream=null;msg('❌ '+(e.message||'Não foi possível acessar a câmera para a foto.'),true);console.error('[PULSO photo]',e)}
}
window.pulsoOpenPhoto=openPhotoCamera;
function bind(){
 const b=$('#publishBtn'),p=$('#photoInput'),v=$('#cameraVideoInput'),pb=document.querySelector('#pulsoPhotoButton'),vb=document.querySelector('#pulsoCameraButton'),ab=document.querySelector('[data-audio-record]');
 if(pb&&!pb.dataset.bound){pb.dataset.bound=1;pb.onclick=e=>{e.preventDefault();e.stopPropagation();openPhotoCamera()}}
 if(vb&&!vb.dataset.bound){vb.dataset.bound=1;vb.onclick=e=>{e.preventDefault();e.stopPropagation();openCamera()}}
 if(ab&&!ab.dataset.bound){ab.dataset.bound=1;ab.onclick=e=>{e.preventDefault();e.stopPropagation();recordAudio()}}
 if(b&&!b.dataset.firebase){b.dataset.firebase=1;b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();publish()})}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
