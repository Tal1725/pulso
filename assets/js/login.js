import { firebaseAuth, firebaseDb } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updatePassword
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { collection, getDocs, query, where, limit } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

const form=document.getElementById('loginForm'),
  msg=document.getElementById('message'),
  btn=document.getElementById('submitBtn');
const forgotLink=document.getElementById('forgotLink'),
  socialLogin=document.getElementById('socialLogin'),
  loginDivider=document.getElementById('loginDivider'),
  authTitle=document.getElementById('authTitle'),
  authSubtitle=document.getElementById('authSubtitle');
const emailTab=document.getElementById('emailTab'),
  phoneTab=document.getElementById('phoneTab'),
  label=document.getElementById('identifierLabel'),
  identifier=document.getElementById('identifier');
let method='email';

function normalizePhone(value){
  const digits=String(value||'').replace(/\D/g,'');
  return digits.startsWith('55') ? digits : '55'+digits;
}

async function phoneToSyntheticEmail(phone){
  const normalized=normalizePhone(phone);
  if(normalized.length<12 || normalized.length>13) throw new Error('Digite um celular válido com DDD.');
  const storedPhone='+'+normalized;
  const snap=await getDocs(query(collection(firebaseDb,'Perfis'),where('phone','==',storedPhone),limit(1)));
  if(snap.empty) throw new Error('Celular não encontrado. Verifique o número ou entre com seu e-mail.');
  return normalized+'@phone.pulso.local';
}

function show(t,c='error'){
  msg.textContent=t;
  msg.className=`message show ${c}`;
}
function setMethod(next){
  method=next;
  const phone=next==='phone';
  emailTab.classList.toggle('active',!phone);
  phoneTab.classList.toggle('active',phone);
  label.textContent=phone?'Celular':'E-mail';
  identifier.type=phone?'tel':'email';
  identifier.inputMode=phone?'tel':'email';
  identifier.autocomplete=phone?'tel':'username';
  identifier.placeholder=phone?'(12) 99999-9999':'voce@email.com';
  identifier.value='';
  forgotLink.textContent=phone?'Esqueci minha senha por celular':'Esqueci minha senha';
  identifier.focus();
}
emailTab.addEventListener('click',()=>setMethod('email'));
phoneTab.addEventListener('click',()=>setMethod('phone'));

form.addEventListener('submit',async e=>{
  e.preventDefault();
  btn.disabled=true;
  btn.textContent='Entrando...';
  try{
    let email=identifier.value.trim().toLowerCase();
    if(method==='phone') email=await phoneToSyntheticEmail(identifier.value.trim());
    const password=document.getElementById('password').value;
    if(!email) throw new Error('Digite seu e-mail.');
    if(!password) throw new Error('Digite sua senha.');

    await signInWithEmailAndPassword(firebaseAuth,email,password);
    location.href='app.html';
  }catch(err){
    const code=err?.code||'';
    const text=err?.message||'';
    const friendly={
      'auth/invalid-credential':'E-mail ou senha incorretos.',
      'auth/invalid-login-credentials':'E-mail ou senha incorretos.',
      'auth/user-not-found':'E-mail ou senha incorretos.',
      'auth/wrong-password':'E-mail ou senha incorretos.',
      'auth/too-many-requests':'Muitas tentativas. Aguarde um pouco e tente novamente.',
      'auth/network-request-failed':'Não foi possível conectar ao Firebase. Verifique sua internet.'
    };
    show(friendly[code]||text||'Não foi possível entrar agora.');
    btn.disabled=false;
    btn.textContent='Entrar';
  }
});

forgotLink.addEventListener('click',async e=>{
  e.preventDefault();
  if(method==='phone'){
    show('A recuperação por celular ainda não está habilitada. Use seu e-mail.');
    return;
  }
  const email=identifier.value.trim().toLowerCase();
  if(!email){
    show('Digite seu e-mail acima para receber o link de recuperação.');
    identifier.focus();
    return;
  }
  forgotLink.textContent='Enviando...';
  try{
    await sendPasswordResetEmail(firebaseAuth,email,{
      url:'https://tal1725.github.io/pulso/entrar.html'
    });
    show('Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha. Verifique sua caixa de entrada e o spam.','success');
  }catch(err){
    show(err?.message||'Não foi possível enviar o link de recuperação.');
  }finally{
    forgotLink.textContent='Esqueci minha senha';
  }
});

function showRecoveryForm(user){
  authTitle.textContent='Criar nova senha';
  authSubtitle.textContent='Digite uma nova senha para recuperar seu acesso ao PULSO.';
  socialLogin?.classList.add('hidden');
  loginDivider?.classList.add('hidden');
  forgotLink?.classList.add('hidden');
  document.getElementById('authTabs')?.classList.add('hidden');
  form.innerHTML=`<div class="field"><label for="newPassword">Nova senha</label><input id="newPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Mínimo de 8 caracteres"></div><div class="field"><label for="confirmPassword">Confirmar nova senha</label><input id="confirmPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Digite novamente a senha"></div><button class="btn" id="recoveryBtn">Salvar nova senha</button><div class="message" id="message" role="status"></div>`;
  const recoveryBtn=document.getElementById('recoveryBtn'),
    recoveryMsg=document.getElementById('message');
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const p=document.getElementById('newPassword').value,
      c=document.getElementById('confirmPassword').value;
    if(p.length<8){
      recoveryMsg.textContent='A senha deve ter pelo menos 8 caracteres.';
      recoveryMsg.className='message show error';
      return;
    }
    if(p!==c){
      recoveryMsg.textContent='As senhas não coincidem.';
      recoveryMsg.className='message show error';
      return;
    }
    recoveryBtn.disabled=true;
    recoveryBtn.textContent='Salvando...';
    try{
      await updatePassword(user,p);
      recoveryMsg.textContent='Senha alterada com sucesso! Redirecionando...';
      recoveryMsg.className='message show success';
      setTimeout(()=>{location.href='app.html'},1200);
    }catch(err){
      recoveryMsg.textContent=err?.message||'Não foi possível alterar a senha.';
      recoveryMsg.className='message show error';
      recoveryBtn.disabled=false;
      recoveryBtn.textContent='Salvar nova senha';
    }
  },{once:true});
}

onAuthStateChanged(firebaseAuth,user=>{
  const params=new URLSearchParams(location.search);
  if(params.get('mode')==='resetPassword' && user){
    showRecoveryForm(user);
  }
});
