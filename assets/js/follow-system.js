/* PULSO — Sistema de seguir persistente
   Salva localmente no navegador quem o visitante segue.
   Quando o PULSO ganhar backend/contas, este módulo pode ser ligado à API sem mudar os botões.
*/
(function () {
  'use strict';

  const STORAGE_KEY = 'pulso:following:v1';
  const following = new Set(load());

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data.filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(following)));
    } catch (_) {}
  }

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function keyFromButton(button) {
    const explicit = button.dataset.followId || button.dataset.handle || button.getAttribute('data-follow');
    if (explicit) return normalize(explicit);

    const label = button.getAttribute('aria-label') || '';
    const match = label.match(/(?:seguir|deixar de seguir)\s+(.+)/i);
    if (match) return normalize(match[1]);

    const creator = button.closest('[data-creator]');
    if (creator) return normalize(creator.dataset.creator);
    return '';
  }

  function setButtonState(button, isFollowing) {
    button.classList.toggle('is-following', isFollowing);
    button.setAttribute('aria-pressed', String(isFollowing));

    const label = button.getAttribute('aria-label') || '';
    if (/seguir|deixar de seguir/i.test(label)) {
      const name = label.replace(/^(?:seguir|deixar de seguir)\s+/i, '');
      button.setAttribute('aria-label', (isFollowing ? 'Deixar de seguir ' : 'Seguir ') + name);
    }

    const followIcon = button.querySelector('.feed-video__follow, .creator__follow-icon, [data-follow-icon]');
    if (followIcon) {
      followIcon.innerHTML = isFollowing ? '✓' : '+';
      followIcon.classList.toggle('is-following', isFollowing);
    }

    const text = button.querySelector('[data-follow-text], .creator__follow-text');
    if (text) text.textContent = isFollowing ? 'Seguindo' : 'Seguir';

    if (!followIcon && !text && button.matches('#feedFollowBtn')) {
      const labelEl = button.querySelector('[data-follow-label]');
      if (labelEl) labelEl.textContent = isFollowing ? 'Seguindo' : 'Seguir';
      else if (button.childNodes.length && button.textContent.trim()) {
        const current = button.textContent.trim();
        if (current === 'Seguir' || current === '✓ Seguindo' || current === 'Seguindo') {
          button.textContent = isFollowing ? '✓ Seguindo' : 'Seguir';
        }
      }
    }
  }

  function refresh() {
    document.querySelectorAll('[data-act="follow"], #feedFollowBtn, .creator__follow').forEach(button => {
      const key = keyFromButton(button);
      if (key) setButtonState(button, following.has(key));
    });
  }

  function toggle(button) {
    const key = keyFromButton(button);
    if (!key) return;

    const willFollow = !following.has(key);
    if (willFollow) following.add(key);
    else following.delete(key);
    save();
    refresh();

    window.dispatchEvent(new CustomEvent('pulso:follow-change', {
      detail: { id: key, following: willFollow, total: following.size }
    }));
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-act="follow"], #feedFollowBtn, .creator__follow');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggle(button);
  }, true);

  window.PULSOFollow = {
    isFollowing: function (id) { return following.has(normalize(id)); },
    getFollowing: function () { return Array.from(following); },
    follow: function (id) { const key = normalize(id); if (key) { following.add(key); save(); refresh(); } },
    unfollow: function (id) { const key = normalize(id); following.delete(key); save(); refresh(); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh, { once: true });
  } else {
    refresh();
  }
})();
