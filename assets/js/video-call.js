import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';
const sb=createClient('https://vqpavcyehgdifbtvzhcn.supabase.co','sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let me=null,contact=null,pendingCaller=null,inbox=null,callChannel=null,pc=null,localStream=null,currentCallId=null,inCall=false;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const pairTopic=id=>{const p=[me,id].sort();return`pulso-call:${p[0]}:${p[1]}`};
function ensureUI(){
 if($('#videoCallModal'))return;
 document.body.insertAdjacentHTML('beforeend',`<div id="videoCallModal" class="modal" hidden><div class="modal-card video-call-card"><div class="modal-head"><div><h2 id="videoCallTitle">📹 Chamada de vídeo</h2><span id="videoCallStatus" class="modal-subtitle">Conectando…</span></div><button id="videoCallClose" class="modal-close" type="button">×</button></div><div class="video-call-stage"><video id="videoCallRemote" autoplay playsinline></video><video id="videoCallLocal" autoplay muted playsinline></video><div id="videoCallEmpty">Aguardando vídeo…</div></div><div class="video-call-actions"><button id="videoCallMute" class="pill" type="button">🎙️ Microfone</button><button id="videoCallCamera" class="pill" type="button">📷 Câmera</button><button id="videoCallEnd" class="pill primary" type="button">☎️ Encerrar</button></div></div></div><div id="incomingCallModal" class="modal" hidden><div class="modal-card incoming-call-card"><div class="incoming-call-icon">📹</div><h2 id="incomingCallTitle">Chamada de vídeo</h2><p id="incomingCallText">Alguém está chamando você no PULSO.</p><div class="video-call-actions"><button id="incomingDecline" class="pill" type="button">Recusar</button><button id="incomingAccept" class="pill primary" type="button">Atender</button></div></div></div>`);
 $('#videoCallClose').onclick=endCall;$('#videoCallEnd').onclick=endCall;
 $('#videoCallMute').onclick=()=>{const t=localStream?.getAudioTracks()[0];if(t){t.enabled=!t.enabled;$('#videoCallMute').textContent=t.enabled?'🎙️ Microfone':'🔇 Microfone'}}; 
 $('#videoCallCamera').onclick=()=>{const t=localStream?.getVideoTracks()[0];if(t){t.enabled=!t.enabled;$('#videoCallCamera').textContent=t.enabled?'📷 Câmera':'🚫 Câmera'}};
 $('#incomingDecline').onclick=()=>{if(inbox&&currentCallId)inbox.send({type:'broadcast',event:'call',payload:{type:'decline',callId:currentCallId,from:me}});currentCallId=null;pendingCaller=null;$('#incomingCallModal').hidden=true};
 $('#incomingAccept').onclick=acceptIncoming;
 const style=document.createElement('style');style.textContent=`.video-call-card{width:min(920px,96vw)}.video-call-stage{position:relative;aspect-ratio:16/9;background:#08090d;border-radius:20px;overflow:hidden;margin:12px 0}.video-call-stage video{width:100%;height:100%;object-fit:cover}.video-call-stage #videoCallLocal{position:absolute;right:14px;bottom:14px;width:24%;height:28%;border:2px solid rgba(255,255,255,.8);border-radius:14px;background:#111;object-fit:cover}.video-call-stage #videoCallEmpty{position:absolute;inset:0;display:grid;place-items:center;color:#b8bfd0;font-weight:700;pointer-events:none}.video-call-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}.video-call-header-btn{margin-left:auto;flex:none}.incoming-call-card{text-align:center;padding:34px}.incoming-call-icon{font-size:54px;margin-bottom:8px}.video-call-status-error{color:#ff8e9b!important}`;document.head.appendChild(style);
}
async function auth(){const{data}=await sb.auth.getSession();me=data.session?.user?.id||null;return me}
async function subscribeInbox(){if(!me)return;try{await sb.realtime.setAuth()}catch{}if(inbox)await sb.removeChannel(inbox);inbox=sb.channel(`pulso-call-inbox:${me}`,{config:{private:true}}).on('broadcast',{event:'call'},({payload})=>handleInbox(payload)).subscribe((status,err)=>{if(status==='CHANNEL_ERROR')console.warn('PULSO call inbox',err)});
}
function handleInbox(p){if(!p||p.from===me)return;if(p.type==='invite'){pendingCaller=p.from;currentCallId=p.callId;$('#incomingCallTitle').textContent='📹 Chamada de vídeo';$('#incomingCallText').textContent=`${p.name||'Um contato'} está chamando você no PULSO.`;$('#incomingCallModal').hidden=false}}
async function ensureMedia(){if(localStream)return localStream;localStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:true});$('#videoCallLocal').srcObject=localStream;return localStream}
async function joinPair(other,caller){
 const topic=pairTopic(other);try{await sb.realtime.setAuth()}catch{}
 if(callChannel)await sb.removeChannel(callChannel);
 callChannel=sb.channel(topic,{config:{private:true}}).on('broadcast',{event:'signal'},({payload})=>handleSignal(payload)).subscribe(async(status,err)=>{
   if(status==='CHANNEL_ERROR'){setStatus('Não foi possível conectar a chamada.',true);console.warn('PULSO call channel',err);return}
   if(status==='SUBSCRIBED'&&caller){await createOffer(other)}
 });
}
function setStatus(t,error=false){const el=$('#videoCallStatus');if(el){el.textContent=t;el.classList.toggle('video-call-status-error',error)}}
async function createOffer(other){if(!callChannel)return;pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));bindPeer(other);const offer=await pc.createOffer();await pc.setLocalDescription(offer);await sendSignal(other,{type:'offer',from:me,to:other,sdp:pc.localDescription,callId:currentCallId})}
function bindPeer(other){pc.ontrack=e=>{const v=$('#videoCallRemote');if(e.streams[0]){v.srcObject=e.streams[0];$('#videoCallEmpty').hidden=true}};pc.onicecandidate=e=>{if(e.candidate)sendSignal(other,{type:'ice',from:me,to:other,candidate:e.candidate,callId:currentCallId})};pc.onconnectionstatechange=()=>{if(pc&&['failed','disconnected','closed'].includes(pc.connectionState))setStatus('Conexão encerrada.')}} 
async function sendSignal(other,payload){if(callChannel)try{await callChannel.send({type:'broadcast',event:'signal',payload})}catch(e){console.warn(e)}}
async function handleSignal(p){if(!p||p.to!==me)return;if(p.type==='offer'){if(!pc){pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));bindPeer(p.from)}await pc.setRemoteDescription(p.sdp);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await sendSignal(p.from,{type:'answer',from:me,to:p.from,sdp:pc.localDescription,callId:p.callId});setStatus('🟢 Chamada conectada');}
else if(p.type==='answer'&&pc&&!pc.currentRemoteDescription){await pc.setRemoteDescription(p.sdp);setStatus('🟢 Chamada conectada')}
else if(p.type==='ice'&&pc&&p.candidate){try{await pc.addIceCandidate(p.candidate)}catch{}}
else if(p.type==='hangup'){endCall(false)}
}
async function startCall(){if(!me||!contact)return;const other=contact.id;if(!navigator.mediaDevices?.getUserMedia){alert('Seu navegador não oferece chamada de vídeo segura. Use Chrome ou Edge atualizado.');return}try{currentCallId=crypto.randomUUID();await ensureMedia();$('#videoCallTitle').textContent='📹 '+(contact.display_name||'Chamada de vídeo');$('#videoCallModal').hidden=false;setStatus('Chamando '+(contact.display_name||'usuário')+'…');await joinPair(other,true);const name=contact.display_name||'Seu contato';await inbox?.send({type:'broadcast',event:'call',payload:{type:'invite',from:me,callId:currentCallId,name}})}catch(e){console.error(e);setStatus('Não foi possível iniciar a câmera/microfone.',true);cleanupMedia()}}
async function acceptIncoming(){if(pendingCaller){const{data}=await sb.from('profiles').select('id,display_name,username,avatar_url,birth_date').eq('id',pendingCaller).maybeSingle();if(data)contact=data}if(!contact){$('#incomingCallModal').hidden=true;return}$('#incomingCallModal').hidden=true;try{await ensureMedia();$('#videoCallTitle').textContent='📹 '+(contact.display_name||'Chamada de vídeo');$('#videoCallModal').hidden=false;setStatus('Conectando…');await joinPair(contact.id,false)}catch(e){setStatus('Não foi possível atender.',true)}}
async function endCall(notify=true){if(notify&&contact&&callChannel)await sendSignal(contact.id,{type:'hangup',from:me,to:contact.id});if(callChannel){try{await sb.removeChannel(callChannel)}catch{}callChannel=null}if(pc){pc.close();pc=null}cleanupMedia();$('#videoCallModal')?.setAttribute('hidden','');if($('#videoCallModal'))$('#videoCallModal').hidden=true;currentCallId=null}
function cleanupMedia(){localStream?.getTracks().forEach(t=>t.stop());localStream=null;if($('#videoCallLocal'))$('#videoCallLocal').srcObject=null;if($('#videoCallRemote'))$('#videoCallRemote').srcObject=null;if($('#videoCallEmpty'))$('#videoCallEmpty').hidden=false}
function addVideoButton(){
 const compose=document.querySelector('.message-compose');
 if(compose&&!$('#videoCallLaunch')){
  const b=document.createElement('button');b.id='videoCallLaunch';b.className='pill';b.type='button';b.textContent='📹 Vídeo';b.title='Chamada de vídeo';b.setAttribute('aria-label','Iniciar chamada de vídeo');b.onclick=startCall;compose.insertBefore(b,compose.firstChild);
 }
 const head=document.querySelector('#messagesModal .modal-head');
 if(head&&!$('#videoCallLaunchHeader')){
  const b=document.createElement('button');b.id='videoCallLaunchHeader';b.className='pill video-call-header-btn';b.type='button';b.textContent='📹 Vídeo';b.title='Selecione um contato para iniciar a chamada';b.disabled=!contact;b.onclick=startCall;head.appendChild(b);
 }
 const ready=!!contact;
 ['#videoCallLaunch','#videoCallLaunchHeader'].forEach(sel=>{const b=$(sel);if(b){b.disabled=!ready;b.style.opacity=ready?'1':'.55';b.title=ready?'Iniciar chamada de vídeo':'Abra uma conversa e selecione um contato primeiro'}})
}
function bind(){document.addEventListener('click',async e=>{const b=e.target.closest('[data-person]');if(!b)return;const{data}=await sb.from('profiles').select('id,display_name,username,avatar_url,birth_date').eq('id',b.dataset.person).maybeSingle();if(data){contact=data;ensureUI();addVideoButton();window.dispatchEvent(new CustomEvent('pulso-message-contact',{detail:data}))}},{capture:true});document.addEventListener('pulso-message-contact',e=>{contact=e.detail||null;ensureUI();addVideoButton()});const observer=new MutationObserver(()=>{if(document.getElementById('messageThread')&&!document.getElementById('messageThread').hidden)addVideoButton()});observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('pulso-message-closed',()=>{contact=null;$('#videoCallLaunch')?.remove();$('#videoCallLaunchHeader')?.remove()})}
(async()=>{ensureUI();if(await auth()){bind();await subscribeInbox()}})();
