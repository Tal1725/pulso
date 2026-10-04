import { firebaseAuth, firebaseDb } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

const form=document.getElementById('signupForm'),message=document.getElementById('message'),submit=document.getElementById('submitBtn');
const successTitle=document.getElementById('successTitle'),successText=document.getElementById('successText'),formTitle=document.getElementById('formTitle'),formSubtitle=document.getElementById('formSubtitle');
const emailTab=document.getElementById('emailTab'),phoneTab=document.getElementById('phoneTab'),emailField=document.getElementById('emailField'),phoneField=document.getElementById('phoneField');
let method='email';

function showMessage(text,type){message.textContent=text;message.className=`message show ${type}`}
function cleanUsername(v){return v.trim().toLowerCase().replace(/^@+/,'')}
function normalizePhone(v){const digits=v.replace(/\D/g,'');if(digits.startsWith('55')&&digits.length>=12)return `+${digits}`;return `+55${digits}`}
function ageFromBirthDate(value){const d=new Date(`${value}T00:00:00`);if(Number.isNaN(d.getTime()))return null;const now=new Date();let age=now.getFullYear()-d.getFullYear();const beforeBirthday=now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate());if(beforeBirthday)age--;return age}

function setMethod(next){
  method=next;
  const phone=next==='phone';
  emailTab.classList.toggle('active',!phone);
  phoneTab.classList.toggle('active',phone);
  emailField.classList.toggle('hidden',phone);
  phoneField.classList.toggle('hidden',!phone);
  document.getElementById('email').required=!phone;
  document.getElementById('phone').required=phone;
  if(phone) showMessage('O cadastro por celular está em migração para o Firebase. Por enquanto, crie sua conta por e-mail.','error');
  else message.className='message';
}
emailTab.addEventListener('click',()=>setMethod('email'));
phoneTab.addEventListener('click',()=>setMethod('phone'));

function showConfirmation(text){
  form.classList.add('hidden');
  document.getElementById('authTabs').classList.add('hidden');
  formTitle.classList.add('hidden');
  formSubtitle.classList.add('hidden');
  successTitle.classList.remove('hidden');
  successText.innerHTML=text;
  showMessage('Cadastro realizado. Confirme seu e-mail para continuar.','success');
}

async function usernameExists(username){
  const q=query(collection(firebaseDb,'Perfis'),where('username','==',username));
  const snap=await getDocs(q);
  return !snap.empty;
}

form.addEventListener('submit',async event=>{
  event.preventDefault();
  message.className='message';
  const displayName=document.getElementById('displayName').value.trim();
  const username=cleanUsername(document.getElementById('username').value);
  const birthDate=document.getElementById('birthDate').value;
  const age=ageFromBirthDate(birthDate);
  const email=document.getElementById('email').value.trim().toLowerCase();
  const password=document.getElementById('password').value;
  const passwordConfirm=document.getElementById('passwordConfirm').value;
  const terms=document.getElementById('terms').checked;

  if(method!=='email')return showMessage('Por enquanto, finalize o cadastro usando E-mail. O cadastro por celular será migrado para o Firebase em seguida.','error');
  if(displayName.length<2)return showMessage('Digite seu nome.','error');
  if(!/^[a-z0-9_.]{3,24}$/.test(username))return showMessage('O usuário deve ter 3–24 caracteres: letras, números, _ ou .','error');
  if(!birthDate||age===null||age<0)return showMessage('Digite uma data de nascimento válida.','error');
  if(age<13)return showMessage('O PULSO não permite cadastro de menores de 13 anos.','error');
  if(!/^\S+@\S+\.\S+$/.test(email))return showMessage('Digite um e-mail válido.','error');
  if(password.length<8)return showMessage('A senha precisa ter pelo menos 8 caracteres.','error');
  if(password!==passwordConfirm)return showMessage('As senhas não são iguais.','error');
  if(!terms)return showMessage('Aceite os termos e as regras de segurança para continuar.','error');

  submit.disabled=true;
  submit.textContent='Criando sua conta...';
  try{
    if(await usernameExists(username))throw Object.assign(new Error('Esse nome de usuário já está em uso. Escolha outro.'),{code:'username-already-exists'});

    const {user}=await createUserWithEmailAndPassword(firebaseAuth,email,password);
    await setDoc(doc(firebaseDb,'Perfis',user.uid),{
      id:user.uid,
      user_id:user.uid,
      display_name:displayName,
      username,
      birth_date:birthDate,
      bio:'',
      status:'',
      avatar_url:null,
      protected_account:age<18,
      created_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    },{merge:true});

    try{await sendEmailVerification(user)}catch(e){console.warn('[PULSO] confirmação de e-mail',e)}

    const extra=age<18?'<br><br><strong>Conta protegida:</strong> usuários de 13 a 17 anos precisam de aprovação de um responsável adulto antes de publicar.':'';
    showConfirmation(`Conta criada para <strong>@${username}</strong>.<br><br>Enviamos a confirmação para <strong>${email}</strong>. Verifique também o spam.${extra}`);
  }catch(error){
    const code=error?.code||'';
    const friendly={
      'auth/email-already-in-use':'Este e-mail já está cadastrado. Tente entrar na sua conta.',
      'auth/invalid-email':'Digite um e-mail válido.',
      'auth/weak-password':'A senha precisa ter pelo menos 8 caracteres.',
      'auth/network-request-failed':'Não foi possível conectar ao Firebase. Verifique sua internet.',
      'username-already-exists':error.message
    };
    showMessage(friendly[code]||error?.message||'Não foi possível criar sua conta agora.','error');
  }finally{
    submit.disabled=false;
    submit.textContent='Criar minha conta';
  }
});