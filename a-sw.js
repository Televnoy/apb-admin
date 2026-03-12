const CACHE_NAME = 'apb-admin-v4'; // увеличьте версию при изменении
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
          return cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err));
        });
        return Promise.all(cachePromises);
      })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          fetch(event.request)
            .then(networkResponse => {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
            })
            .catch(() => {});
          return response;
        }
        return fetch(event.request)
          .then(networkResponse => {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
            return networkResponse;
          });
      })
      .catch(() => caches.match('/apb-admin/index.html'))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Обработка push-уведомлений
self.addEventListener('push', event => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'Новое событие', body: event.data.text() };
    }
  }
  const options = {
    body: data.body || 'Обновите приложение',
    icon: '/apb-admin/aicon-192.png',
    badge: '/apb-admin/aicon-72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/apb-admin/index.html' }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'АПБ Админ', options)
  );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});

// Слушаем сообщения от страницы (для обновления)
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
