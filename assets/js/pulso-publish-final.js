import{firebaseAuth,firebaseDb}from'./firebase-config.js';
import{addDoc,collection}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
const CLOUDINARY_CLOUD_NAME='zzllchy7',CLOUDINARY_UPLOAD_PRESET='pulso_publico',MAX_UPLOAD=50*1024*1024,$=s=>document.querySelector(s);
let publishing=false;
const msg=(t,e)=>{const x=$('#publishMsg');if(x){x.textContent=t;x.style.color=e?'#ff6b6b':'';}};
async function publish(){
 if(publishing)return;const b=$('#publishBtn');if(!b)return;
 const caption=$('#caption')?.value?.trim()||'',file=window.pulsoApprovedMedia?.file||$('#video')?.files?.[0]||$('#photoInput')?.files?.[0]||$('#cameraVideoInput')?.files?.[0]||$('#audioInput')?.files?.[0],uid=firebaseAuth.currentUser?.uid;
 if(!file&&!caption){msg('Escolha um vídeo, foto, áudio ou escreva algo.',true);return}if(!uid){msg('Sessão expirada. Entre novamente no PULSO.',true);return}
 publishing=true;b.disabled=true;b.textContent='Publicando...';
 try{let type='text',url=null;
  if(file){if(file.size>MAX_UPLOAD)throw Error('A mídia ultrapassa o limite de 50 MB.');const mime=file.type||'';type=mime.startsWith('image/')?'image':mime.startsWith('audio/')?'audio':'video';msg('Enviando mídia...');const endpoint='https://api.cloudinary.com/v1_1/'+CLOUDINARY_CLOUD_NAME+'/'+(type==='image'?'image':'video')+'/upload',form=new FormData();form.append('file',file);form.append('upload_preset',CLOUDINARY_UPLOAD_PRESET);form.append('folder','pulso/'+uid);const r=await fetch(endpoint,{method:'POST',body:form}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d?.error?.message||'Cloudinary recusou o arquivo.');url=d.secure_url||d.url;if(!url)throw Error('O armazenamento não retornou a URL da mídia.');}
  const ref=await addDoc(collection(firebaseDb,'Posts'),{user_id:uid,caption,media_type:type,media_url:url,video_url:type==='video'?url:null,created_at:new Date().toISOString()});
  window.pulsoApprovedMedia=null;['caption','video','photoInput','cameraVideoInput','audioInput'].forEach(id=>{const x=$('#'+id);if(x)x.value=''});msg('✅ Publicado com sucesso!');document.dispatchEvent(new CustomEvent('pulso-published',{detail:{postId:ref.id,mediaType:type,mediaUrl:url}}));
 }catch(e){console.error('[PULSO publish]',e);msg('❌ '+(e.message||'Não foi possível publicar.'),true)}finally{publishing=false;b.disabled=false;b.textContent='Publicar'}
}
window.pulsoPublish=publish;window.pulsoPublisherVersion='firebase-v1';
function bind(){const b=$('#publishBtn'),p=$('#photoInput'),v=$('#cameraVideoInput'),pb=document.querySelector('[data-camera-photo]'),vb=document.querySelector('[data-camera-video]');if(pb&&p&&!pb.dataset.bound){pb.dataset.bound=1;pb.onclick=()=>p.click()}if(vb&&v&&!vb.dataset.bound){vb.dataset.bound=1;vb.onclick=()=>v.click()}if(b&&!b.dataset.firebase){b.dataset.firebase=1;b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();publish()})}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();