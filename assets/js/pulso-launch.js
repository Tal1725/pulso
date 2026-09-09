(() => {
  const path = location.pathname.toLowerCase();
  if (path.endsWith('/ideia.html')) return;
  const init = () => {
    if (document.getElementById('pulsoVisionLink')) return;
    const nav = document.querySelector('.nav__links');
    if (nav) {
      const a = document.createElement('a');
      a.id = 'pulsoVisionLink';
      a.href = 'ideia.html';
      a.textContent = 'A ideia';
      nav.insertBefore(a, nav.firstChild);
    }
    const heroBadge = document.querySelector('.hero__badge');
    if (heroBadge) heroBadge.innerHTML = '<span class="hero__badge-dot"></span>Uma rede social diferente: pessoas + Colmeias + ideias';
    const heroText = document.querySelector('.hero__text');
    if (heroText) heroText.innerHTML = 'No PULSO, cada pessoa pode criar sua própria <strong>Colmeia</strong>: uma mini-rede com identidade, pessoas, conteúdo e objetivos próprios. E uma ideia pode continuar, crescer e conectar outras comunidades.';
    const heroSlogan = document.querySelector('.hero__slogan');
    if (heroSlogan) heroSlogan.innerHTML = 'Não é só uma rede social.<br><span class="grad-text">É uma rede de redes.</span>';
    const actions = document.querySelector('.hero__actions');
    if (actions && !document.getElementById('heroIdeaLink')) {
      const a = document.createElement('a');
      a.id = 'heroIdeaLink'; a.href = 'ideia.html'; a.className = 'btn btn--glass btn--lg'; a.textContent = 'Conhecer a ideia';
      actions.appendChild(a);
    }
    const marquee = document.querySelector('.marquee__track');
    if (marquee && !document.getElementById('pulsoVisionStrip')) {
      const strip = document.createElement('div');
      strip.id = 'pulsoVisionStrip';
      strip.innerHTML = '<span>🐝 COLMEIAS</span><i></i><span>REDE DE REDES</span><i></i><span>CONTINUIDADE</span><i></i><span>COLABORAÇÃO</span><i></i><span>PULSOS EM MOVIMENTO</span><i></i>';
      strip.style.display = 'contents';
      marquee.prepend(strip);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
