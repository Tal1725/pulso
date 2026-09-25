(() => {
  'use strict';
  function install() {
    document.querySelectorAll('[data-post] .video').forEach(media => {
      if (media.dataset.pulsoInteractionBound === '1') return;
      media.dataset.pulsoInteractionBound = '1';
      let lastTap = 0;
      media.addEventListener('pointerup', () => {
        const now = Date.now();
        if (now - lastTap < 320) {
          const card = media.closest('[data-post]');
          const id = card?.dataset.post;
          if (id && typeof window.pulsoToggleReaction === 'function') window.pulsoToggleReaction(id, 'like');
          else if (id) media.dispatchEvent(new CustomEvent('pulso-double-like', { bubbles: true, detail: { postId: id } }));
        }
        lastTap = now;
      });
    });
    document.querySelectorAll('[data-post] [data-comment]').forEach(input => {
      if (input.dataset.pulsoEnterBound === '1') return;
      input.dataset.pulsoEnterBound = '1';
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          input.closest('[data-post]')?.querySelector('[data-send]')?.click();
        }
      });
    });
  }
  window.addEventListener('load', install);
  document.addEventListener('pulso-feed-rendered', install);
  window.pulsoInstallOriginalInteractions = install;
})();