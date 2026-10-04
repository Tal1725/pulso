/* PULSO — PUBLICADOR V16 — publicação sem recarregar a página */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://vqpavcyehgdifbtvzhcn.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm';
  const CLOUDINARY_CLOUD_NAME = 'zzllchy7';
  const CLOUDINARY_UPLOAD_PRESET = 'pulso_publico';
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

  function getComposerButton() {
    const composer = document.querySelector('.composer');
    if (!composer) return null;
    const button = $('#publishBtn');
    if (!button) return null;
    button.hidden = false;
    button.disabled = false;
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

    const button = getComposerButton();
    if (!button) return;

    const captionEl = $('#caption');
    const videoEl = $('#video');
    const photoEl = $('#photoInput');
    const cameraVideoEl = $('#cameraVideoInput');
    const audioEl = $('#audioInput');

    const caption = captionEl && captionEl.value ? captionEl.value.trim() : '';
    const approved = window.pulsoApprovedMedia;
    let file = (approved && approved.file) ||
      (videoEl && videoEl.files && videoEl.files[0]) ||
      (photoEl && photoEl.files && photoEl.files[0]) ||
      (cameraVideoEl && cameraVideoEl.files && cameraVideoEl.files[0]) ||
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

        const uploadEndpoint = 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/' + (type === 'image' ? 'image' : type === 'audio' ? 'video' : 'video') + '/upload';
        const form = new FormData();
        form.append('file', file);
        form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        form.append('folder', 'pulso/' + uid);

        const uploadResponse = await fetch(uploadEndpoint, {
          method: 'POST',
          body: form
        });

        if (!uploadResponse.ok) {
          let detail = '';
          try {
            const data = await uploadResponse.json();
            detail = data && data.error && data.error.message ? data.error.message : '';
          } catch (_) {}
          throw new Error('Falha no envio para o armazenamento: ' + (detail || 'Cloudinary recusou o arquivo.'));
        }

        const cloudinaryData = await uploadResponse.json();
        publicUrl = cloudinaryData && (cloudinaryData.secure_url || cloudinaryData.url);
        if (!publicUrl) throw new Error('O armazenamento não retornou a URL da mídia.');
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

      ['caption', 'video', 'photoInput', 'cameraVideoInput', 'audioInput'].forEach((id) => {
        const el = $('#' + id);
        if (el) el.value = '';
      });

      msg('✅ Publicado com sucesso!');
      document.dispatchEvent(new CustomEvent('pulso-published', {
        detail: { postId: insertResult.data.id, mediaType: type, mediaUrl: publicUrl }
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
  window.pulsoPublisherVersion = 'v16';

  function bind() {
    const button = getComposerButton();
    const photo = $('#photoInput');
    const cameraVideo = $('#cameraVideoInput');
    const photoBtn = document.querySelector('[data-camera-photo]');
    const videoBtn = document.querySelector('[data-camera-video]');
    if (photoBtn && photo && !photoBtn.dataset.pulsoCameraBound) {
      photoBtn.dataset.pulsoCameraBound = '1';
      photoBtn.addEventListener('click', () => photo.click());
    }
    if (videoBtn && cameraVideo && !videoBtn.dataset.pulsoCameraBound) {
      videoBtn.dataset.pulsoCameraBound = '1';
      videoBtn.addEventListener('click', () => cameraVideo.click());
    }
    if (!button || button.dataset.pulsoV16) return;
    button.dataset.pulsoV16 = '1';
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

  // O compositor é parte fixa do app.html; não recriamos a interface nem capturamos cliques globalmente.
  document.addEventListener('pulso-composer-ready', bind);
})();