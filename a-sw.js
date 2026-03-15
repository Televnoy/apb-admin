const CACHE_NAME = 'apb-admin-v1';
const urlsToCache = [
  '/apb-admin/index.html',
  '/apb-admin/a-manifest.json',
  '/apb-admin/aicon-72.png',
  '/apb-admin/aicon-192.png',
  '/apb-admin/aicon-512.png'
];

// 🔥 URLs, которые НЕЛЬЗЯ кэшировать (API, стримы, внешние сервисы)
const EXCLUDED_PATTERNS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',  // Firebase Auth
  'securetoken.googleapis.com',      // Firebase Token
  'fcm.googleapis.com',              // Firebase Messaging
  'googleapis.com',                  // Остальные Google API
  'localhost:',                       // Локальная разработка
  '127.0.0.1',
  '.sock',                           // WebSocket
  'listen'                           // Firestore long-polling
];

// ✅ Проверка: можно ли обрабатывать запрос через SW
function shouldInterceptRequest(url) {
  try {
    const parsed = new URL(url);
    // Исключаем внешние домены и паттерны
    for (const pattern of EXCLUDED_PATTERNS) {
      if (parsed.hostname.includes(pattern) || parsed.pathname.includes(pattern)) {
        return false;
      }
    }
    // Разрешаем только same-origin или явно разрешённые пути
    return parsed.origin === self.location.origin || 
           url.startsWith('/apb-admin/');
  } catch {
    return false;
  }
}

// ✅ Проверка: можно ли кэшировать ответ
function isCacheableResponse(response) {
  if (!response) return false;
  if (response.type === 'opaque') return true;
  return response.ok && response.status === 200;
}

// ✅ Кэширование с защитой
async function cacheResource(request, cacheName) {
  if (!shouldInterceptRequest(request.url)) return;
  
  try {
    const cache = await caches.open(cacheName);
    const response = await fetch(request);
    
    if (isCacheableResponse(response)) {
      await cache.put(request, response.clone());
    }
  } catch (e) {
    console.debug('⚠️ Не закэшировано:', request.url);
  }
}

// Установка
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        console.log('✅ Кэш открыт');
        for (const url of urlsToCache) {
          try {
            const response = await fetch(url);
            if (response?.ok) {
              await cache.put(url, response);
              console.log('✓ Закэширован:', url);
            }
          } catch (err) {
            console.warn('⚠️ Не удалось закэшировать', url);
          }
        }
      })
  );
  self.skipWaiting();
});

// Активация
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => {
      console.log('🧹 Старый кэш очищен');
      return self.clients.claim();
    })
  );
});

// 🔥 Главный обработчик fetch
self.addEventListener('fetch', event => {
  // Игнорируем не-GET и внешние API
  if (event.request.method !== 'GET' || !shouldInterceptRequest(event.request.url)) {
    return; // ❌ Не перехватываем — пусть идёт напрямую в сеть
  }

  event.respondWith(
    caches.match(event.request)
      .then(async cachedResponse => {
        // 📦 Есть в кэше — отдаём, обновляем в фоне
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
                console.debug('🔄 Background update failed:', event.request.url);
              }
            })()
          );
          return cachedResponse;
        }

        // 🌐 Нет в кэше — идём в сеть
        try {
          const networkResponse = await fetch(event.request);
          if (isCacheableResponse(networkResponse)) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // 📴 Офлайн для статики — возвращаем заглушку
          // Но ТОЛЬКО для HTML-навигации, не для API!
          if (event.request.destination === 'document') {
            console.warn('📴 Offline, returning index.html');
            return caches.match('/apb-admin/index.html');
          }
          // Для API/JS/CSS — возвращаем ошибку, чтобы приложение увидело проблему
          console.warn('📴 Offline, cannot fetch:', event.request.url);
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        }
      })
  );
});

// Push
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
      if (payload.data) data = { ...data, ...payload.data };
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/apb-admin/aicon-192.png',
      badge: '/apb-admin/aicon-72.png',
      vibrate: [200, 100, 200],
      data,
      tag: 'apb-notification',
      renotify: true
    })
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
        if (clients.openWindow) return clients.openWindow(urlToOpen);
      })
  );
});

// Сообщения от приложения
self.addEventListener('message', event => {
  if (event.data?.action === 'skipWaiting') self.skipWaiting();
});
