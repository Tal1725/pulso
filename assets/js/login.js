import {
  auth,
  authErrorMessage,
  sendPasswordResetEmail,
  signInEmail,
  signOut,
  verifyPasswordResetCode,
  confirmPasswordReset
} from "./firebase-auth.js";

const form=document.getElementById("loginForm");
const msg=document.getElementById("message");
const btn=document.getElementById("submitBtn");
const forgotLink=document.getElementById("forgotLink");
const socialLogin=document.getElementById("socialLogin");
const loginDivider=document.getElementById("loginDivider");
const authTitle=document.getElementById("authTitle");
const authSubtitle=document.getElementById("authSubtitle");
const emailTab=document.getElementById("emailTab");
const phoneTab=document.getElementById("phoneTab");
const label=document.getElementById("identifierLabel");
const identifier=document.getElementById("identifier");

let method="email";
let resetCode=null;

function show(t,c="error"){msg.textContent=t;msg.className=`message show ${c}`;}

function setMethod(next){
  method=next;
  const phone=next==="phone";
  emailTab.classList.toggle("active",!phone);
  phoneTab.classList.toggle("active",phone);
  label.textContent=phone?"Celular":"E-mail";
  identifier.type=phone?"tel":"email";
  identifier.inputMode=phone?"tel":"email";
  identifier.autocomplete=phone?"tel":"username";
  identifier.placeholder=phone?"(12) 99999-9999":"voce@email.com";
  identifier.value="";
  forgotLink.textContent=phone?"Recuperação por celular ainda não está habilitada":"Esqueci minha senha";
  identifier.focus();
}

emailTab?.addEventListener("click",()=>setMethod("email"));
phoneTab?.addEventListener("click",()=>show("O login por celular será ativado quando configurarmos o provedor SMS do Firebase."));

form?.addEventListener("submit",async e=>{
  e.preventDefault();
  if(method==="phone"){show("O login por celular ainda não está habilitado no Firebase.");return;}
  btn.disabled=true;btn.textContent="Entrando...";
  try{
    const value=identifier.value.trim();
    const password=document.getElementById("password").value;
    if(!value)throw new Error("Digite seu e-mail.");
    if(!password)throw new Error("Digite sua senha.");
    const result=await signInEmail(value,password);
    if(!result.user.emailVerified){
      await signOut(auth);
      show("Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada e o spam.");
      return;
    }
    location.href="app.html";
  }catch(err){
    show(authErrorMessage(err));
  }finally{
    btn.disabled=false;btn.textContent="Entrar";
  }
});

forgotLink?.addEventListener("click",async e=>{
  e.preventDefault();
  if(method==="phone"){show("A recuperação por celular será adicionada quando configurarmos o SMS do Firebase.");return;}
  const email=identifier.value.trim().toLowerCase();
  if(!email){show("Digite seu e-mail acima para receber o link de recuperação.");identifier.focus();return;}
  forgotLink.textContent="Enviando...";
  try{
    await sendPasswordResetEmail(auth,email,{url:"https://tal1725.github.io/pulso/entrar.html"});
    show("Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha. Verifique também o spam.","success");
  }catch(err){show(authErrorMessage(err));}
  finally{forgotLink.textContent="Esqueci minha senha";}
});

function showRecoveryForm(){
  authTitle.textContent="Criar nova senha";
  authSubtitle.textContent="Digite uma nova senha para recuperar seu acesso ao PULSO.";
  socialLogin?.classList.add("hidden");loginDivider?.classList.add("hidden");forgotLink?.classList.add("hidden");document.getElementById("authTabs")?.classList.add("hidden");
  form.innerHTML=`<div class="field"><label for="newPassword">Nova senha</label><input id="newPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Mínimo de 8 caracteres"></div><div class="field"><label for="confirmPassword">Confirmar nova senha</label><input id="confirmPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Digite novamente a senha"></div><button class="btn" id="recoveryBtn">Salvar nova senha</button><div class="message" id="message" role="status"></div>`;
  const recoveryBtn=document.getElementById("recoveryBtn"),recoveryMsg=document.getElementById("message");
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const p=document.getElementById("newPassword").value,c=document.getElementById("confirmPassword").value;
    if(p.length<8){recoveryMsg.textContent="A senha deve ter pelo menos 8 caracteres.";recoveryMsg.className="message show error";return;}
    if(p!==c){recoveryMsg.textContent="As senhas não coincidem.";recoveryMsg.className="message show error";return;}
    recoveryBtn.disabled=true;recoveryBtn.textContent="Salvando...";
    try{
      if(resetCode)await confirmPasswordReset(auth,resetCode,p);
      else throw new Error("Link de recuperação inválido ou expirado.");
      recoveryMsg.textContent="Senha alterada com sucesso! Redirecionando...";
      recoveryMsg.className="message show success";
      history.replaceState({},document.title,location.pathname);
      setTimeout(()=>location.href="entrar.html",1200);
    }catch(err){recoveryMsg.textContent=authErrorMessage(err);recoveryMsg.className="message show error";recoveryBtn.disabled=false;recoveryBtn.textContent="Salvar nova senha";}
  },{once:true});
}

async function handleRecovery(){
  const params=new URLSearchParams(location.search);
  if(params.get("mode")!=="resetPassword")return;
  resetCode=params.get("oobCode");
  if(!resetCode){show("Link de recuperação inválido.");return;}
  try{await verifyPasswordResetCode(auth,resetCode);showRecoveryForm();}
  catch(err){show(authErrorMessage(err));}
}
handleRecovery();
