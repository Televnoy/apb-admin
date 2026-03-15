const CACHE_NAME = 'apb-admin-v1';
const urlsToCache = [
  '/apb-admin/index.html',
  '/apb-admin/a-manifest.json',
  '/apb-admin/aicon-72.png',
  '/apb-admin/aicon-192.png',
  '/apb-admin/aicon-512.png'
];

// ✅ Проверка: можно ли кэшировать ответ
function isCacheableResponse(response) {
  if (!response) return false;
  // Opaque-ответы (cross-origin без CORS) кэшируем, но не проверяем статус
  if (response.type === 'opaque') return true;
  // Кэшируем только успешные ответы 200
  return response.ok && response.status === 200;
}

// ✅ Улучшенная функция кэширования с защитой
async function cacheResource(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const response = await fetch(request);
    
    if (isCacheableResponse(response)) {
      await cache.put(request, response.clone());
    }
  } catch (e) {
    console.warn('⚠️ Не удалось закэшировать:', request.url, e?.message);
  }
}

// Установка SW и кэширование
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        console.log('✅ Кэш открыт');
        // Кэшируем ресурсы по одному с обработкой ошибок
        for (const url of urlsToCache) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log('✓ Закэширован:', url);
            }
          } catch (err) {
            console.warn('⚠️ Не удалось закэшировать', url, err);
          }
        }
      })
      .catch(err => console.warn('❌ Ошибка кэширования:', err))
  );
  self.skipWaiting();
});

// Активация и очистка старого кэша
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => {
      console.log('🧹 Старый кэш очищен');
      return self.clients.claim();
    })
  );
});

// Стратегия: Cache First + Background Update
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(async cachedResponse => {
        // ✅ Есть в кэше — отдаём сразу, обновляем в фоне
        if (cachedResponse) {
          event.waitUntil(
            (async () => {
              try {
                const networkResponse = await fetch(event.request);
                if (isCacheableResponse(networkResponse)) {
                  const cache = await caches.open(CACHE_NAME);
                  await cache.put(event.request, networkResponse.clone());
                }
              } catch (e) {
                // Игнорируем ошибки фонового обновления
                console.debug('🔄 Background update failed:', event.request.url);
              }
            })()
          );
          return cachedResponse;
        }

        // ❌ Нет в кэше — идём в сеть
        try {
          const networkResponse = await fetch(event.request);
          if (isCacheableResponse(networkResponse)) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // 📴 Офлайн — возвращаем заглушку
          console.warn('📴 Offline, returning fallback:', event.request.url);
          return caches.match('/apb-admin/index.html');
        }
      })
  );
});

// Push-уведомления
self.addEventListener('push', event => {
  let title = 'АПБ Админ';
  let body = 'Новое событие';
  let data = { url: '/apb-admin/index.html' };

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload.notification) {
        title = payload.notification.title || title;
        body = payload.notification.body || body;
      }
      if (payload.data) {
        data = { ...data, ...payload.data };
      }
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  const options = {
    body: body,
    icon: '/apb-admin/aicon-192.png',
    badge: '/apb-admin/aicon-72.png',
    vibrate: [200, 100, 200],
    data,
    tag: 'apb-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Клик по уведомлению
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/apb-admin/index.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Сообщение от приложения (например, для обновления SW)
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
