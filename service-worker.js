const CACHE = 'pulso-pwa-v4-20260926';
const APP_SHELL = [
  '/pulso/',
  '/pulso/index.html',
  '/pulso/manifest.webmanifest',
  '/pulso/assets/css/styles.css',
  '/pulso/assets/js/main.js',
  '/pulso/assets/js/follow.js',
  '/pulso/assets/img/logo.svg',
  '/pulso/assets/img/favicon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Network first: published PULSO code must update immediately.
  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
      }
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match('/pulso/index.html')))
  );
});
