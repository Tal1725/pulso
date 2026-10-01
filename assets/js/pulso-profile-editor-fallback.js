import { auth, db } from './firebase.js';
import { onAuthStateChanged } from './firebase-auth.js';
import { doc, getDoc, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[m]));

let uid = null;

function css() {
  if (document.getElementById('pulso-editor-fallback-css')) return;
  const s = document.createElement('style');
  s.id = 'pulso-editor-fallback-css';
  s.textContent =
    '.pef{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}.pef[hidden]{display:none}.pef-card{width:min(520px,100%);max-height:92vh;overflow:auto;background:#17171b;color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:20px;box-sizing:border-box;box-shadow:0 20px 70px rgba(0,0,0,.55)}.pef h2{margin:0 0 16px}.pef label{display:block;font-weight:700;margin:12px 0}.pef input,.pef textarea{display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:#0f1013;color:#fff}.pef-actions{display:flex;gap:10px;margin-top:18px}.pef-actions button{flex:1;padding:12px;border-radius:10px;border:0;font-weight:800}.pef-save{background:#ff3d7e;color:#fff}.pef-close{background:#303038;color:#fff}.pef-msg{margin-top:10px;color:#c9ccda}.pef-photo{display:flex;align-items:center;gap:14px}.pef-preview{width:78px;height:78px;border-radius:50%;overflow:hidden;background:#303038;display:grid;place-items:center;font-size:28px;font-weight:900}.pef-preview img{width:100%;height:100%;object-fit:cover}';
  document.head.appendChild(s);
}

function modal() {
  let m = document.getElementById('pulsoEditorFallback');
  if (m) return m;
  css();
  m = document.createElement('div');
  m.id = 'pulsoEditorFallback';
  m.className = 'pef';
  m.hidden = true;
  m.innerHTML =
    '<div class="pef-card" role="dialog" aria-modal="true">' +
    '<button id="pefX" type="button" style="float:right;background:none;border:0;color:#fff;font-size:25px">×</button>' +
    '<h2>Editar meu perfil</h2><div id="pefBody">Carregando...</div></div>';
  document.body.appendChild(m);
  m.addEventListener('click', e => { if (e.target === m) m.hidden = true; });
  m.querySelector('#pefX').onclick = () => { m.hidden = true; };
  return m;
}

function val(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

async function loadProfile() {
  if (!uid) throw new Error('Sua sessão expirou. Entre novamente no PULSO.');
  const snap = await getDoc(doc(db, 'profiles', uid));
  if (!snap.exists()) throw new Error('Seu perfil ainda não foi criado.');
  return { id:snap.id, ...snap.data() };
}

async function uploadAvatar(file) {
  const cfg = window.PULSO_MEDIA_CONFIG || {};
  if (!cfg.cloudName || !cfg.uploadPreset) {
    throw new Error('O Cloudinary do PULSO ainda não foi configurado.');
  }

  const endpoint = 'https://api.cloudinary.com/v1_1/' +
    encodeURIComponent(cfg.cloudName) + '/image/upload';
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', cfg.uploadPreset);
  form.append('folder', 'pulso/' + uid + '/avatars');

  const response = await fetch(endpoint, { method:'POST', body:form });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message || ('Falha no envio da foto (HTTP ' + response.status + ').'));
  }
  if (!data?.secure_url) throw new Error('O Cloudinary não retornou a foto.');
  return data.secure_url;
}

async function openFallback() {
  const m = modal();
  m.hidden = false;
  const body = m.querySelector('#pefBody');
  body.textContent = 'Carregando seu perfil...';

  try {
    const p = await loadProfile();

    body.innerHTML =
      '<div class="pef-photo"><div class="pef-preview" id="pefPrev">' +
      (p.avatar_url ? '<img src="' + esc(p.avatar_url) + '">' : esc((p.display_name || '?')[0].toUpperCase())) +
      '</div><label style="flex:1">Foto<input id="pefPhoto" type="file" accept="image/*"></label></div>' +
      '<label>Nome<input id="pefName" maxlength="80" value="' + esc(p.display_name || '') + '"></label>' +
      '<label>Usuário<input id="pefUser" maxlength="40" value="' + esc(p.username || '') + '"></label>' +
      '<label>Data de nascimento<input id="pefBirth" type="date" value="' + esc(p.birth_date || '') + '"></label>' +
      '<label>Bio<textarea id="pefBio" maxlength="280" rows="3">' + esc(p.bio || '') + '</textarea></label>' +
      '<label>Status<input id="pefStatus" maxlength="160" value="' + esc(p.status || '') + '"></label>' +
      '<div class="pef-actions"><button id="pefCancel" class="pef-close" type="button">Cancelar</button><button id="pefSave" class="pef-save" type="button">Salvar</button></div>' +
      '<div id="pefMsg" class="pef-msg"></div>';

    document.getElementById('pefCancel').onclick = () => { m.hidden = true; };
    document.getElementById('pefPhoto').onchange = e => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) {
        e.target.value = '';
        alert('A foto deve ter no máximo 5 MB.');
        return;
      }
      document.getElementById('pefPrev').innerHTML = '<img src="' + URL.createObjectURL(f) + '">';
    };
    document.getElementById('pefSave').onclick = saveFallback;
  } catch (e) {
    body.innerHTML =
      '<div class="pef-msg">Não foi possível carregar: ' + esc(e.message || 'erro') + '</div>' +
      '<div class="pef-actions"><button class="pef-close" type="button" id="pefErrClose">Fechar</button></div>';
    document.getElementById('pefErrClose').onclick = () => { m.hidden = true; };
  }
}

async function saveFallback() {
  const b = document.getElementById('pefSave');
  const message = document.getElementById('pefMsg');
  b.disabled = true;
  message.textContent = 'Salvando...';

  try {
    const p = await loadProfile();
    const name = val('pefName');
    const username = val('pefUser').toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const birth = document.getElementById('pefBirth')?.value || p.birth_date || '';
    const bio = val('pefBio');
    const status = val('pefStatus');
    const file = document.getElementById('pefPhoto')?.files?.[0];

    if (name.length < 2) throw new Error('Informe um nome com pelo menos 2 caracteres.');
    if (username.length < 3) throw new Error('O usuário precisa ter pelo menos 3 caracteres.');

    let avatar_url = p.avatar_url || null;
    if (file) {
      message.textContent = 'Enviando foto...';
      avatar_url = await uploadAvatar(file);
    }

    await setDoc(doc(db, 'profiles', uid), {
      display_name:name,
      username,
      birth_date:birth,
      bio,
      status,
      avatar_url,
      updated_at:serverTimestamp()
    }, { merge:true });

    message.textContent = 'Perfil atualizado com sucesso!';
    window.dispatchEvent(new CustomEvent('pulso-profile-updated'));
    setTimeout(() => {
      const modalEl = document.getElementById('pulsoEditorFallback');
      if (modalEl) modalEl.hidden = true;
    }, 500);
  } catch (e) {
    message.textContent = e.message || 'Não foi possível salvar.';
  } finally {
    b.disabled = false;
  }
}

window.pulsoOpenEditorFallback = openFallback;
onAuthStateChanged(auth, user => { uid = user?.uid || null; });

window.addEventListener('DOMContentLoaded', () => {
  const b = document.getElementById('profileBtn');
  if (!b || b.dataset.pulsoEditorBound) return;
  b.dataset.pulsoEditorBound = '1';
  b.onclick = e => {
    e.preventDefault();
    e.stopImmediatePropagation();
    openFallback();
  };
});
