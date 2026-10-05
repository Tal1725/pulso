const CACHE = 'pulso-pwa-v8';
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
  '/pulso/assets/img/logo.svg',
  '/pulso/assets/img/favicon.svg',
  '/pulso/assets/img/pwa-icon-192.svg',
  '/pulso/assets/img/pwa-icon-512.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(APP_SHELL))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  event.respondWith(
    fetch(event.request)
      .then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      })
      .catch(()=>caches.match(event.request).then(cached=>cached||caches.match('/pulso/index.html')))
  );
});
