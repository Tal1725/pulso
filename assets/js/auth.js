import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';

const SUPABASE_URL = 'https://vqpavcyehgdifbtvzhcn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const form = document.getElementById('signupForm');
const message = document.getElementById('message');
const submit = document.getElementById('submitBtn');

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message show ${type}`;
}

function cleanUsername(value) {
  return value.trim().toLowerCase().replace(/^@+/, '');
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
        emailRedirectTo: 'https://tal1725.github.io/pulso/cadastro.html'
      }
    });

    if (error) throw error;

    if (data.user) {
      form.classList.add('hidden');
      document.getElementById('successTitle').classList.remove('hidden');
      document.getElementById('successText').textContent = `Conta criada para @${username}. Verifique seu e-mail para confirmar o cadastro e continuar no PULSO.`;
      showMessage('Cadastro realizado com sucesso!', 'success');
    }
  } catch (error) {
    const friendly = error?.message || 'Não foi possível criar sua conta agora.';
    showMessage(friendly, 'error');
    submit.disabled = false;
    submit.textContent = 'Criar minha conta';
  }
});
