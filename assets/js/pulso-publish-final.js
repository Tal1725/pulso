/* PULSO — publicador direto, sem dependência de supabase-js/module externo. */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://vqpavcyehgdifbtvzhcn.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm';
  const BUCKET = 'pulso-videos';
  const PROJECT_REF = 'vqpavcyehgdifbtvzhcn';
  const MAX = 100 * 1024 * 1024;

  const $ = s => document.querySelector(s);
  const msg = (text, error = false) => {
    const el = $('#publishMsg');
    if (!el) return;
    el.textContent = text;
    el.style.color = error ? '#ff6b6b' : '';
  };

  function sessionFromStorage() {
    const base = `sb-${PROJECT_REF}-auth-token`;
    let raw = localStorage.getItem(base);
    if (!raw) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(base + '.')).sort();
      if (keys.length) raw = keys.map(k => localStorage.getItem(k) || '').join('');
    }
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      return s && s.access_token && s.user ? s : null;
    } catch (_) { return null; }
  }

  function fileExt(file, type) {
    const name = (file?.name || '').toLowerCase();
    const m = name.match(/\.([a-z0-9]{2,5})$/);
    if (m) return m[1];
    if (type === 'image') return 'jpg';
    if (type === 'audio') return 'mp3';
    return 'mp4';
  }

  function mediaType(file, forced) {
    if (!file) return 'text';
    if (forced && ['video','image','audio'].includes(forced)) return forced;
    if (file.type?.startsWith('image/')) return 'image';
    if (file.type?.startsWith('audio/')) return 'audio';
    return 'video';
  }

  function publicUrl(path) {
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
  }

  async function request(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally { clearTimeout(timer); }
  }

  async function publish() {
    const btn = $('#publishBtn');
    if (!btn || btn.dataset.pulsoPublishing === '1') return;

    const caption = ($('#caption')?.value || '').trim();
    const approved = window.pulsoApprovedMedia || null;
    const inputFile = $('#video')?.files?.[0] || null;
    const audioFile = $('#audioInput')?.files?.[0] || null;
    const file = approved?.file || inputFile || audioFile || null;
    const forced = approved?.type || $('#mediaType')?.value || '';
    const type = file ? mediaType(file, forced) : 'text';

    if (!file && !caption) {
      msg('Escreva uma legenda ou escolha uma mídia para publicar.', true);
      return;
    }
    if (file && file.size > MAX) {
      msg('A mídia precisa ter no máximo 100 MB.', true);
      return;
    }
    if (file && type === 'video' && !file.type.startsWith('video/')) {
      msg('O arquivo selecionado não é um vídeo válido.', true); return;
    }
    if (file && type === 'image' && !file.type.startsWith('image/')) {
      msg('O arquivo selecionado não é uma imagem válida.', true); return;
    }
    if (file && type === 'audio' && !file.type.startsWith('audio/')) {
      msg('O arquivo selecionado não é um áudio válido.', true); return;
    }

    const session = sessionFromStorage();
    if (!session?.access_token || !session?.user?.id) {
      msg('Sua sessão expirou. Entre novamente no PULSO.', true);
      return;
    }

    btn.disabled = true;
    btn.dataset.pulsoPublishing = '1';
    btn.textContent = 'Publicando...';

    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`
    };
    let path = null;

    try {
      let url = null;
      if (file) {
        msg('⏳ Enviando mídia...');
        const safeName = `${crypto.randomUUID ? crypto.randomUUID() : Date.now()}_${fileExt(file, type)}`;
        path = `${session.user.id}/${type}/${safeName}`;
        const upload = await request(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' },
          body: file
        });
        if (!upload.ok) {
          const text = await upload.text();
          throw new Error(`Falha no armazenamento: ${text || upload.status}`);
        }
        url = publicUrl(path);
      }

      msg('⏳ Salvando publicação...');
      const row = {
        user_id: session.user.id,
        caption,
        media_type: file ? type : 'text',
        media_url: url,
        video_url: type === 'video' && url ? url : null
      };

      const insert = await request(`${SUPABASE_URL}/rest/v1/posts`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(row)
      });

      if (!insert.ok) {
        const text = await insert.text();
        if (path) {
          await request(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`, {
            method: 'DELETE', headers
          }).catch(() => {});
        }
        throw new Error(`A publicação não foi salva: ${text || insert.status}`);
      }

      let created = null;
      try { created = await insert.json(); } catch (_) {}
      msg('✅ Publicado no PULSO!');
      window.pulsoApprovedMedia = null;
      if ($('#caption')) $('#caption').value = '';
      if ($('#video')) $('#video').value = '';
      if ($('#audioInput')) $('#audioInput').value = '';
      if ($('#mediaType')) $('#mediaType').value = 'video';
      document.dispatchEvent(new CustomEvent('pulso-published', { detail: { post: created?.[0] || null } }));
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      console.error('[PULSO direct publish]', err);
      const text = err?.name === 'AbortError' ? 'Tempo esgotado. Tente novamente.' : (err?.message || 'Não foi possível publicar agora.');
      msg(`❌ ${text}`, true);
    } finally {
      btn.disabled = false;
      btn.dataset.pulsoPublishing = '0';
      btn.textContent = 'Publicar';
    }
  }

  function install() {
    const btn = $('#publishBtn');
    if (!btn || btn.dataset.pulsoDirectInstalled === '1') return;
    btn.dataset.pulsoDirectInstalled = '1';
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      publish();
    }, true);
  }

  // Captura no window: fica à frente de handlers de documento de outros módulos.
  window.addEventListener('click', e => {
    const target = e.target?.closest?.('#publishBtn');
    if (!target) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    publish();
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else install();

  new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true });
  window.pulsoPublish = publish;
})();
