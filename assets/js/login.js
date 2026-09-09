import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';

const supabase=createClient('https://vqpavcyehgdifbtvzhcn.supabase.co','sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const form=document.getElementById('loginForm');
const msg=document.getElementById('message');
const btn=document.getElementById('submitBtn');
const forgotLink=document.getElementById('forgotLink');
const socialLogin=document.getElementById('socialLogin');
const loginDivider=document.getElementById('loginDivider');
const authTitle=document.getElementById('authTitle');
const authSubtitle=document.getElementById('authSubtitle');

function show(t,c='error'){msg.textContent=t;msg.className=`message show ${c}`}

form.addEventListener('submit',async e=>{e.preventDefault();btn.disabled=true;btn.textContent='Entrando...';try{const email=document.getElementById('email').value.trim().toLowerCase();const password=document.getElementById('password').value;const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;location.href='app.html'}catch(err){show(err.message==='Invalid login credentials'?'E-mail ou senha incorretos.':(err.message||'Não foi possível entrar agora.'));btn.disabled=false;btn.textContent='Entrar'}});

forgotLink.addEventListener('click',async e=>{
  e.preventDefault();
  const email=document.getElementById('email').value.trim().toLowerCase();
  if(!email){show('Digite seu e-mail acima para receber o link de recuperação.');document.getElementById('email').focus();return}
  forgotLink.textContent='Enviando...';
  try{
    const redirectTo=`${window.location.origin}${window.location.pathname}`;
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo});
    if(error)throw error;
    show('Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha. Verifique sua caixa de entrada e o spam.','success');
  }catch(err){show(err.message||'Não foi possível enviar o link de recuperação.')}
  finally{forgotLink.textContent='Esqueci minha senha'}
});

function showRecoveryForm(){
  authTitle.textContent='Criar nova senha';
  authSubtitle.textContent='Digite uma nova senha para recuperar seu acesso ao PULSO.';
  socialLogin.classList.add('hidden');
  loginDivider.classList.add('hidden');
  forgotLink.classList.add('hidden');
  form.innerHTML=`<div class="field"><label for="newPassword">Nova senha</label><input id="newPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Mínimo de 8 caracteres"></div><div class="field"><label for="confirmPassword">Confirmar nova senha</label><input id="confirmPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Digite novamente a senha"></div><button class="btn" id="recoveryBtn">Salvar nova senha</button><div class="message" id="message" role="status"></div>`;
  const recoveryBtn=document.getElementById('recoveryBtn');
  const recoveryMsg=document.getElementById('message');
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const p=document.getElementById('newPassword').value;
    const c=document.getElementById('confirmPassword').value;
    if(p.length<8){recoveryMsg.textContent='A senha deve ter pelo menos 8 caracteres.';recoveryMsg.className='message show error';return}
    if(p!==c){recoveryMsg.textContent='As senhas não coincidem.';recoveryMsg.className='message show error';return}
    recoveryBtn.disabled=true;recoveryBtn.textContent='Salvando...';
    const {error}=await supabase.auth.updateUser({password:p});
    if(error){recoveryMsg.textContent=error.message||'Não foi possível alterar a senha.';recoveryMsg.className='message show error';recoveryBtn.disabled=false;recoveryBtn.textContent='Salvar nova senha';return}
    recoveryMsg.textContent='Senha alterada com sucesso! Redirecionando...';recoveryMsg.className='message show success';
    setTimeout(()=>{location.href='app.html'},1200);
  },{once:true});
}

supabase.auth.onAuthStateChange((event)=>{
  if(event==='PASSWORD_RECOVERY') showRecoveryForm();
});