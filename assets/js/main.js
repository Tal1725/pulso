/* ==========================================================================
   PULSO — Interactions
   ========================================================================== */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     CONFIGURAÇÃO GLOBAL
     Valores de DEMONSTRAÇÃO — edite aqui antes do lançamento oficial.
     ------------------------------------------------------------------ */
  const PULSO_CONFIG = {
    // Números exibidos na seção de estatísticas
    stats: [
      { target: 1,   prefix: '+', suffix: 'M', label: 'Momentos compartilhados' },
      { target: 500, prefix: '+', suffix: 'K', label: 'Criadores' },
      { static: '24/7', label: 'Conteúdo acontecendo' }
    ],
    autoPlayFeed: true,      // avanço automático da demonstração do feed
    feedInterval: 6500,      // ms entre vídeos na demonstração

    // Comentários reais (Giscus — usa GitHub Discussions).
    // 1) Publique o site em um repositório PÚBLICO no GitHub.
    // 2) No repositório, ative GitHub Discussions e escolha uma categoria.
    // 3) Gere os valores em https://giscus.app (o site detecta o tema escuro
    //    desta página) e cole aqui. Enquanto estiver vazio, a seção mostra
    //    apenas um aviso discreto e nenhum script externo é carregado.
    comments: {
      enabled: false,
      repo: '',            // ex.: 'usuario/pulso'
      repoId: '',          // ex.: 'R_kgDOABC123'
      category: 'Announcements',  // nome exato da categoria nas Discussions
      categoryId: '',      // ex.: 'DIC_kwDOABC123'
      mapping: 'pathname', // como ligar o comentário à página
      lang: 'pt',
      theme: 'dark'
    }
  };

  /* ------------------------------------------------------------------
     NAV
     ------------------------------------------------------------------ */
  const nav = document.getElementById('nav');
  const burger = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('mobileMenu');

  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? 'Abrir menu' : 'Fechar menu');
      if (open) mobileMenu.hidden = true;
      else {
        mobileMenu.hidden = false;
        requestAnimationFrame(() => mobileMenu.classList.add('open'));
      }
    });
    mobileMenu.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        setTimeout(() => { mobileMenu.hidden = true; }, 350);
        burger.setAttribute('aria-expanded', 'false');
      })
    );
  }

  /* ------------------------------------------------------------------
     SCROLL REVEAL
     ------------------------------------------------------------------ */
  const reveals = document.querySelectorAll('.reveal');
  reveals.forEach(el => {
    const d = parseInt(el.getAttribute('data-delay') || '0', 10);
    if (d > 0) el.style.setProperty('--d', (d * 90) + 'ms');
  });

  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  /* Re-run for trend bars/sparks that depend on .in */
  const trendCards = document.querySelectorAll('.trend');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const tio = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); tio.unobserve(e.target); } });
    }, { threshold: 0.35 });
    trendCards.forEach(c => tio.observe(c));
  } else {
    trendCards.forEach(c => c.classList.add('in'));
  }

  /* ------------------------------------------------------------------
     FEED DATA
     ------------------------------------------------------------------ */
  const u = 'https://images.unsplash.com/photo-';
  const FEED = [
    {
      img: u + '1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=720&h=1280&q=80',
      avatar: u + '1517841905240-472988babdf9?auto=format&fit=crop&w=120&h=120&q=80',
      creator: 'Lari Santos', handle: '@larisants',
      likes: 128400, comments: 4200, shares: 8700,
      desc: 'Mais um treino de dança no PULSO. Bora fazer junto com a gente?',
      tags: ['#DesafioPulso', '#Dança'],
      music: 'Beat Infinito — Lari & Nyah'
    },
    {
      img: u + '1414235077428-338989a2e8c0?auto=format&fit=crop&w=720&h=1280&q=80',
      avatar: u + '1550345332-09e3ac987658?auto=format&fit=crop&w=120&h=120&q=80',
      creator: 'Chef Marcos', handle: '@chefmarcos',
      likes: 96300, comments: 3100, shares: 5400,
      desc: 'O segredo do meu risoto em 15 segundos. Salva para tentar depois.',
      tags: ['#Gastronomia', '#PulsoBrasil'],
      music: 'Cozinha Baixa — Remix'
    },
    {
      img: u + '1543269865-cbf427effbad?auto=format&fit=crop&w=720&h=1280&q=80',
      avatar: u + '1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
      creator: 'Biel Correia', handle: '@bielcorre',
      likes: 211500, comments: 6800, shares: 12300,
      desc: 'POV: você percebe que o café era da galera toda.',
      tags: ['#Humor', '#MeuMomento'],
      music: 'Risada de Fundo — Vol. 2'
    },
    {
      img: u + '1552674605-db6ffd4facb5?auto=format&fit=crop&w=720&h=1280&q=80',
      avatar: u + '1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&h=120&q=80',
      creator: 'Renata Alves', handle: '@maratona.run',
      likes: 75400, comments: 2400, shares: 4100,
      desc: 'Meu primeiro 10k. Obrigada por todo o apoio de vocês aqui!',
      tags: ['#Esportes', '#Viralizou'],
      music: 'Corre pro Abraço — Trilha'
    },
    {
      img: u + '1514525253161-7a46d19cd819?auto=format&fit=crop&w=720&h=1280&q=80',
      avatar: u + '1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=120&h=120&q=80',
      creator: 'DJ Nyah', handle: '@djnyah',
      likes: 189900, comments: 5200, shares: 9900,
      desc: 'Preview da track nova que sai sexta. Comenta aí se curtiu.',
      tags: ['#PulsoMusic', '#CriadoresPulso'],
      music: 'Nyah — Set Livre'
    }
  ];

  const fmtCompact = (n) => {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'K';
    return String(n);
  };

  const ICONS = {
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7.5-4.7-9.7-9.2C.8 8.8 2.6 5.5 6 5c1.9-.3 3.5.6 6 3 2.5-2.4 4.1-3.3 6-3 3.4.5 5.2 3.8 3.7 6.8C19.5 16.3 12 21 12 21z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H4l2.5-3A8 8 0 1 1 21 12z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4M12 2v13"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7L5.2 7l4.7-.7z"/></svg>',
    music: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 18V6l10-2v11"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="15" r="3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
  };

  /* ------------------------------------------------------------------
     FEED SIMULATOR
     ------------------------------------------------------------------ */
  const stack = document.getElementById('feedStack');
  const dotsWrap = document.getElementById('feedDots');
  const progressWrap = document.getElementById('feedProgress');
  const prevBtn = document.getElementById('feedPrev');
  const nextBtn = document.getElementById('feedNext');
  const player = document.getElementById('feedPlayer');
  const panel = {
    title: document.getElementById('feedPanelTitle'),
    handle: document.getElementById('feedPanelHandle'),
    desc: document.getElementById('feedPanelDesc'),
    tags: document.getElementById('feedPanelTags'),
    likes: document.getElementById('feedStatLikes'),
    comments: document.getElementById('feedStatComments'),
    shares: document.getElementById('feedStatShares'),
    music: document.getElementById('feedPanelMusic'),
    follow: document.getElementById('feedFollowBtn')
  };

  let feedIndex = 0;
  let feedTimer = null;

  function buildFeed() {
    FEED.forEach((v, i) => {
      const el = document.createElement('article');
      el.className = 'feed-video' + (i === 0 ? ' active' : '');
      el.dataset.index = i;
      el.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
      const eager = i === 0 ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"';
      el.innerHTML =
        '<img class="feed-video__media" src="' + v.img + '" alt="Demonstração do vídeo de ' + v.creator + '"' + eager + '>' +
        '<div class="feed-video__shade"></div>' +
        '<div class="feed-video__top"><span class="feed-video__tab on">Para você</span><span class="feed-video__tab">Seguindo</span></div>' +
        '<div class="feed-video__rail">' +
          '<button class="feed-video__rail-btn feed-video__avatar-wrap" data-act="follow" aria-label="Seguir ' + v.creator + '">' +
            '<span class="feed-video__avatar"><img src="' + v.avatar + '" alt="" loading="lazy"><span class="feed-video__follow">+</span></span>' +
          '</button>' +
          '<button class="feed-video__rail-btn feed-video__like" data-act="like" aria-label="Curtir vídeo de ' + v.creator + '">' +
            ICONS.heart + '<span class="feed-video__count">' + fmtCompact(v.likes) + '</span>' +
            '<span class="like-pop" aria-hidden="true">+1</span>' +
          '</button>' +
          '<div class="feed-video__rail-btn">' + ICONS.comment + '<span class="feed-video__count">' + fmtCompact(v.comments) + '</span></div>' +
          '<div class="feed-video__rail-btn">' + ICONS.share + '<span class="feed-video__count">' + fmtCompact(v.shares) + '</span></div>' +
        '</div>' +
        '<div class="feed-video__info">' +
          '<p class="feed-video__creator">' + ICONS.star + v.creator + '</p>' +
          '<p class="feed-video__desc">' + v.desc + '</p>' +
          '<div class="feed-video__tags">' + v.tags.map(t => '<span>' + t + '</span>').join('') + '</div>' +
          '<div class="feed-video__music">' + ICONS.music +
            '<span class="feed-video__music-track"><span class="feed-video__music-inner"><span>' + v.music + '</span><span>' + v.music + '</span></span></span>' +
          '</div>' +
        '</div>';
      stack.appendChild(el);
    });

    FEED.forEach((_, i) => {
      const d = document.createElement('i');
      if (i === 0) d.classList.add('on');
      d.setAttribute('data-idx', i);
      d.title = 'Vídeo ' + (i + 1);
      dotsWrap.appendChild(d);
    });

    FEED.forEach((_, i) => {
      const p = document.createElement('span');
      p.setAttribute('data-idx', i);
      progressWrap.appendChild(p);
    });

    dotsWrap.addEventListener('click', (e) => {
      const dot = e.target.closest('[data-idx]');
      if (dot) goTo(parseInt(dot.dataset.idx, 10));
    });
  }

  function setPanel(i) {
    const v = FEED[i];
    panel.title.textContent = v.creator;
    panel.handle.textContent = v.handle;
    panel.desc.textContent = v.desc;
    panel.tags.innerHTML = v.tags.map(t => '<span>' + t + '</span>').join('');
    panel.likes.textContent = fmtCompact(v.likes);
    panel.comments.textContent = fmtCompact(v.comments);
    panel.shares.textContent = fmtCompact(v.shares);
    panel.music.textContent = v.music;
    panel.follow.classList.remove('following');
    panel.follow.textContent = 'Seguir';
  }

  function goTo(i) {
    if (i === feedIndex) return;
    const slides = stack.children;
    const dots = dotsWrap.children;
    const segs = progressWrap.children;
    if (slides[feedIndex]) {
      slides[feedIndex].classList.remove('active');
      slides[feedIndex].setAttribute('aria-hidden', 'true');
    }
    if (dots[feedIndex]) dots[feedIndex].classList.remove('on');
    if (segs[feedIndex]) segs[feedIndex].classList.remove('on');

    feedIndex = i;
    if (slides[feedIndex]) {
      slides[feedIndex].classList.add('active');
      slides[feedIndex].setAttribute('aria-hidden', 'false');
    }
    if (dots[feedIndex]) dots[feedIndex].classList.add('on');
    if (segs[feedIndex]) segs[feedIndex].classList.add('on');
    setPanel(feedIndex);
    restartAuto();
  }

  const next = () => goTo((feedIndex + 1) % FEED.length);
  const prev = () => goTo((feedIndex - 1 + FEED.length) % FEED.length);

  function startAuto() {
    if (!PULSO_CONFIG.autoPlayFeed || reduceMotion) return;
    stopAuto();
    feedTimer = setInterval(next, PULSO_CONFIG.feedInterval);
  }
  function stopAuto() { if (feedTimer) { clearInterval(feedTimer); feedTimer = null; } }
  function restartAuto() {
    stopAuto();
    startAuto();
  }

  if (prevBtn) prevBtn.addEventListener('click', () => { prev(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { next(); });

  /* wheel navigation */
  let wheelLock = false;
  player.addEventListener('wheel', (e) => {
    if (wheelLock) return;
    wheelLock = true;
    setTimeout(() => { wheelLock = false; }, 700);
    if (e.deltaY > 24) next();
    else if (e.deltaY < -24) prev();
  }, { passive: true });

  /* keyboard — only when the feed player is on screen */
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const r = player.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    if (e.key === 'ArrowDown') { next(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { prev(); e.preventDefault(); }
  });

  /* pause autoplay on hover / visibility */
  player.addEventListener('mouseenter', stopAuto);
  player.addEventListener('mouseleave', startAuto);
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stopAuto() : startAuto();
  });

  /* in-player micro interactions */
  stack.addEventListener('click', (e) => {
    const likeBtn = e.target.closest('[data-act="like"]');
    if (likeBtn) {
      const countEl = likeBtn.querySelector('.feed-video__count');
      const wasLiked = likeBtn.classList.contains('liked');
      likeBtn.classList.remove('liked');
      if (wasLiked) {
        countEl.textContent = fmtCompact(FEED[feedIndex].likes);
      } else {
        void likeBtn.offsetWidth; /* restart the CSS pop animation */
        likeBtn.classList.add('liked');
        countEl.textContent = fmtCompact(FEED[feedIndex].likes + 1);
      }
    }
    const followBtn = e.target.closest('[data-act="follow"]');
    if (followBtn) {
      const plus = followBtn.querySelector('.feed-video__follow');
      if (plus.textContent === '+') { plus.textContent = '✓'; plus.style.background = 'var(--green)'; }
      else { plus.textContent = '+'; plus.style.background = ''; }
    }
  });

  panel.follow.addEventListener('click', () => {
    const following = panel.follow.classList.toggle('following');
    panel.follow.textContent = following ? '✓ Seguindo' : 'Seguir';
  });

  buildFeed();
  setPanel(0);
  startAuto();

  /* ------------------------------------------------------------------
     CREATORS
     ------------------------------------------------------------------ */
  const CAT_ICONS = {
    musica: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6l10-2v11"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="15" r="3"/></svg>',
    humor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 10h.01M15.5 10h.01M8.7 14.5c.9 1 2.1 1.5 3.3 1.5s2.4-.5 3.3-1.5"/></svg>',
    games: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6.5" width="20" height="11" rx="5.5"/><path d="M7 10.5v4M5 12.5h4M15.5 12h.01M18 12h.01M18 14.5h.01M18 9.5h.01"/></svg>',
    esportes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3c2.5 2.5 3.5 6 3.5 9S14.5 18.5 12 21c-2.5-2.5-3.5-6-3.5-9S9.5 5.5 12 3z"/></svg>',
    gastronomia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v6a3 3 0 0 0 3 3h.5V21a1.5 1.5 0 0 0 3 0V12H11a3 3 0 0 0 3-3V3"/><path d="M17.5 3c-1 1.2-1.5 2.4-1.5 4s.7 2.5 1.5 3c.8-.5 1.5-1.4 1.5-3s-.5-2.8-1.5-4z"/></svg>',
    ideias: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 3.5 10.9c-.6.5-1 1.2-1 2.1h-5c0-.9-.4-1.6-1-2.1A6 6 0 0 1 12 3z"/></svg>',
    danca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6c1.5 2 2.5 4 3 7"/><path d="M20 6c-3 2-4.5 5-5 9"/><path d="M7.5 14.5c-1.5 1-2.5 2.6-3 4.5M10 17c2 .5 4.5.4 7-.3M13 8l2-4"/></svg>',
    criatividade: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a5 5 0 0 1 5 5c0 .9-.2 1.7-.6 2.4"/><circle cx="12" cy="12" r="9"/><path d="M3.5 9.5c2 .5 3.5 2 4 4.5M9 20c1-2 3-3 5-3"/></svg>',
    automoveis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13"/><path d="M4 13h16a1 1 0 0 1 1 1v3h-2.2M3 17V14a1 1 0 0 1 1-1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
    tecnologia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="3"/><path d="M8 21h8M12 17v4"/></svg>'
  };

  const CREATORS = [
    { name: 'DJ Nyah', handle: '@djnyah', cat: 'musica', catLabel: 'Música', img: u + '1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=720&q=80', avatar: u + '1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=120&h=120&q=80', followers: '2,1M' },
    { name: 'Biel Correia', handle: '@bielcorre', cat: 'humor', catLabel: 'Humor', img: u + '1500648767791-00dcc994a43e?auto=format&fit=crop&w=720&q=80', avatar: u + '1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80', followers: '1,4M' },
    { name: 'Rafa Play', handle: '@rafaplay', cat: 'games', catLabel: 'Games', img: u + '1542751371-adc38448a05e?auto=format&fit=crop&w=720&q=80', avatar: u + '1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&h=120&q=80', followers: '860K' },
    { name: 'Renata Alves', handle: '@maratona.run', cat: 'esportes', catLabel: 'Esportes', img: u + '1552674605-db6ffd4facb5?auto=format&fit=crop&w=720&q=80', avatar: u + '1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&h=120&q=80', followers: '1,1M' },
    { name: 'Chef Marcos', handle: '@chefmarcos', cat: 'gastronomia', catLabel: 'Gastronomia', img: u + '1577219491135-ce391730fb2c?auto=format&fit=crop&w=720&q=80', avatar: u + '1550345332-09e3ac987658?auto=format&fit=crop&w=120&h=120&q=80', followers: '720K' },
    { name: 'Carol Nishida', handle: '@carol.ideias', cat: 'ideias', catLabel: 'Ideias', img: u + '1494790108377-be9c29b29330?auto=format&fit=crop&w=720&q=80', avatar: u + '1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80', followers: '540K' },
    { name: 'Lari Santos', handle: '@larisants', cat: 'danca', catLabel: 'Dança', img: u + '1519699047748-de8e457a634e?auto=format&fit=crop&w=720&q=80', avatar: u + '1517841905240-472988babdf9?auto=format&fit=crop&w=120&h=120&q=80', followers: '1,8M' },
    { name: 'Isa Moreira', handle: '@isa.cria', cat: 'criatividade', catLabel: 'Criatividade', img: u + '1513364776144-60967b0f800f?auto=format&fit=crop&w=720&q=80', avatar: u + '1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&h=120&q=80', followers: '390K' },
    { name: 'Vini Turbo', handle: '@viniturbo', cat: 'automoveis', catLabel: 'Automóveis', img: u + '1503376780353-7e6692767b70?auto=format&fit=crop&w=720&q=80', avatar: u + '1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&h=120&q=80', followers: '460K' },
    { name: 'Téo Lima', handle: '@teo.dev', cat: 'tecnologia', catLabel: 'Tecnologia', img: u + '1531297484001-80022131f5a1?auto=format&fit=crop&w=720&q=80', avatar: u + '1550345332-09e3ac987658?auto=format&fit=crop&w=120&h=120&q=80', followers: '610K' }
  ];

  const grid = document.getElementById('creatorsGrid');

  function creatorCard(c) {
    const card = document.createElement('article');
    card.className = 'creator';
    card.dataset.cat = c.cat;
    card.innerHTML =
      '<div class="creator__media">' +
        '<img src="' + c.img + '" alt="Criador(a) ' + c.name + ' — ' + c.catLabel + '" loading="lazy">' +
        '<span class="creator__cat">' + (CAT_ICONS[c.cat] || '') + c.catLabel + '</span>' +
        '<button class="creator__follow" aria-label="Seguir ' + c.name + '">' + ICONS.plus + '</button>' +
      '</div>' +
      '<div class="creator__body">' +
        '<span class="creator__avatar"><img src="' + c.avatar + '" alt="" loading="lazy"></span>' +
        '<div class="creator__meta"><strong>' + c.name + '</strong><span>' + c.followers + ' seguidores</span></div>' +
      '</div>';
    card.querySelector('.creator__follow').addEventListener('click', (e) => {
      const b = e.currentTarget;
      const on = b.classList.toggle('on');
      b.innerHTML = on ? ICONS.check : ICONS.plus;
      b.setAttribute('aria-label', on ? 'Deixar de seguir ' + c.name : 'Seguir ' + c.name);
    });
    return card;
  }

  if (grid) {
    CREATORS.forEach(c => grid.appendChild(creatorCard(c)));
  }

  const chipsWrap = document.getElementById('creatorChips');
  if (chipsWrap) {
    const hideTimers = new Map();
    chipsWrap.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      chipsWrap.querySelectorAll('.chip').forEach(c => {
        c.classList.remove('chip--on');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('chip--on');
      chip.setAttribute('aria-selected', 'true');
      const cat = chip.dataset.cat;
      grid.querySelectorAll('.creator').forEach(card => {
        const timer = hideTimers.get(card);
        if (timer) { clearTimeout(timer); hideTimers.delete(card); }
        const show = cat === 'todos' || card.dataset.cat === cat;
        card.style.transition = 'opacity .45s ease, transform .45s ease';
        if (show) {
          card.style.display = '';
          card.style.opacity = '1';
          card.style.transform = 'none';
        } else {
          card.style.opacity = '0';
          card.style.transform = 'scale(.94)';
          hideTimers.set(card, setTimeout(() => { card.style.display = 'none'; hideTimers.delete(card); }, 450));
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     STATS COUNTERS
     Values come from PULSO_CONFIG.stats (single source of truth).
     ------------------------------------------------------------------ */
  const statsEls = document.querySelectorAll('#statsSection .stat__value');
  function animateValue(el, target, prefix, suffix) {
    const dur = 1800;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  PULSO_CONFIG.stats.forEach((s, i) => {
    const el = statsEls[i];
    if (!el) return;
    if (s.static !== undefined) {
      el.textContent = s.static;
      return;
    }
    const target = s.target || 0;
    const prefix = s.prefix || '';
    const suffix = s.suffix || '';
    const setFinal = () => { el.textContent = prefix + target + suffix; };
    if (reduceMotion || !('IntersectionObserver' in window)) {
      setFinal();
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      animateValue(el, target, prefix, suffix);
      io.disconnect();
    }, { threshold: 0.5 });
    io.observe(el);
  });

  /* ------------------------------------------------------------------
     HERO PARALLAX + TILT
     ------------------------------------------------------------------ */
  const hero = document.querySelector('.hero');
  const heroPhone = document.getElementById('heroPhone');
  const heroFloaters = document.querySelectorAll('.float-card, .float-pill');

  if (!reduceMotion && window.matchMedia('(min-width: 1080px)').matches && hero) {
    let ticking = false;
    const onMove = (e) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        if (heroPhone) {
          heroPhone.style.transform = 'perspective(1100px) rotateY(' + (nx * 7) + 'deg) rotateX(' + (ny * -7) + 'deg)';
        }
        heroFloaters.forEach((el, i) => {
          const depth = (i % 3) + 1;
          el.style.translate = (nx * -18 * depth).toFixed(1) + 'px ' + (ny * -14 * depth).toFixed(1) + 'px';
        });
        ticking = false;
      });
    };
    hero.addEventListener('mousemove', onMove);
    hero.addEventListener('mouseleave', () => {
      if (heroPhone) heroPhone.style.transform = '';
      heroFloaters.forEach(el => { el.style.translate = ''; });
    });
  }

  /* subtle scroll parallax for hero floaters (desktop) */
  if (!reduceMotion && window.matchMedia('(min-width: 1080px)').matches) {
    let sTicking = false;
    window.addEventListener('scroll', () => {
      if (sTicking) return;
      sTicking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < window.innerHeight * 1.2) {
          const progress = y / window.innerHeight;
          heroFloaters.forEach((el, i) => {
            const factor = ((i % 3) + 1) * 6;
            el.style.marginTop = (progress * factor) + 'px';
          });
        }
        sTicking = false;
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     FORMS
     ------------------------------------------------------------------ */
  function setFieldState(input, ok) {
    input.setAttribute('aria-invalid', ok ? 'false' : 'true');
  }
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    const fields = {
      name: contactForm.querySelector('#cf-name'),
      email: contactForm.querySelector('#cf-email'),
      message: contactForm.querySelector('#cf-message')
    };
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;
      if (!fields.name.value.trim()) { setFieldState(fields.name, false); valid = false; }
      else setFieldState(fields.name, true);
      if (!isEmail(fields.email.value.trim())) { setFieldState(fields.email, false); valid = false; }
      else setFieldState(fields.email, true);
      if (!fields.message.value.trim()) { setFieldState(fields.message, false); valid = false; }
      else setFieldState(fields.message, true);
      if (!valid) return;
      const ok = document.getElementById('contactOk');
      ok.hidden = false;
      contactForm.reset();
      setTimeout(() => { ok.hidden = true; }, 7000);
    });
    contactForm.querySelectorAll('input, textarea').forEach(i =>
      i.addEventListener('input', () => setFieldState(i, true))
    );
  }

  const notifyForm = document.getElementById('notifyForm');
  if (notifyForm) {
    const email = notifyForm.querySelector('#notifyEmail');
    const ok = document.getElementById('notifyOk');
    notifyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isEmail(email.value.trim())) { setFieldState(email, false); return; }
      setFieldState(email, true);
      ok.hidden = false;
      notifyForm.reset();
      setTimeout(() => { ok.hidden = true; }, 7000);
    });
    email.addEventListener('input', () => setFieldState(email, true));
  }

  /* ------------------------------------------------------------------
     COMENTÁRIOS (GISCUS)
     Só carrega script externo se a seção estiver configurada em
     PULSO_CONFIG.comments.
     ------------------------------------------------------------------ */
  function initComments() {
    const host = document.getElementById('commentsHost');
    if (!host) return;
    const c = PULSO_CONFIG.comments;
    const ready = c.enabled && c.repo && c.repoId && c.categoryId;
    if (!ready) {
      const note = document.createElement('p');
      note.className = 'comments__notice';
      note.innerHTML = 'Em breve, você poderá deixar sua opinião aqui. ' +
        '<a href="#download">Cadastre-se para saber quando o PULSO lançar</a>.';
      host.appendChild(note);
      return;
    }
    const box = document.createElement('div');
    box.className = 'giscus';
    host.appendChild(box);
    const s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.setAttribute('data-repo', c.repo);
    s.setAttribute('data-repo-id', c.repoId);
    s.setAttribute('data-category', c.category);
    s.setAttribute('data-category-id', c.categoryId);
    s.setAttribute('data-mapping', c.mapping);
    s.setAttribute('data-strict', '1');
    s.setAttribute('data-reactions-enabled', '1');
    s.setAttribute('data-emit-metadata', '0');
    s.setAttribute('data-input-position', 'top');
    s.setAttribute('data-theme', c.theme);
    s.setAttribute('data-lang', c.lang);
    s.crossOrigin = 'anonymous';
    s.async = true;
    host.appendChild(s);
  }
  initComments();

  /* ------------------------------------------------------------------
     FOOTER YEAR
     ------------------------------------------------------------------ */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
