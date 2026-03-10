const CACHE_NAME = 'apb-admin-v2'; // увеличиваем версию
const urlsToCache = [
  '/apb-app/admin.html',
  '/apb-app/a-manifest.json',
  '/apb-app/aicon-192.png',
  '/apb-app/aicon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Кэшируем каждый файл по отдельности, игнорируя ошибки
        const cachePromises = urlsToCache.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`Failed to cache ${url}:`, err);
            // Пропускаем ошибку, чтобы установка продолжилась
          });
        });
        return Promise.all(cachePromises);
      })
  );
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
      .catch(() => caches.match('/apb-app/admin.html'))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
});
