const CACHE_NAME = 'apb-admin-v3';
const urlsToCache = [
  '/apb-admin/index.html',
  '/apb-admin/a-manifest.json',
  '/apb-admin/aicon-192.png',
  '/apb-admin/aicon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.warn('Cache addAll error:', err))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  // Пропускаем POST-запросы – не пытаемся их кэшировать
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Фоновое обновление кэша
          event.waitUntil(
            fetch(event.request)
              .then(networkResponse => {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
              })
              .catch(() => {})
          );
          return cachedResponse;
        }
        // Нет в кэше – идём в сеть и кэшируем ответ
        return fetch(event.request)
          .then(networkResponse => {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
            return networkResponse;
          })
          .catch(() => caches.match('/apb-admin/index.html'));
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

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

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});

self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
