import {
  auth,
  authErrorMessage,
  sendEmailVerification,
  signUpEmail
} from "./firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase.js";

const form=document.getElementById("signupForm"),message=document.getElementById("message"),submit=document.getElementById("submitBtn");
const successTitle=document.getElementById("successTitle"),successText=document.getElementById("successText"),formTitle=document.getElementById("formTitle"),formSubtitle=document.getElementById("formSubtitle");
const emailTab=document.getElementById("emailTab"),phoneTab=document.getElementById("phoneTab"),emailField=document.getElementById("emailField"),phoneField=document.getElementById("phoneField");
let method="email";

function showMessage(text,type){message.textContent=text;message.className=`message show ${type}`;}
function cleanUsername(v){return v.trim().toLowerCase().replace(/^@+/,"");}
function ageFromBirthDate(value){const d=new Date(`${value}T00:00:00`);if(Number.isNaN(d.getTime()))return null;let age=new Date().getFullYear()-d.getFullYear();const before=new Date().getMonth()<d.getMonth()||(new Date().getMonth()===d.getMonth()&&new Date().getDate()<d.getDate());if(before)age--;return age;}
function setMethod(next){method=next;const phone=next==="phone";emailTab.classList.toggle("active",!phone);phoneTab.classList.toggle("active",phone);emailField.classList.toggle("hidden",phone);phoneField.classList.toggle("hidden",!phone);document.getElementById("email").required=!phone;document.getElementById("phone").required=phone;document.getElementById(phone?"phone":"email").focus();}
emailTab.addEventListener("click",()=>setMethod("email"));
phoneTab.addEventListener("click",()=>showMessage("O cadastro por celular será ativado depois que configurarmos o provedor SMS do Firebase.","error"));

function showConfirmation(text){form.classList.add("hidden");document.getElementById("authTabs").classList.add("hidden");formTitle.classList.add("hidden");formSubtitle.classList.add("hidden");successTitle.classList.remove("hidden");successText.innerHTML=text;showMessage("Cadastro realizado. Confirme seu e-mail para continuar.","success");}
async function createProfile(uid,data){
  await setDoc(doc(db,"profiles",uid),{
    id:uid,
    username:data.username,
    display_name:data.displayName,
    bio:"",
    avatar_url:null,
    birth_date:data.birthDate,
    status:"",
    member_number:null,
    created_at:serverTimestamp(),
    updated_at:serverTimestamp()
  });
}
form.addEventListener("submit",async event=>{
  event.preventDefault();message.className="message";
  const displayName=document.getElementById("displayName").value.trim(),username=cleanUsername(document.getElementById("username").value),birthDate=document.getElementById("birthDate").value,age=ageFromBirthDate(birthDate),email=document.getElementById("email").value.trim().toLowerCase(),password=document.getElementById("password").value,passwordConfirm=document.getElementById("passwordConfirm").value,terms=document.getElementById("terms").checked;
  if(method!=="email")return showMessage("Neste momento o cadastro do PULSO usa e-mail. O SMS será configurado depois.","error");
  if(displayName.length<2)return showMessage("Digite seu nome.","error");
  if(!/^[a-z0-9_.]{3,24}$/.test(username))return showMessage("O usuário deve ter 3–24 caracteres: letras, números, _ ou .","error");
  if(!birthDate||age===null||age<0)return showMessage("Digite uma data de nascimento válida.","error");
  if(age<13)return showMessage("O PULSO não permite cadastro de menores de 13 anos.","error");
  if(!/^\S+@\S+\.\S+$/.test(email))return showMessage("Digite um e-mail válido.","error");
  if(password.length<8)return showMessage("A senha precisa ter pelo menos 8 caracteres.","error");
  if(password!==passwordConfirm)return showMessage("As senhas não são iguais.","error");
  if(!terms)return showMessage("Aceite os termos e as regras de segurança para continuar.","error");
  submit.disabled=true;submit.textContent="Criando sua conta...";
  try{
    const result=await signUpEmail(email,password);
    await createProfile(result.user.uid,{displayName,username,birthDate});
    showConfirmation(`Conta criada para <strong>@${username}</strong>.<br><br>Enviamos a confirmação para <strong>${email}</strong>. Verifique também o spam.${age<18?"<br><br><strong>Conta protegida:</strong> usuários de 13 a 17 anos precisam de aprovação de um responsável adulto antes de publicar.":""}`);
  }catch(error){
    showMessage(authErrorMessage(error),"error");
    submit.disabled=false;submit.textContent="Criar minha conta";
  }
});
