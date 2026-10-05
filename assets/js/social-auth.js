import{firebaseAuth}from'./firebase-config.js';
import{GoogleAuthProvider,FacebookAuthProvider,TwitterAuthProvider,signInWithPopup}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';

const providers={
  google:{label:'Google',provider:new GoogleAuthProvider()},
  facebook:{label:'Facebook',provider:new FacebookAuthProvider()},
  twitter:{label:'X',provider:new TwitterAuthProvider()}
};

async function login(providerKey){
  const item=providers[providerKey];
  const msg=document.getElementById('socialMessage');
  document.querySelectorAll('[data-social-provider]').forEach(b=>b.disabled=true);
  if(msg){msg.textContent=`Conectando com ${item?.label||'o provedor'}...`;msg.className='social-message'}
  try{
    if(!item)throw new Error('Provedor não configurado');
    const result=await signInWithPopup(firebaseAuth,item.provider);
    const user=result.user;
    if(msg){msg.textContent=`✓ Bem-vindo, ${user.displayName||'ao PULSO'}!`;msg.className='social-message'}
    setTimeout(()=>{location.href='app.html'},250);
  }catch(e){
    console.error('[PULSO] login social',e);
    let text='Não foi possível entrar agora.';
    if(e?.code==='auth/popup-closed-by-user')text='A janela de login foi fechada.';
    else if(e?.code==='auth/popup-blocked')text='O navegador bloqueou a janela de login. Permita pop-ups para o PULSO.';
    else if(e?.code==='auth/operation-not-allowed')text='Este provedor ainda não está ativado no Firebase.';
    if(msg){msg.textContent=text;msg.className='message show error'}
    document.querySelectorAll('[data-social-provider]').forEach(b=>b.disabled=false);
  }
}

window.pulsoSocialLogin=login;
document.querySelectorAll('[data-social-provider]').forEach(b=>{
  b.addEventListener('click',()=>login(b.dataset.socialProvider));
});
