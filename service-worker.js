self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open('agenda-v1').then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './style.js',
        './manifest.json',
        './style.css', // se tiver um CSS separado
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => {
      return resp || fetch(event.request);
    })
  );
});
