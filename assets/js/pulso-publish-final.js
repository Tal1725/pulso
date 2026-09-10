/* PULSO — PUBLICAÇÃO V2: um único fluxo, sem REST manual e sem conflito com outros módulos. */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://vqpavcyehgdifbtvzhcn.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm';
  const BUCKET = 'pulso-videos';
  const MAX_FILE = 100 * 1024 * 1024;
  let clientPromise = null;
  let publishing = false;

  const $ = (s) => document.querySelector(s);

  function status(text, error = false) {
    const el = $('#publishMsg');
    if (!el) return;
    el.textContent = text;
    el.style.color = error ? '#ff6b6b' : '';
  }

  async function client() {
    if (!clientPromise) {
      clientPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm')
        .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }));
    }
    return clientPromise;
  }

  function readStoredSession() {
    try {
      const keys = Object.keys(localStorage).filter(k => /^sb-.+-auth-token(?:\.\d+)?$/.test(k));
      if (!keys.length) return null;
      const base = keys.find(k => !/\.\d+$/.test(k));
      if (base) {
        try {
          const direct = JSON.parse(localStorage.getItem(base) || '');
          if (direct?.access_token && direct?.user?.id) return direct;
        } catch (_) {}
      }
      const groups = {};
      for (const key of keys) {
        const match = key.match(/^(.*?)(?:\.(\d+))?$/);
        if (!match) continue;
        const root = match[1];
        const n = match[2] == null ? -1 : Number(match[2]);
        (groups[root] ||= []).push({ n, value: localStorage.getItem(key) || '' });
      }
      for (const group of Object.values(groups)) {
        group.sort((a, b) => a.n - b.n);
        const raw = group.map(x => x.value).join('');
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.access_token && parsed?.user?.id) return parsed;
        } catch (_) {}
      }
    } catch (_) {}
    return null;
  }

  async function session() {
    try {
      const db = await client();
      const { data, error } = await db.auth.getSession();
      if (!error && data?.session?.access_token && data.session.user?.id) return data.session;
    } catch (e) {
      console.warn('[PULSO publicação] sessão:', e);
    }
    return readStoredSession();
  }

  function mediaType(file, forced) {
    if (!file) return 'text';
    if (['video', 'image', 'audio'].includes(forced)) return forced;
    if (file.type?.startsWith('image/')) return 'image';
    if (file.type?.startsWith('audio/')) return 'audio';
    return 'video';
  }

  function extension(file, type) {
    const fromName = (file?.name || '').toLowerCase().match(/\.([a-z0-9]{2,5})$/)?.[1];
    if (fromName) return fromName;
    return type === 'image' ? 'jpg' : type === 'audio' ? 'mp3' : 'mp4';
  }

  function publicUrl(db, path) {
    return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function publish() {
    if (publishing) return;
    const button = $('#publishBtn');
    if (!button) return;

    const caption = ($('#caption')?.value || '').trim();
    const selectedVideo = $('#video')?.files?.[0] || null;
    const selectedAudio = $('#audioInput')?.files?.[0] || null;
    const approved = window.pulsoApprovedMedia?.file || null;
    const file = approved || selectedVideo || selectedAudio || null;
    const forced = window.pulsoApprovedMedia?.type || $('#mediaType')?.value || '';
    const type = mediaType(file, forced);
    const hiveId = $('#hivePublishSelect')?.value || null;

    if (!file && !caption) {
      status('Escreva uma legenda ou escolha uma mídia para publicar.', true);
      return;
    }
    if (file && file.size > MAX_FILE) {
      status('A mídia precisa ter no máximo 100 MB.', true);
      return;
    }
    if (file && type === 'video' && !file.type.startsWith('video/')) {
      status('Escolha um vídeo válido.', true);
      return;
    }
    if (file && type === 'image' && !file.type.startsWith('image/')) {
      status('Escolha uma imagem válida.', true);
      return;
    }
    if (file && type === 'audio' && !file.type.startsWith('audio/')) {
      status('Escolha um áudio válido.', true);
      return;
    }

    publishing = true;
    button.disabled = true;
    button.textContent = 'Publicando...';
    let uploadedPath = null;

    try {
      status('⏳ Verificando sua conta...');
      const db = await client();
      const active = await session();
      if (!active?.access_token || !active.user?.id) {
        throw new Error('Sua sessão não foi encontrada. Saia e entre novamente no PULSO.');
      }

      /* Garante que o cliente usa exatamente a sessão que o app já possui. */
      await db.auth.setSession({
        access_token: active.access_token,
        refresh_token: active.refresh_token || ''
      }).catch(() => {});

      let mediaUrl = null;
      if (file) {
        status('⏳ Enviando mídia...');
        const safeName = `${crypto.randomUUID ? crypto.randomUUID() : Date.now()}_${extension(file, type)}`;
        uploadedPath = `${active.user.id}/${type}/${safeName}`;
        const upload = await db.storage.from(BUCKET).upload(uploadedPath, file, {
          contentType: file.type || 'application/octet-stream',
          cacheControl: '3600',
          upsert: false
        });
        if (upload.error) throw new Error(`Não foi possível enviar a mídia: ${upload.error.message}`);
        mediaUrl = publicUrl(db, uploadedPath);
      }

      status('⏳ Salvando publicação...');
      const row = {
        user_id: active.user.id,
        caption,
        media_type: file ? type : 'text',
        media_url: mediaUrl,
        video_url: type === 'video' ? mediaUrl : null,
        ...(hiveId ? { hive_id: hiveId } : {})
      };

      const { data: created, error } = await db.from('posts').insert(row).select('id').single();
      if (error) {
        if (uploadedPath) await db.storage.from(BUCKET).remove([uploadedPath]).catch(() => {});
        throw new Error(`A publicação não foi salva: ${error.message}`);
      }
      if (!created?.id) throw new Error('O PULSO não confirmou a publicação.');

      window.pulsoApprovedMedia = null;
      if ($('#caption')) $('#caption').value = '';
      if ($('#video')) $('#video').value = '';
      if ($('#audioInput')) $('#audioInput').value = '';
      status('✅ Publicado no PULSO!');
      document.dispatchEvent(new CustomEvent('pulso-published', { detail: { postId: created.id } }));

      setTimeout(() => location.reload(), 700);
    } catch (error) {
      console.error('[PULSO publicação V2]', error);
      status(`❌ ${error?.message || 'Não foi possível publicar agora.'}`, true);
    } finally {
      publishing = false;
      button.disabled = false;
      button.textContent = 'Publicar';
    }
  }

  /* Captura primeiro o clique para impedir handlers antigos de duplicarem o envio. */
  window.addEventListener('click', (event) => {
    const button = event.target?.closest?.('#publishBtn');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    publish();
  }, true);

  window.pulsoPublish = publish;
  window.pulsoPublishVersion = 'v2';
})();