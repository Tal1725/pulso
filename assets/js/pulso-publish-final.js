/* PULSO — PUBLICADOR V14 — publicação sem recarregar a página */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://vqpavcyehgdifbtvzhcn.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm';
  const BUCKET = 'pulso-videos';
  const MAX_UPLOAD = 50 * 1024 * 1024;
  let dbPromise = null;
  let publishing = false;

  const $ = (selector) => document.querySelector(selector);

  function msg(text, error) {
    const el = $('#publishMsg');
    if (!el) return;
    el.textContent = text;
    el.style.color = error ? '#ff6b6b' : '';
  }

  function ensureComposer() {
    let composer = document.querySelector('.composer');
    const section = document.querySelector('main .grid section');

    if (!composer && section) {
      composer = document.createElement('div');
      composer.className = 'composer';
      composer.innerHTML =
        '<textarea id="caption" maxlength="500" placeholder="O que está acontecendo agora?"></textarea>' +
        '<div class="row">' +
        '<label class="upload-icon">🎥<span>Vídeo</span><input id="video" type="file" accept="video/*"></label>' +
        '<label class="upload-icon">📸<span>Foto</span><input id="photoInput" type="file" accept="image/*"></label>' +
        '<label class="upload-icon">🎧<span>Áudio</span><input id="audioInput" type="file" accept="audio/*"></label>' +
        '<button class="pill primary" id="publishBtn" type="button">Publicar</button>' +
        '</div><div id="publishMsg" class="file"></div>';
      section.prepend(composer);
    }

    if (composer) {
      composer.hidden = false;
      composer.style.display = 'block';
      composer.style.visibility = 'visible';
      composer.style.opacity = '1';
    }

    const button = $('#publishBtn');
    if (button) {
      button.hidden = false;
      button.style.display = 'inline-flex';
      button.style.visibility = 'visible';
      button.style.opacity = '1';
    }
    return button;
  }

  async function getDb() {
    if (!dbPromise) {
      dbPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm')
        .then((mod) => mod.createClient(
          SUPABASE_URL,
          SUPABASE_KEY,
          {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true
            }
          }
        ));
    }
    return dbPromise;
  }

  function extension(file, type) {
    const name = file && file.name ? file.name : '';
    const parts = name.split('.');
    const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
    if (ext && /^[a-z0-9]{2,5}$/.test(ext)) return ext;
    if (type === 'image') return 'jpg';
    if (type === 'audio') return 'webm';
    return 'mp4';
  }

  async function publish() {
    if (publishing) return;

    const button = ensureComposer();
    if (!button) return;

    const captionEl = $('#caption');
    const videoEl = $('#video');
    const photoEl = $('#photoInput');
    const audioEl = $('#audioInput');

    const caption = captionEl && captionEl.value ? captionEl.value.trim() : '';
    const approved = window.pulsoApprovedMedia;
    let file = (approved && approved.file) ||
      (videoEl && videoEl.files && videoEl.files[0]) ||
      (photoEl && photoEl.files && photoEl.files[0]) ||
      (audioEl && audioEl.files && audioEl.files[0]);

    if (!file && !caption) {
      msg('Escolha um vídeo, foto, áudio ou escreva algo.', true);
      return;
    }

    publishing = true;
    button.disabled = true;
    button.textContent = 'Publicando...';

    let path = null;

    try {
      const supabase = await getDb();
      const sessionResult = await supabase.auth.getSession();

      if (sessionResult.error) throw sessionResult.error;

      const session = sessionResult.data && sessionResult.data.session;
      const uid = session && session.user && session.user.id;

      if (!uid) {
        throw new Error('Sessão expirada. Entre novamente no PULSO.');
      }

      let type = 'text';
      let publicUrl = null;

      if (file) {
        const mime = file.type || '';
        if (mime.indexOf('image/') === 0) type = 'image';
        else if (mime.indexOf('audio/') === 0) type = 'audio';
        else type = 'video';

        if (file.size > MAX_UPLOAD) {
          throw new Error('A mídia ultrapassa o limite de 50 MB.');
        }

        msg('Enviando para o PULSO...');

        path = uid + '/' + type + '/' + crypto.randomUUID() + '.' + extension(file, type);

        const allowed = [
          'video/mp4', 'video/webm', 'video/quicktime',
          'image/jpeg', 'image/png', 'image/webp', 'image/gif',
          'audio/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'
        ];

        let contentType = mime;
        if (allowed.indexOf(contentType) === -1) {
          const ext = extension(file, type);
          if (type === 'video') {
            contentType = ext === 'webm' ? 'video/webm' :
              ext === 'mov' ? 'video/quicktime' : 'video/mp4';
          } else if (type === 'image') {
            contentType = ext === 'png' ? 'image/png' :
              ext === 'webp' ? 'image/webp' :
              ext === 'gif' ? 'image/gif' : 'image/jpeg';
          } else {
            contentType = ext === 'mp3' ? 'audio/mpeg' :
              ext === 'wav' ? 'audio/wav' :
              ext === 'ogg' ? 'audio/ogg' :
              ext === 'mp4' ? 'audio/mp4' : 'audio/webm';
          }
        }

        if (allowed.indexOf(contentType) === -1) {
          throw new Error('Formato de mídia não aceito pelo PULSO.');
        }

        const upload = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: contentType, upsert: false });

        if (upload.error) {
          throw new Error('Falha no envio: ' + upload.error.message);
        }

        publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }

      const insertResult = await supabase
        .from('posts')
        .insert({
          user_id: uid,
          caption: caption,
          media_type: type,
          media_url: publicUrl,
          video_url: type === 'video' ? publicUrl : null
        })
        .select('id')
        .single();

      if (insertResult.error) {
        if (path) {
          await supabase.storage.from(BUCKET).remove([path]);
        }
        throw new Error('Falha ao salvar: ' + insertResult.error.message);
      }

      if (!insertResult.data || !insertResult.data.id) {
        throw new Error('O banco não confirmou a publicação.');
      }

      window.pulsoApprovedMedia = null;

      ['caption', 'video', 'photoInput', 'audioInput'].forEach((id) => {
        const el = $('#' + id);
        if (el) el.value = '';
      });

      msg('✅ Publicado com sucesso!');
      document.dispatchEvent(new CustomEvent('pulso-published', {
        detail: { postId: insertResult.data.id }
      }));
    } catch (error) {
      console.error('[PULSO V14]', error);
      msg('❌ ' + (error && error.message ? error.message : 'Não foi possível publicar.'), true);
    } finally {
      publishing = false;
      button.disabled = false;
      button.textContent = 'Publicar';
    }
  }

  window.pulsoPublish = publish;
  window.pulsoPublisherVersion = 'v14';

  function bind() {
    const button = ensureComposer();
    if (!button || button.dataset.pulsoV14) return;
    button.dataset.pulsoV14 = '1';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      publish();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }

  if (!window.__pulsoPublishCapture) {
    window.__pulsoPublishCapture = true;
    document.addEventListener('click', (event) => {
      const target = event.target;
      const button = target && target.closest ? target.closest('#publishBtn') : null;
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      publish();
    }, true);
  }

  new MutationObserver(bind).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();