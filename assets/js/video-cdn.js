/* PULSO Video Engine — CDN-ready player, lazy loading and smooth feed playback. */
(() => {
  const CONFIG = {
    rootMargin: '700px 0px',
    threshold: 0.15,
    maxActivePlayers: 2,
    pauseWhenHidden: true
  };

  const active = new Set();

  function markReady(video) {
    video.classList.add('pulso-video-ready');
    video.closest('.pulso-video-shell')?.classList.add('is-ready');
  }

  function pauseFarPlayers(current) {
    for (const video of active) {
      if (video !== current && active.size > CONFIG.maxActivePlayers) {
        video.pause();
        active.delete(video);
      }
    }
  }

  function observeVideo(video) {
    if (video.dataset.pulsoEngine === '1') return;
    video.dataset.pulsoEngine = '1';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'metadata';
    video.setAttribute('aria-label', 'Vídeo do PULSO');

    const shell = document.createElement('div');
    shell.className = 'pulso-video-shell';
    video.parentNode.insertBefore(shell, video);
    shell.appendChild(video);

    video.addEventListener('loadedmetadata', () => markReady(video), { once: true });
    video.addEventListener('canplay', () => markReady(video), { once: true });
    video.addEventListener('play', () => {
      active.add(video);
      pauseFarPlayers(video);
    });
    video.addEventListener('ended', () => active.delete(video));
  }

  function init() {
    document.querySelectorAll('video.video, video').forEach(observeVideo);

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
          video.preload = 'auto';
          video.classList.add('pulso-video-near');
        } else {
          video.classList.remove('pulso-video-near');
          if (CONFIG.pauseWhenHidden && !video.hasAttribute('data-keep-playing')) {
            video.pause();
            active.delete(video);
          }
        }
      });
    }, { rootMargin: CONFIG.rootMargin, threshold: CONFIG.threshold });

    document.querySelectorAll('video.video, video').forEach(video => io.observe(video));

    const mo = new MutationObserver(() => {
      document.querySelectorAll('video.video, video').forEach(video => {
        observeVideo(video);
        io.observe(video);
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    window.PULSO_VIDEO_ENGINE = {
      version: '2026.09.07.1',
      observe: observeVideo,
      refresh: () => document.querySelectorAll('video.video, video').forEach(v => { observeVideo(v); io.observe(v); })
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
