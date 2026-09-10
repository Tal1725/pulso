/* PULSO — correção de publicação somente-texto */
(() => {
  'use strict';
  function fixTextPosts() {
    document.querySelectorAll('#feed article.post').forEach(card => {
      const media = card.querySelector('.video');
      if (!media) return;
      const src = media.getAttribute('src') || '';
      if (media.tagName === 'VIDEO' && !src.trim()) {
        media.remove();
        if (!card.querySelector('.pulso-text-media')) {
          const box = document.createElement('div');
          box.className = 'pulso-text-media';
          box.textContent = '✦ Publicação de texto';
          card.querySelector('.caption')?.before(box);
        }
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fixTextPosts, {once:true});
  else fixTextPosts();
  new MutationObserver(fixTextPosts).observe(document.documentElement, {childList:true, subtree:true});
})();
