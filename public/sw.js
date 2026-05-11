// public/sw.js - ИСПРАВЛЕННАЯ ВЕРСИЯ v2
const CACHE_NAME = 'tradeumdiary-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.svg'];

// Fallback страница для оффлайн
const FALLBACK_PAGE = `
<!DOCTYPE html>
<html>
<head><title>Offline</title><meta charset="UTF-8"></head>
<body style="background:#0a0a0f;color:#e6e6e8;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
  <div style="text-align:center;">
    <h1 style="margin:0 0 16px 0;font-size:24px;">Вы оффлайн</h1>
    <p style="margin:0;color:#8a8f98;">Проверьте подключение к интернету</p>
  </div>
</body>
</html>
`.trim();

// ============================================
// INSTALL - кэшируем статику
// ============================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(STATIC_ASSETS);
        console.log('[SW] Static assets cached');
      } catch (error) {
        console.error('[SW] Install failed:', error);
      }
      self.skipWaiting();
    })()
  );
});

// ============================================
// ACTIVATE - чистим старые кэши
// ============================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
        console.log('[SW] Old caches cleaned');
        await self.clients.claim();
      } catch (error) {
        console.error('[SW] Activate failed:', error);
      }
    })()
  );
});

// ============================================
// FETCH - стратегия кэширования
// ============================================
self.addEventListener('fetch', (event) => {
  // Пропускаем не-GET запросы
  if (event.request.method !== 'GET') return;

  // Пропускаем запросы к API Supabase (они всегда должны идти через сеть)
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        // 1. Пробуем получить из кэша
        const cached = await cache.match(event.request);
        if (cached) {
          // Асинхронно обновляем кэш в фоне
          fetchAndCache(event.request, cache);
          return cached;
        }

        // 2. Пробуем получить из сети
        const response = await fetch(event.request).catch(() => null);

        if (response && response.ok) {
          // Кэшируем успешный ответ
          if (event.request.method === 'GET' && isCacheable(event.request)) {
            cache.put(event.request, response.clone());
          }
          return response;
        }

        // 3. Fallback для навигации
        if (isNavigationRequest(event.request)) {
          const fallback = await cache.match('/');
          if (fallback) return fallback;

          return new Response(FALLBACK_PAGE, {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        // 4. Fallback для других запросов
        return new Response('Offline', { status: 503 });
      } catch (error) {
        console.error('[SW] Fetch error:', error);

        // Финальный fallback
        if (isNavigationRequest(event.request)) {
          const fallback = await cache.match('/');
          if (fallback) return fallback;
        }

        return new Response('Network Error', { status: 503 });
      }
    })()
  );
});

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok && isCacheable(request)) {
      cache.put(request, response.clone());
    }
  } catch (error) {
    // Игнорируем ошибки фоновой кэшизации
  }
}

function isCacheable(request) {
  const url = new URL(request.url);

  // Кэшируем только те же самые источники
  if (url.origin !== self.location.origin) return false;

  // Кэшируем HTML, CSS, JS, изображения
  const cacheableTypes = ['.html', '.css', '.js', '.svg', '.png', '.jpg', '.woff', '.woff2'];

  return cacheableTypes.some((ext) => url.pathname.endsWith(ext));
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// ============================================
// MESSAGE - для контроля с клиента
// ============================================
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});
