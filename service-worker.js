const CACHE = 'pulso-pwa-v15';
const APP_SHELL = [
  '/pulso/',
  '/pulso/index.html',
  '/pulso/manifest.webmanifest',
  '/pulso/app.html',
  '/pulso/entrar.html',
  '/pulso/cadastro.html',
  '/pulso/assets/css/styles.css',
  '/pulso/assets/css/auth.css',
  '/pulso/assets/css/app.css',
  '/pulso/assets/js/firebase-config.js',
  '/pulso/assets/js/login.js',
  '/pulso/assets/js/auth.js',
  '/pulso/assets/js/app.js',
  '/pulso/assets/js/follow.js',
  '/pulso/assets/js/pulso-publish-final.js',
  '/pulso/assets/js/pulso-profile-view.js',
  '/pulso/assets/js/messages.js',
  '/pulso/assets/js/notifications.js',
  '/pulso/assets/js/pulso-real.js',
  '/pulso/assets/js/pulso-search.js',
  '/pulso/assets/js/pulso-opportunities.js',
  '/pulso/assets/js/pulso-hives.js',
  '/pulso/assets/img/logo.svg',
  '/pulso/assets/img/favicon.svg',
  '/pulso/assets/img/pwa-icon-192.svg',
  '/pulso/assets/img/pwa-icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Do not let one missing/renamed asset prevent the whole PWA from updating.
    await Promise.allSettled(APP_SHELL.map(async path => {
      try {
        const response = await fetch(path, { cache: 'no-cache' });
        if (response.ok) await cache.put(path, response);
      } catch (error) {
        console.warn('[PULSO SW] Não foi possível pré-carregar:', path, error);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('pulso-pwa-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone()).catch(error => {
          console.warn('[PULSO SW] Cache ignorado:', error);
        });
      }
      return response;
    } catch (error) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      // Only HTML navigation may fall back to the app shell. Returning index.html
      // for a failed JS/CSS/image request causes MIME errors and broken modules.
      if (event.request.mode === 'navigate') {
        const shell = await caches.match('/pulso/index.html');
        if (shell) return shell;
      }
      throw error;
    }
  })());
});
