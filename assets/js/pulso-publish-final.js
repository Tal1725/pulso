/* PULSO — PUBLICADOR V15 — Firebase Firestore + Cloudinary */
(() => {
  'use strict';

  const MAX_UPLOAD = 50 * 1024 * 1024;
  let publishing = false;
  const $ = s => document.querySelector(s);

  function msg(text, error) {
    const el = $('#publishMsg');
    if (!el) return;
    el.textContent = text;
    el.style.color = error ? '#ff6b6b' : '';
  }

  function ensureComposer() {
    const composer = document.querySelector('.composer');
    const button = $('#publishBtn');
    if (composer) {
      composer.hidden = false;
      composer.style.display = 'block';
      composer.style.visibility = 'visible';
      composer.style.opacity = '1';
    }
    if (button) {
      button.hidden = false;
      button.style.display = 'inline-flex';
      button.style.visibility = 'visible';
      button.style.opacity = '1';
    }
    return button;
  }

  function mediaConfig() {
    const cfg = window.PULSO_MEDIA_CONFIG || {};
    return {
      cloudName: String(cfg.cloudName || '').trim(),
      uploadPreset: String(cfg.uploadPreset || '').trim()
    };
  }

  async function uploadToCloudinary(file, type, uid) {
    const cfg = mediaConfig();
    if (!cfg.cloudName || !cfg.uploadPreset) {
      throw new Error('O armazenamento de mídia ainda não foi configurado. Falta cadastrar o Cloudinary do PULSO.');
    }

    const endpoint = 'https://api.cloudinary.com/v1_1/' +
      encodeURIComponent(cfg.cloudName) + '/auto/upload';

    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', cfg.uploadPreset);
    form.append('folder', 'pulso/' + uid + '/' + type);

    const response = await fetch(endpoint, { method:'POST', body:form });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error('Falha no envio da mídia: ' +
        (data?.error?.message || ('HTTP ' + response.status)));
    }
    if (!data?.secure_url) {
      throw new Error('O armazenamento não retornou a URL da mídia.');
    }
    return data;
  }

  async function publish() {
    if (publishing) return;

    const button = ensureComposer();
    if (!button) return;

    const caption = $('#caption')?.value?.trim() || '';
    const file =
      window.pulsoApprovedMedia?.file ||
      $('#video')?.files?.[0] ||
      $('#photoInput')?.files?.[0] ||
      $('#audioInput')?.files?.[0] ||
      null;

    if (!file && !caption) {
      msg('Escolha um vídeo, foto, áudio ou escreva algo.', true);
      return;
    }

    publishing = true;
    button.disabled = true;
    button.textContent = 'Publicando...';

    try {
      const { auth, db } = await import('./firebase.js');
      const {
        collection, addDoc, serverTimestamp
      } = await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js');

      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Sessão expirada. Entre novamente no PULSO.');

      let type = 'text';
      let media = null;

      if (file) {
        const mime = file.type || '';
        if (mime.startsWith('image/')) type = 'image';
        else if (mime.startsWith('audio/')) type = 'audio';
        else type = 'video';

        if (file.size > MAX_UPLOAD) {
          throw new Error('A mídia ultrapassa o limite de 50 MB.');
        }

        msg('Enviando a mídia para o PULSO...');
        media = await uploadToCloudinary(file, type, uid);
      }

      const ref = await addDoc(collection(db, 'posts'), {
        user_id: uid,
        caption,
        media_type: type,
        media_url: media?.secure_url || null,
        video_url: type === 'video' ? (media?.secure_url || null) : null,
        media_provider: media ? 'cloudinary' : null,
        media_public_id: media?.public_id || null,
        created_at: serverTimestamp()
      });

      window.pulsoApprovedMedia = null;
      ['caption','video','photoInput','audioInput'].forEach(id => {
        const el = $('#' + id);
        if (el) el.value = '';
      });

      msg('✅ Publicado com sucesso!');
      document.dispatchEvent(new CustomEvent('pulso-published', {
        detail:{ postId:ref.id }
      }));
    } catch (error) {
      console.error('[PULSO V15]', error);
      msg('❌ ' + (error?.message || 'Não foi possível publicar.'), true);
    } finally {
      publishing = false;
      button.disabled = false;
      button.textContent = 'Publicar';
    }
  }

  window.pulsoPublish = publish;
  window.pulsoPublisherVersion = 'v15';

  function bind() {
    const button = ensureComposer();
    if (!button || button.dataset.pulsoV15) return;
    button.dataset.pulsoV15 = '1';
    button.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      publish();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once:true });
  } else {
    bind();
  }
})();
