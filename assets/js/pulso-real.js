import{firebaseAuth,firebaseDb}from'./firebase-config.js';
import{doc,setDoc,deleteDoc}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

const HOLD_MS=3000;
const active=new Map();

function pulseButton(btn){
  if(btn.dataset.pulsoReal==='1')return;
  btn.dataset.pulsoReal='1';
  const pulse=document.createElement('button');
  pulse.type='button';
  pulse.className='pulso-real-button';
  pulse.setAttribute('aria-label','Segure por 3 segundos para enviar seu PULSO');
  pulse.innerHTML='<span class="pulso-heart">♡</span><span class="pulso-label">Segure para Pulsar</span><span class="pulso-count"></span>';
  btn.insertAdjacentElement('afterend',pulse);

  const card=btn.closest('[data-post]');
  const postId=card?.dataset.post;
  if(!postId)return;
  pulseButton(pulse);

  const start=()=>{
    if(active.has(postId))return;
    const started=performance.now();
    btn.classList.add('is-holding');
    btn.style.setProperty('--pulso-progress','0%');
    const tick=()=>{
      const elapsed=performance.now()-started;
      const pct=Math.min(100,elapsed/HOLD_MS*100);
      btn.style.setProperty('--pulso-progress',pct+'%');
      if(elapsed>=HOLD_MS){active.delete(postId);finish(btn,postId);return}
      active.set(postId,requestAnimationFrame(tick));
    };
    active.set(postId,requestAnimationFrame(tick));
  };
  const cancel=()=>{
    const raf=active.get(postId);
    if(raf)cancelAnimationFrame(raf);
    active.delete(postId);
    btn.classList.remove('is-holding');
    btn.style.removeProperty('--pulso-progress');
  };
  btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture?.(e.pointerId);start()});
  btn.addEventListener('pointerup',e=>{e.preventDefault();if(active.has(postId))cancel()});
  btn.addEventListener('pointercancel',cancel);
  btn.addEventListener('pointerleave',e=>{if(e.buttons===0)cancel()});
  btn.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();start()}});
  btn.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(active.has(postId))cancel()}});
}

async function finish(btn,postId){
  const uid=firebaseAuth.currentUser?.uid;
  if(!uid){btn.classList.remove('is-holding');return}
  try{
    const data={post_id:postId,user_id:uid,type:'real_hold',reaction:'pulse',duration_ms:HOLD_MS,created_at:new Date().toISOString()};
    try{
      await setDoc(doc(firebaseDb,'PulsosReais',postId+'_'+uid),data);
    }catch(primaryError){
      console.warn('[PULSO REAL] PulsosReais indisponível; usando fallback Gostos',primaryError);
      await setDoc(doc(firebaseDb,'Gostos','pulse_'+postId+'_'+uid),data);
    }
    btn.classList.remove('is-holding');
    btn.classList.add('pulse-success');
    btn.querySelector('.pulso-heart').textContent='❤️';
    const label=btn.querySelector('.pulso-label');if(label)label.textContent='PULSO enviado';
    const video=btn.closest('[data-post]')?.querySelector('video.video');
    video?.classList.add('pulso-beat');
    setTimeout(()=>video?.classList.remove('pulso-beat'),1400);
    setTimeout(()=>{btn.classList.remove('pulse-success');btn.querySelector('.pulso-heart').textContent='♡';if(label)label.textContent='Segure para Pulsar'},1800);
  }catch(e){
    console.error('[PULSO REAL]',e);
    btn.classList.remove('is-holding');
    const label=btn.querySelector('.pulso-label');if(label)label.textContent='Tente novamente';
    setTimeout(()=>{if(label)label.textContent='Segure para Pulsar'},1600);
  }
}

function enhance(){
  document.querySelectorAll('[data-post] [data-like]').forEach(pulseButton);
}

document.addEventListener('pulso-feed-rendered',enhance);
new MutationObserver(enhance).observe(document.body,{subtree:true,childList:true});
enhance();
