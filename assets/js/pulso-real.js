import{firebaseAuth,firebaseDb}from'./firebase-config.js';
import{doc,setDoc,collection,query,where,getDocs}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

const HOLD_MS=3000;
const active=new Map();

function addPulseButton(likeBtn){
  if(!likeBtn||likeBtn.dataset.pulsoRealReady==='1')return;
  const card=likeBtn.closest('[data-post]');
  const postId=card?.dataset.post;
  if(!postId)return;
  likeBtn.dataset.pulsoRealReady='1';
  addPulseReputation(card,postId);

  const btn=document.createElement('button');
  btn.type='button';
  btn.className='action pulso-real-button';
  btn.setAttribute('aria-label','Segure por 3 segundos para enviar seu PULSO');
  btn.innerHTML='<span class="pulso-heart">♡</span><span class="pulso-label">Segure para Pulsar</span>';
  const actions=likeBtn.closest('.actions');
  if(actions) actions.appendChild(btn);

  const cancel=()=>{
    const raf=active.get(postId);
    if(raf)cancelAnimationFrame(raf);
    active.delete(postId);
    btn.classList.remove('is-holding');
    btn.style.removeProperty('--pulso-progress');
  };

  const finish=async()=>{
    const uid=firebaseAuth.currentUser?.uid;
    if(!uid){
      btn.querySelector('.pulso-label').textContent='Faça login para pulsar';
      setTimeout(()=>btn.querySelector('.pulso-label').textContent='Segure para Pulsar',1800);
      return;
    }
    try{
      const data={post_id:postId,user_id:uid,type:'real_hold',reaction:'pulse',duration_ms:HOLD_MS,created_at:new Date().toISOString()};
      await setDoc(doc(firebaseDb,'PulsosReais',postId+'_'+uid),data);
      showPulseBurst(card);
      refreshPulseReputation(card,postId);
      btn.classList.remove('is-holding');
      btn.classList.add('pulse-success');
      btn.querySelector('.pulso-heart').textContent='❤️';
      btn.querySelector('.pulso-label').textContent='PULSO enviado';
      const video=card.querySelector('video.video');
      video?.classList.add('pulso-beat');
      setTimeout(()=>video?.classList.remove('pulso-beat'),1400);
      setTimeout(()=>{btn.classList.remove('pulse-success');btn.querySelector('.pulso-heart').textContent='♡';btn.querySelector('.pulso-label').textContent='Segure para Pulsar'},1800);
    }catch(e){
      console.error('[PULSO REAL]',e);
      btn.classList.remove('is-holding');
      btn.querySelector('.pulso-label').textContent='Tente novamente';
      setTimeout(()=>btn.querySelector('.pulso-label').textContent='Segure para Pulsar',1600);
    }
  };

  const start=()=>{
    if(active.has(postId))return;
    const started=performance.now();
    btn.classList.add('is-holding');
    const tick=()=>{
      const elapsed=performance.now()-started;
      btn.style.setProperty('--pulso-progress',Math.min(100,elapsed/HOLD_MS*100)+'%');
      if(elapsed>=HOLD_MS){active.delete(postId);finish();return;}
      active.set(postId,requestAnimationFrame(tick));
    };
    active.set(postId,requestAnimationFrame(tick));
  };

  btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture?.(e.pointerId);start()});
  btn.addEventListener('pointerup',e=>{e.preventDefault();if(active.has(postId))cancel()});
  btn.addEventListener('pointercancel',cancel);
  btn.addEventListener('pointerleave',e=>{if(e.buttons===0)cancel()});
}

function enhance(){
  document.querySelectorAll('[data-post] [data-like]').forEach(addPulseButton);
}

document.addEventListener('pulso-feed-rendered',enhance);
new MutationObserver(enhance).observe(document.body,{subtree:true,childList:true});
enhance();


async function getPulseCount(postId){
  try{const snap=await getDocs(query(collection(firebaseDb,'PulsosReais'),where('post_id','==',postId)));return snap.size;}catch(e){console.warn('[PULSO REAL] contador',e);return 0;}
}
function addPulseReputation(card,postId){
  if(card.querySelector('.pulso-reputation'))return;
  const el=document.createElement('div');el.className='pulso-reputation';el.innerHTML='<span class="pulso-reputation-hearts">♡</span><span class="pulso-reputation-text">PULSO REAL <b>0</b></span>';
  card.appendChild(el);refreshPulseReputation(card,postId);
}
async function refreshPulseReputation(card,postId){
  const el=card?.querySelector('.pulso-reputation');if(!el)return;const n=await getPulseCount(postId);el.querySelector('b').textContent=n;el.classList.toggle('has-pulses',n>0);el.querySelector('.pulso-reputation-hearts').textContent=n>0?'♥♥♥':'♡';
}
function showPulseBurst(card){
  const burst=document.createElement('div');burst.className='pulso-heart-burst';
  for(let i=0;i<12;i++){const h=document.createElement('span');h.textContent='♥';h.style.setProperty('--i',i);burst.appendChild(h);}
  card.appendChild(burst);setTimeout(()=>burst.remove(),1800);
}
