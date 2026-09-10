/* PULSO — publicador direto, independente dos módulos do app. */
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

  function parseSession(raw) {
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      return s && s.access_token && s.user && s.user.id ? s : null;
    } catch (_) { return null; }
  }

  function sessionFromStorage() {
    // 1) Formato normal do Supabase.
    const base = `sb-${PROJECT_REF}-auth-token`;
    const direct = parseSession(localStorage.getItem(base));
    if (direct) return direct;

    // 2) Formato fragmentado usado por algumas versões do storage adapter.
    const keys = Object.keys(localStorage).filter(k => k.startsWith(base + '.')).sort((a,b) => {
      const na = Number(a.split('.').pop()), nb = Number(b.split('.').pop());
      return (Number.isFinite(na) ? na : 999999) - (Number.isFinite(nb) ? nb : 999999);
    });
    if (keys.length) {
      const joined = parseSession(keys.map(k => localStorage.getItem(k) || '').join(''));
      if (joined) return joined;
    }

    // 3) Fallback: encontra qualquer sessão Supabase persistida no navegador.
    for (const key of Object.keys(localStorage)) {
      if (!/^sb-.+-auth-token(?:\.\d+)?$/.test(key)) continue;
      const one = parseSession(localStorage.getItem(key));
      if (one) return one;
    }

    return null;
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
    try { return await fetch(url, { ...options, signal: controller.signal }); }
    finally { clearTimeout(timer); }
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

    btn.dataset.pulsoPublishing = '1';
    btn.disabled = true;
    btn.textContent = 'Publicando...';

    if (!file && !caption) {
      msg('Escreva uma legenda ou escolha uma mídia para publicar.', true);
      btn.disabled = false; btn.dataset.pulsoPublishing = '0'; btn.textContent = 'Publicar';
      return;
    }
    if (file && file.size > MAX) throw new Error('A mídia precisa ter no máximo 100 MB.');
    if (file && type === 'video' && !file.type.startsWith('video/')) throw new Error('O arquivo selecionado não é um vídeo válido.');
    if (file && type === 'image' && !file.type.startsWith('image/')) throw new Error('O arquivo selecionado não é uma imagem válida.');
    if (file && type === 'audio' && !file.type.startsWith('audio/')) throw new Error('O arquivo selecionado não é um áudio válido.');

    const session = sessionFromStorage();
    if (!session?.access_token || !session?.user?.id) {
      msg('Sua sessão não foi encontrada. Saia e entre novamente no PULSO.', true);
      btn.disabled = false; btn.dataset.pulsoPublishing = '0'; btn.textContent = 'Publicar';
      return;
    }

    const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` };
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
        if (!upload.ok) throw new Error(`Falha no armazenamento: ${(await upload.text()) || upload.status}`);
        url = publicUrl(path);
      }

      msg('⏳ Salvando publicação...');
      const row = { user_id: session.user.id, caption, media_type: file ? type : 'text', media_url: url, video_url: type === 'video' && url ? url : null };
      const insert = await request(`${SUPABASE_URL}/rest/v1/posts`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(row)
      });

      if (!insert.ok) {
        const text = await insert.text();
        if (path) await request(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE', headers }).catch(() => {});
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
      msg(`❌ ${err?.name === 'AbortError' ? 'Tempo esgotado. Tente novamente.' : (err?.message || 'Não foi possível publicar agora.')}`, true);
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
    btn.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); publish(); }, true);
  }

  window.addEventListener('click', e => {
    const target = e.target?.closest?.('#publishBtn');
    if (!target) return;
    e.preventDefault(); e.stopImmediatePropagation(); publish();
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true }); else install();
  new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true });
  window.pulsoPublish = publish;
})();