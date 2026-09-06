/* PULSO — Follow system (demo persistence)
   Keeps follow state across reloads using localStorage.
   This complements the existing follow buttons in the public prototype.
*/
(function () {
  'use strict';

  const KEY = 'pulso_following_v1';
  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (_) { return {}; }
  };
  const write = (state) => localStorage.setItem(KEY, JSON.stringify(state));
  const state = read();

  function idForButton(button) {
    const label = button.getAttribute('aria-label') || '';
    const m = label.match(/(?:Seguir|Deixar de seguir)\s+(.+)$/i);
    if (m) return m[1].trim().toLowerCase();
    const card = button.closest('.creator');
    const name = card && card.querySelector('.creator__meta strong');
    return name ? name.textContent.trim().toLowerCase() : null;
  }

  function apply(button) {
    const id = idForButton(button);
    if (!id) return;
    const following = !!state[id];
    button.classList.toggle('on', following);
    button.setAttribute('aria-pressed', String(following));
    button.setAttribute('title', following ? 'Deixar de seguir' : 'Seguir');

    if (button.classList.contains('creator__follow')) {
      const svg = following
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
      button.innerHTML = svg;
      button.setAttribute('aria-label', following ? 'Deixar de seguir ' + id : 'Seguir ' + id);
    }
  }

  function init() {
    document.querySelectorAll('[data-act="follow"], .creator__follow, #feedFollowBtn').forEach((button) => {
      if (button.id === 'feedFollowBtn') return;
      apply(button);
      button.addEventListener('click', function () {
        const id = idForButton(this);
        if (!id) return;
        state[id] = !state[id];
        if (!state[id]) delete state[id];
        write(state);
        apply(this);
      });
    });

    const panel = document.getElementById('feedFollowBtn');
    if (panel) {
      panel.addEventListener('click', function () {
        const handle = document.getElementById('feedPanelHandle');
        const id = handle ? handle.textContent.trim().toLowerCase() : null;
        if (!id) return;
        state[id] = this.classList.contains('following');
        if (!state[id]) delete state[id];
        write(state);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
