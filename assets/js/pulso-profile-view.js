import { auth, db } from './firebase.js';
import { onAuthStateChanged } from './firebase-auth.js';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[m]));

let currentUser = null;

function mediaTime(value) {
  if (value?.seconds) return value.seconds * 1000;
  const t = Date.parse(value || '');
  return Number.isFinite(t) ? t : 0;
}

function activateLazyMedia(root = document) {
  const videos = root.querySelectorAll('video[data-src]');
  if (!videos.length) return;
  const load = v => {
    const src = v.dataset.src;
    if (!src || v.src) return;
    v.src = src;
    v.removeAttribute('data-src');
    try { v.load(); } catch (_) {}
  };
  if (!('IntersectionObserver' in window)) {
    videos.forEach(load);
    return;
  }
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      load(entry.target);
      io.unobserve(entry.target);
    }
  }), { rootMargin:'500px 0px' });
  videos.forEach(v => io.observe(v));
}

async function getProfile(id) {
  const snap = await getDoc(doc(db, 'profiles', id));
  return snap.exists() ? { id:snap.id, ...snap.data() } : null;
}

async function getPosts(id) {
  const snap = await getDocs(query(collection(db, 'posts'), where('user_id','==',id), limit(50)));
  const rows = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  rows.sort((a,b) => mediaTime(b.created_at) - mediaTime(a.created_at));
  return rows;
}

async function count(field, id) {
  const snap = await getDocs(query(collection(db,'follows'), where(field,'==',id)));
  return snap.size;
}

async function openProfile(targetId = null) {
  const user = auth.currentUser || currentUser;
  if (!user) {
    location.href = 'entrar.html?next=app';
    return;
  }

  const id = targetId || user.uid;
  let m = document.getElementById('pulsoProfileView');
  if (m) m.remove();

  m = document.createElement('div');
  m.id = 'pulsoProfileView';
  m.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.86);overflow:auto;padding:18px;box-sizing:border-box';
  m.innerHTML =
    '<div style="max-width:760px;margin:20px auto;background:#17171b;color:#fff;border-radius:20px;padding:20px;box-sizing:border-box">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 id="ppTitle" style="margin:0">Perfil</h2><button id="ppClose" type="button" style="background:#303038;color:#fff;border:0;border-radius:10px;padding:10px 14px">Fechar</button></div>' +
    '<div id="ppBody" style="margin-top:18px">Carregando...</div></div>';
  document.body.appendChild(m);
  m.querySelector('#ppClose').onclick = () => m.remove();

  const body = m.querySelector('#ppBody');

  try {
    const [p, posts, followers, following] = await Promise.all([
      getProfile(id),
      getPosts(id),
      count('following_id', id),
      count('follower_id', id)
    ]);

    if (!p) throw new Error('Perfil não encontrado.');

    const avatar = p.avatar_url
      ? '<img src="' + esc(p.avatar_url) + '" alt="Foto de perfil" style="width:86px;height:86px;border-radius:50%;object-fit:cover">'
      : '<div style="width:86px;height:86px;border-radius:50%;display:grid;place-items:center;background:#303038;font-size:34px;font-weight:900">' +
        esc((p.display_name || 'P')[0].toUpperCase()) + '</div>';

    const media = post => {
      const src = esc(post.media_url || post.video_url || '');
      if (!src) return '<div style="padding:28px;border-radius:14px;background:#090a0c;color:#9da3b5">📝 Publicação em texto</div>';
      if (post.media_type === 'image') return '<img src="' + src + '" alt="Publicação PULSO" loading="lazy" style="display:block;width:100%;max-height:460px;object-fit:contain;border-radius:14px;background:#090a0c">';
      if (post.media_type === 'audio') return '<audio src="' + src + '" controls preload="none" style="width:100%"></audio>';
      return '<video data-src="' + src + '" controls playsinline preload="none" style="display:block;width:100%;max-height:460px;border-radius:14px;background:#090a0c"></video>';
    };

    const html = posts.length
      ? posts.map(post =>
          '<article style="padding:16px 0;border-top:1px solid rgba(255,255,255,.1)">' +
          media(post) +
          '<div style="margin-top:9px;line-height:1.45">' + esc(post.caption || '') + '</div>' +
          '<div style="margin-top:6px;font-size:12px;color:#8f95a8">' +
          (mediaTime(post.created_at) ? new Date(mediaTime(post.created_at)).toLocaleString('pt-BR') : '') +
          '</div></article>'
        ).join('')
      : '<div style="padding:22px 0;color:#aeb4c8">Nenhuma publicação encontrada para este perfil.</div>';

    m.querySelector('#ppTitle').textContent = id === user.uid ? 'Meu perfil' : 'Perfil do usuário';
    body.innerHTML =
      '<div style="display:flex;gap:16px;align-items:center">' +
      avatar +
      '<div><h3 style="margin:0 0 4px">' + esc(p.display_name || 'Usuário') + '</h3>' +
      '<div style="opacity:.7">' + (p.username ? '@' + esc(p.username) : 'membro PULSO') + '</div>' +
      '<div style="margin-top:8px">' + esc(p.bio || p.status || '') + '</div></div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:20px">' +
      '<span style="padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.06)"><strong>' + followers + '</strong> seguidores</span>' +
      '<span style="padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.06)"><strong>' + following + '</strong> seguindo</span>' +
      '<span style="padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.06)"><strong>' + posts.length + '</strong> publicações</span>' +
      '</div><div style="margin-top:10px">' + html + '</div>';

    activateLazyMedia(body);
  } catch (e) {
    console.error('[PULSO] perfil', e);
    body.innerHTML = '<div style="color:#ff8a8a;padding:18px 0">Não foi possível carregar o perfil: ' + esc(e.message || e) + '</div>';
  }
}

window.pulsoOpenProfile = openProfile;
onAuthStateChanged(auth, user => { currentUser = user; });
