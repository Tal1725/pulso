import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';

const SUPABASE_URL = 'https://vqpavcyehgdifbtvzhcn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const form = document.getElementById('signupForm');
const message = document.getElementById('message');
const submit = document.getElementById('submitBtn');
const successTitle = document.getElementById('successTitle');
const successText = document.getElementById('successText');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message show ${type}`;
}

function cleanUsername(value) {
  return value.trim().toLowerCase().replace(/^@+/, '');
}

function showConfirmationScreen(email, username) {
  form.classList.add('hidden');
  formTitle.classList.add('hidden');
  formSubtitle.classList.add('hidden');
  successTitle.classList.remove('hidden');
  successText.innerHTML = `Conta criada para <strong>@${username}</strong>.<br><br>Enviamos a confirmação para <strong>${email}</strong>. Verifique também a pasta de spam/lixo eletrônico.<br><br>Depois de confirmar, entre no PULSO.`;
  showMessage('Cadastro realizado. Confirme seu e-mail para continuar.', 'success');
}

function addResendButton(email) {
  if (document.getElementById('resendConfirmation')) return;
  const button = document.createElement('button');
  button.id = 'resendConfirmation';
  button.type = 'button';
  button.className = 'btn';
  button.style.marginTop = '12px';
  button.textContent = 'Reenviar e-mail de confirmação';
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Reenviando...';
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) {
      showMessage(error.message || 'Não foi possível reenviar agora. Aguarde alguns segundos e tente novamente.', 'error');
      button.disabled = false;
      button.textContent = 'Reenviar e-mail de confirmação';
      return;
    }
    showMessage('Novo e-mail de confirmação solicitado. Verifique sua caixa de entrada e o spam.', 'success');
    button.disabled = false;
    button.textContent = 'Reenviar e-mail de confirmação';
  });
  successText.insertAdjacentElement('afterend', button);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.className = 'message';

  const displayName = document.getElementById('displayName').value.trim();
  const username = cleanUsername(document.getElementById('username').value);
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('passwordConfirm').value;
  const terms = document.getElementById('terms').checked;

  if (displayName.length < 2) return showMessage('Digite seu nome.', 'error');
  if (!/^[a-z0-9_.]{3,24}$/.test(username)) return showMessage('O usuário deve ter 3–24 caracteres: letras, números, _ ou .', 'error');
  if (!/^\S+@\S+\.\S+$/.test(email)) return showMessage('Digite um e-mail válido.', 'error');
  if (password.length < 8) return showMessage('A senha precisa ter pelo menos 8 caracteres.', 'error');
  if (password !== passwordConfirm) return showMessage('As senhas não são iguais.', 'error');
  if (!terms) return showMessage('Aceite os termos para continuar.', 'error');

  submit.disabled = true;
  submit.textContent = 'Criando sua conta...';

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, username },
        emailRedirectTo: 'https://tal1725.github.io/pulso/entrar.html'
      }
    });

    if (error) throw error;

    if (data.session) {
      window.location.href = 'app.html';
      return;
    }

    if (data.user) {
      showConfirmationScreen(email, username);
      addResendButton(email);
    }
  } catch (error) {
    const friendly = error?.message || 'Não foi possível criar sua conta agora.';
    showMessage(friendly, 'error');
    submit.disabled = false;
    submit.textContent = 'Criar minha conta';
  }
});
