import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';

const PULSO_SUPABASE_URL = 'https://vqpavcyehgdifbtvzhcn.supabase.co';
const PULSO_SUPABASE_KEY = 'sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm';
const db = createClient(PULSO_SUPABASE_URL, PULSO_SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = (s) => document.querySelector(s);
const msg = (text, error = false) => {
  const el = $('#publishMsg');
  if (el) { el.textContent = text; el.style.color = error ? '#ff7b7b' : ''; }
};

async function withTimeout(promise, ms = 45000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('A operação demorou demais. Verifique sua conexão e tente novamente.')), ms); })
    ]);
  } finally { clearTimeout(timer); }
}

function fileExt(file) {
  const ext = (file?.name?.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (ext) return ext;
  if (file?.type === 'image/jpeg') return 'jpg';
  if (file?.type === 'image/png') return 'png';
  if (file?.type === 'audio/mpeg') return 'mp3';
  if (file?.type === 'audio/wav') return 'wav';
  return 'bin';
}

async function publish() {
  const btn = $('#publishBtn');
  const caption = ($('#caption')?.value || '').trim();
  const video = $('#video')?.files?.[0] || null;
  const audio = $('#audioInput')?.files?.[0] || null;
  const typeInput = $('#mediaType')?.value || 'video';
  const file = video || audio;
  const mediaType = video ? 'video' : audio ? 'audio' : typeInput;

  if (!file) {
    msg('Escolha um vídeo, foto ou áudio antes de publicar.', true);
    return;
  }
  if (file.size > 100 * 1024 * 1024) {
    msg('O arquivo deve ter no máximo 100 MB.', true);
    return;
  }
  if (mediaType === 'video' && !file.type.startsWith('video/')) {
    msg('O arquivo escolhido não é um vídeo válido.', true);
    return;
  }
  if (mediaType === 'audio' && !file.type.startsWith('audio/')) {
    msg('O arquivo escolhido não é um áudio válido.', true);
    return;
  }

  btn.disabled = true;
  const oldText = btn.textContent;
  btn.textContent = 'Enviando...';
  msg('Enviando mídia e salvando sua publicação...');

  try {
    const { data: sessionData, error: sessionError } = await withTimeout(db.auth.getSession());
    if (sessionError) throw sessionError;
    const user = sessionData?.session?.user;
    if (!user) throw new Error('Sua sessão expirou. Entre novamente no PULSO.');

    const path = `${user.id}/${crypto.randomUUID()}.${fileExt(file)}`;
    const upload = await withTimeout(
      db.storage.from('pulso-videos').upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false
      })
    );
    if (upload.error) throw new Error(`Falha no armazenamento: ${upload.error.message}`);

    const { data: publicData } = db.storage.from('pulso-videos').getPublicUrl(path);
    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) throw new Error('O arquivo foi enviado, mas não foi possível obter o endereço da mídia.');

    const row = {
      user_id: user.id,
      caption,
      media_type: mediaType,
      media_url: publicUrl,
      video_url: mediaType === 'video' ? publicUrl : null
    };

    const insert = await withTimeout(db.from('posts').insert(row).select('id').single());
    if (insert.error) {
      // Do not leave an orphaned uploaded file when the database refuses the post.
      await db.storage.from('pulso-videos').remove([path]).catch(() => {});
      throw new Error(`A mídia foi enviada, mas a publicação não foi salva: ${insert.error.message}`);
    }

    msg('✅ Publicado no PULSO!');
    if ($('#caption')) $('#caption').value = '';
    if ($('#video')) $('#video').value = '';
    if ($('#audioInput')) $('#audioInput').value = '';
    if ($('#mediaType')) $('#mediaType').value = 'video';

    // Ask the existing feed to refresh without reloading the page.
    document.dispatchEvent(new CustomEvent('pulso-published', { detail: { postId: insert.data?.id } }));
    setTimeout(() => {
      const notice = $('#notice');
      if (notice) notice.textContent = 'Publicação enviada com sucesso. Seu PULSO já está no feed.';
      msg('');
    }, 1200);
  } catch (err) {
    console.error('[PULSO publish final]', err);
    msg(`❌ ${err?.message || 'Não foi possível publicar agora.'}`, true);
  } finally {
    btn.disabled = false;
    btn.textContent = oldText || 'Publicar';
  }
}

function install() {
  const btn = $('#publishBtn');
  if (!btn || btn.dataset.finalPublishInstalled === '1') return;
  btn.dataset.finalPublishInstalled = '1';
  btn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    publish();
  }, true);

  document.addEventListener('pulso-published', () => {
    // The main app exposes no public refresh function, so reload only after a successful insert.
    setTimeout(() => window.location.reload(), 900);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
const observer = new MutationObserver(install);
observer.observe(document.body, { childList: true, subtree: true });
