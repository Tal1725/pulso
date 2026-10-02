/* PULSO — PUBLICADOR V16 — publicação sem recarregar a página */
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
  window.pulsoPublisherVersion = 'v18';

  function makeMediaFile(blob, type) {
    const mime = blob.type || (type === 'audio' ? 'audio/webm' : type === 'image' ? 'image/jpeg' : 'video/webm');
    const ext = type === 'audio' ? 'webm' : type === 'image' ? 'jpg' : 'webm';
    return new File([blob], 'pulso-' + Date.now() + '.' + ext, { type: mime });
  }

  function closeCapture(stream, overlay) {
    if (stream) stream.getTracks().forEach((track) => track.stop());
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  async function captureMedia(mode) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || (!isPhoto && !window.MediaRecorder)) {
      msg('Seu navegador não liberou câmera/microfone. Verifique as permissões do navegador.', true);
      return;
    }
    const isAudio = mode === 'audio';
    const isPhoto = mode === 'photo';
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia(isAudio ? { audio: true } : { video: { facingMode: 'environment' }, audio: !isPhoto });
    } catch (error) {
      console.error('[PULSO MEDIA]', error);
      msg('Não foi possível acessar ' + (isAudio ? 'o microfone' : 'a câmera') + '. Autorize o acesso nas permissões do navegador.', true);
      return;
    }
    if (!document.getElementById('pulsoCaptureStyles')) {
      const style = document.createElement('style');
      style.id = 'pulsoCaptureStyles';
      style.textContent = '.pulso-capture-overlay{position:fixed;inset:0;z-index:99999;background:rgba(2,4,12,.88);backdrop-filter:blur(14px);display:grid;place-items:center;padding:20px}.pulso-capture-card{width:min(94vw,520px);background:linear-gradient(145deg,rgba(20,25,48,.98),rgba(8,12,25,.98));border:1px solid rgba(124,92,255,.4);border-radius:24px;padding:18px;box-shadow:0 25px 80px rgba(0,0,0,.6);color:#fff}.pulso-capture-card video{width:100%;max-height:65vh;object-fit:cover;border-radius:18px;background:#000}.pulso-capture-title{font-size:20px;font-weight:800;margin:8px 0}.pulso-capture-status{opacity:.75;margin:8px 0 14px}.pulso-capture-actions{display:flex;gap:8px;flex-wrap:wrap}.pulso-capture-actions button{border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;background:linear-gradient(135deg,#ff3d9a,#7c5cff);color:#fff}.pulso-capture-actions button:disabled{opacity:.45;cursor:not-allowed}.pulso-capture-actions button[data-capture-cancel]{background:rgba(255,255,255,.1)}';
      document.head.appendChild(style);
    }
    const overlay = document.createElement('div');
    overlay.className = 'pulso-capture-overlay';
    overlay.innerHTML = isAudio
      ? '<div class="pulso-capture-card"><div class="pulso-capture-title">🎤 Gravar áudio</div><div class="pulso-capture-status">Pronto para gravar</div><div class="pulso-capture-actions"><button type="button" data-capture-start>● Começar</button><button type="button" data-capture-stop disabled>■ Parar</button><button type="button" data-capture-cancel>Cancelar</button></div></div>'
      : '<div class="pulso-capture-card"><video autoplay playsinline muted></video><div class="pulso-capture-title">' + (isPhoto ? '📸 Tirar foto' : '📹 Gravar vídeo') + '</div><div class="pulso-capture-status">Câmera pronta</div><div class="pulso-capture-actions"><button type="button" data-capture-main>' + (isPhoto ? '📸 Tirar foto' : '● Gravar') + '</button><button type="button" data-capture-stop disabled>■ Parar</button><button type="button" data-capture-cancel>Cancelar</button></div></div>';
    document.body.appendChild(overlay);
    const video = overlay.querySelector('video');
    if (video) video.srcObject = stream;
    const status = overlay.querySelector('.pulso-capture-status');
    const main = overlay.querySelector('[data-capture-main], [data-capture-start]');
    const stop = overlay.querySelector('[data-capture-stop]');
    const cancel = overlay.querySelector('[data-capture-cancel]');
    let recorder = null;
    let chunks = [];
    const finishRecording = () => {
      if (!recorder || recorder.state === 'inactive') return;
      recorder.stop();
      stop.disabled = true;
      if (main) main.disabled = true;
      if (status) status.textContent = 'Processando mídia...';
    };
    if (isPhoto) {
      main.onclick = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) return;
          window.pulsoApprovedMedia = { file: makeMediaFile(blob, 'image') };
          closeCapture(stream, overlay);
          msg('📸 Foto pronta. Agora toque em Publicar.');
        }, 'image/jpeg', 0.92);
      };
    } else {
      main.onclick = () => {
        chunks = [];
        let mime = isAudio ? 'audio/webm' : 'video/webm';
        if (!MediaRecorder.isTypeSupported(mime)) mime = '';
        recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        recorder.ondataavailable = (event) => { if (event.data && event.data.size) chunks.push(event.data); };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || mime || (isAudio ? 'audio/webm' : 'video/webm') });
          window.pulsoApprovedMedia = { file: makeMediaFile(blob, isAudio ? 'audio' : 'video') };
          closeCapture(stream, overlay);
          msg((isAudio ? '🎤 Áudio' : '📹 Vídeo') + ' pronto. Agora toque em Publicar.');
        };
        recorder.start(250);
        main.disabled = true;
        stop.disabled = false;
        if (status) status.textContent = 'Gravando... toque em Parar quando terminar.';
      };
      stop.onclick = finishRecording;
    }
    cancel.onclick = () => closeCapture(stream, overlay);
  }

  function bind() {
    const button = getComposerButton();
    const photo = $('#photoInput');
    const cameraVideo = $('#cameraVideoInput');
    const photoBtn = document.querySelector('[data-camera-photo]');
    const videoBtn = document.querySelector('[data-camera-video]');
    const audioBtn = document.querySelector('[data-audio-record]');
    if (photoBtn && photo && !photoBtn.dataset.pulsoCameraBound) {
      photoBtn.dataset.pulsoCameraBound = '1';
      photoBtn.addEventListener('click', () => captureMedia('photo'));
    }
    if (videoBtn && cameraVideo && !videoBtn.dataset.pulsoCameraBound) {
      videoBtn.dataset.pulsoCameraBound = '1';
      videoBtn.addEventListener('click', () => captureMedia('video'));
    }
    if (audioBtn && !audioBtn.dataset.pulsoAudioBound) {
      audioBtn.dataset.pulsoAudioBound = '1';
      audioBtn.addEventListener('click', () => captureMedia('audio'));
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