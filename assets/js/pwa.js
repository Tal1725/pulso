(function () {
  'use strict';

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js', { scope: './' }).catch(function () {});
    });
  }

  var deferredPrompt = null;
  var button = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      window.navigator.standalone === true;
  }

  function createInstallButton() {
    if (button || isStandalone()) return;
    button = document.createElement('button');
    button.type = 'button';
    button.id = 'pulsoInstallButton';
    button.textContent = 'Instalar PULSO';
    button.setAttribute('aria-label', 'Instalar PULSO');
    button.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:9999;border:0;border-radius:999px;padding:12px 18px;background:#fff;color:#05060b;font:700 14px Inter,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);cursor:pointer;';
    button.addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () {
        deferredPrompt = null;
        if (button) button.remove();
        button = null;
      }).catch(function () {
        deferredPrompt = null;
      });
    });
    document.body.appendChild(button);
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredPrompt = event;
    createInstallButton();
  });

  window.addEventListener('appinstalled', function () {
    if (button) button.remove();
    button = null;
    deferredPrompt = null;
  });
})();