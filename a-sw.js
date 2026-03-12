const CACHE_NAME = 'apb-admin-v2'; // при изменении файлов увеличивайте версию, например v3
const urlsToCache = [
  '/apb-admin/index.html',
  '/apb-admin/a-manifest.json',
  '/apb-admin/aicon-192.png',
  '/apb-admin/aicon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        const cachePromises = urlsToCache.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`Failed to cache ${url}:`, err);
          });
        });
        return Promise.all(cachePromises);
      })
  );
  // Заставляем новый воркер активироваться сразу после установки
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Фоновое обновление
          fetch(event.request)
            .then(networkResponse => {
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, networkResponse));
            })
            .catch(() => {});
          return response;
        }
        return fetch(event.request)
          .then(networkResponse => {
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, networkResponse.clone()));
            return networkResponse;
          });
      })
      .catch(() => caches.match('/apb-admin/index.html'))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => {
      // Немедленно захватываем контроль над всеми клиентами
      return self.clients.claim();
    })
  );
});

// Слушаем сообщения от страницы
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
