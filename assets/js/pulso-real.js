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

  let holdStartedAt=0;
  let holdTimer=0;
  let holding=false;

  const resetHold=()=>{
    holding=false;
    clearTimeout(holdTimer);
    holdTimer=0;
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
      const media=card.querySelector('video.video, img.video');
      if(media){
        media.classList.remove('pulso-beat');
        void media.offsetWidth;
        media.classList.add('pulso-beat');
        setTimeout(()=>media.classList.remove('pulso-beat'),2800);
      }
      setTimeout(()=>{btn.classList.remove('pulse-success');btn.querySelector('.pulso-heart').textContent='♡';btn.querySelector('.pulso-label').textContent='Segure para Pulsar'},1800);
    }catch(e){
      console.error('[PULSO REAL]',e);
      btn.classList.remove('is-holding');
      btn.querySelector('.pulso-label').textContent='Erro ao enviar — tente novamente';
      setTimeout(()=>btn.querySelector('.pulso-label').textContent='Segure para Pulsar',2200);
    }
  };

  const start=()=>{
    if(holding)return;
    holding=true;
    holdStartedAt=Date.now();
    active.set(postId,true);
    btn.classList.add('is-holding');
    btn.querySelector('.pulso-label').textContent='Continue segurando…';
    const updateProgress=()=>{
      if(!holding)return;
      const elapsed=Date.now()-holdStartedAt;
      btn.style.setProperty('--pulso-progress',Math.min(100,elapsed/HOLD_MS*100)+'%');
      if(elapsed<HOLD_MS)requestAnimationFrame(updateProgress);
    };
    requestAnimationFrame(updateProgress);
    holdTimer=setTimeout(()=>{
      if(!holding)return;
      resetHold();
      btn.style.setProperty('--pulso-progress','100%');
      btn.dataset.pulsoCompletedClick='1';
      setTimeout(()=>delete btn.dataset.pulsoCompletedClick,900);
      finish();
    },HOLD_MS);
  };

  const stop=(e)=>{
    if(!holding)return;
    if(e?.cancelable)e.preventDefault();
    const elapsed=Date.now()-holdStartedAt;
    if(elapsed>=HOLD_MS){
      resetHold();
      btn.style.setProperty('--pulso-progress','100%');
      btn.dataset.pulsoCompletedClick='1';
      setTimeout(()=>delete btn.dataset.pulsoCompletedClick,900);
      finish();
    }else{
      resetHold();
    }
  };

  btn.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();start();});
  btn.addEventListener('pointerup',stop);
  btn.addEventListener('pointercancel',resetHold);
  btn.addEventListener('touchstart',e=>{e.preventDefault();start();},{passive:false});
  btn.addEventListener('touchend',stop,{passive:false});
  btn.addEventListener('touchcancel',resetHold);
  btn.addEventListener('mousedown',e=>{if(e.button===0)start();});
  btn.addEventListener('mouseup',stop);
  btn.addEventListener('mouseleave',e=>{if(e.buttons===0&&holding)stop(e);});
  // Fallback: if a mobile browser suppresses hold events, a normal click still responds.
  btn.addEventListener('click',()=>{
    if(holding)return;
    if(btn.dataset.pulsoCompletedClick==='1'){
      delete btn.dataset.pulsoCompletedClick;
      return;
    }
    finish();
  });
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
function addPulseAlert(card,n){
  let el=card.querySelector('.pulso-real-alert');
  if(n<10){el?.remove();return;}
  if(!el){
    el=document.createElement('div');el.className='pulso-real-alert';
    card.appendChild(el);
  }
  el.innerHTML='<span class="pulso-alert-icon">🔥</span><span>Este vídeo está recebendo muitas pulsações!</span><b>'+n+' pulsações</b>';
}
async function refreshPulseReputation(card,postId){
  const el=card?.querySelector('.pulso-reputation');if(!el)return;
  const n=await getPulseCount(postId);
  el.querySelector('b').textContent=n;
  el.classList.toggle('has-pulses',n>0);
  el.querySelector('.pulso-reputation-hearts').textContent=n>0?'♥♥♥':'♡';
  addPulseAlert(card,n);
}
function showPulseBurst(card){
  const burst=document.createElement('div');burst.className='pulso-heart-burst';
  const offsets=[[-145,-70],[-125,-120],[-105,-175],[-85,-95],[-65,-145],[-45,-205],[-25,-110],[-5,-165],[15,-225],[35,-120],[55,-180],[75,-105],[95,-155],[115,-215],[-115,-250],[-75,-285],[-30,-315],[20,-285],[65,-265],[110,-240],[-95,-335],[-45,-355],[10,-345],[60,-325],[105,-300]];
  offsets.forEach(([x,y],i)=>{const h=document.createElement('span');h.textContent='♥';h.style.setProperty('--dx',x+'px');h.style.setProperty('--dy',y+'px');h.style.fontSize=(24+(i%4)*2)+'px';h.style.animationDelay=(i*80)+'ms';burst.appendChild(h);});
  card.appendChild(burst);setTimeout(()=>burst.remove(),6500);
}
