// Service Worker для SunfoodApp — v12: MIME-safe, stale chunk detection
const CACHE_VERSION = 'v12';
const CACHE_NAME = `sunfood-cache-${CACHE_VERSION}`;

// Ресурсы для кэширования
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/admin.html',
  '/manifest.json'
];

// Паттерны URL, которые нужно пропускать (не кэшировать и не перехватывать)
const SKIP_CACHE_PATTERNS = [
  '/api/',
  '/workshop/',
  '/workshop',
  '/admin/',
  '/admin',
  '/superowner/',
  '/superowner',
  '/owner/',
  '/barista/',
  '/courier/',
  'localhost:3000',
  '127.0.0.1:3000',
  'firebase',
  'googleapis',
  'chrome-extension',
  'us-central1-coffeeaddict-c9d70.cloudfunctions.net'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('SW: Installing version', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Cache opened');
        // Кэшируем ресурсы с обработкой ошибок
        return Promise.allSettled(
          STATIC_CACHE_URLS.map(async (url) => {
            try {
              const response = await fetch(url);
              if (response.ok) {
                await cache.put(url, response);
                console.log('SW: Cached:', url);
              } else {
                console.warn('SW: Could not cache', url, 'status:', response.status);
              }
            } catch (error) {
              console.warn('SW: Failed to cache', url, ':', error.message);
            }
          })
        );
      })
      .catch((error) => {
        console.error('SW: Failed to open cache:', error);
      })
  );
  
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('SW: Activating version', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // Also purge stale hashed assets from current cache
        return caches.open(CACHE_NAME).then((cache) =>
          cache.keys().then((requests) =>
            Promise.all(
              requests
                .filter((req) => /\/assets\/.*\.[a-f0-9]{6,}\.(js|css)(\?|$)/i.test(req.url))
                .map((req) => {
                  console.log('SW: Purging old hashed asset:', req.url);
                  return cache.delete(req);
                })
            )
          )
        );
      })
      .catch((error) => {
        console.error('SW: Error during activation:', error);
      })
  );
  
  self.clients.claim();
});

// Функция для проверки, нужно ли пропустить запрос
function shouldSkipRequest(url) {
  return SKIP_CACHE_PATTERNS.some(pattern => url.includes(pattern));
}

// Функция для проверки, является ли запрос запросом изображения
function isImageRequest(url) {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
         lowerUrl.includes('icon') || 
         lowerUrl.includes('favicon');
}

// Безопасная функция fetch с обработкой всех возможных ошибок
async function safeFetch(request) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
    
    const response = await fetch(request, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Проверяем статус ответа
    if (response.ok) {
      return response;
    }
    
    // Для ошибок 404 на изображениях возвращаем пустой ответ
    if (response.status === 404 && isImageRequest(request.url)) {
      console.log('SW: Image not found, returning empty response:', request.url);
      return new Response('', {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'image/png' }
      });
    }
    
    return response;
    
  } catch (error) {
    console.log('SW: Fetch error for', request.url, ':', error.message);
    
    // Для изображений возвращаем пустой успешный ответ
    if (isImageRequest(request.url)) {
      return new Response('', {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'image/png' }
      });
    }
    
    // Для навигационных запросов возвращаем offline страницу
    if (request.mode === 'navigate') {
      return new Response(`
        <!DOCTYPE html>
        <html lang="ru">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>SunFood - Офлайн</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                text-align: center; 
                padding: 50px 20px; 
                background: linear-gradient(135deg, #FF6B6B, #4ECDC4);
                color: white;
                min-height: 100vh;
                margin: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
              }
              h1 { font-size: 2.5em; margin-bottom: 0.5em; }
              p { font-size: 1.2em; margin-bottom: 2em; opacity: 0.9; }
              button { 
                padding: 15px 30px; 
                border: none; 
                border-radius: 25px; 
                background: rgba(255,255,255,0.2); 
                color: white; 
                font-size: 1.1em; 
                cursor: pointer; 
                transition: all 0.3s;
                backdrop-filter: blur(10px);
              }
              button:hover { 
                background: rgba(255,255,255,0.3); 
                transform: translateY(-2px);
              }
            </style>
          </head>
          <body>
            <h1>☕ SunFood</h1>
            <p>Приложение временно недоступно.<br>Проверьте подключение к интернету.</p>
            <button onclick="location.reload()">Попробовать снова</button>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    // Для остальных запросов бросаем ошибку
    throw error;
  }
}

// Основной обработчик fetch событий
self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;
  
  // Пропускаем определенные типы запросов
  if (shouldSkipRequest(requestUrl) || 
      event.request.method !== 'GET' ||
      !requestUrl.startsWith(self.location.origin)) {
    console.log('SW: Skipping request:', requestUrl);
    return;
  }
  
  // Пропускаем неизвестные иконки
  if (requestUrl.includes('/assets/icon/') && 
      !requestUrl.includes('icon-192.png') && 
      !requestUrl.includes('icon-512.png')) {
    console.log('SW: Skipping unknown icon:', requestUrl);
    return;
  }
  
  // Determine if this is a hashed asset (JS/CSS chunks) — always network-first
  const isHashedAsset = /\/assets\/.*\.[a-f0-9]{6,}\.(js|css)(\?|$)/i.test(requestUrl);

  event.respondWith(
    (async () => {
      try {
        if (isHashedAsset) {
          // Network-first for hashed JS/CSS chunks to avoid stale cache after deploy
          try {
            const networkResponse = await safeFetch(event.request);

            // CRITICAL: detect stale chunk — server returned HTML instead of JS/CSS
            // This happens when Firebase Hosting rewrites a missing asset to index.html
            const contentType = networkResponse.headers.get('content-type') || '';
            const isJsRequest = requestUrl.endsWith('.js');
            const isCssRequest = requestUrl.endsWith('.css');
            const gotHtml = contentType.includes('text/html');

            if (gotHtml && (isJsRequest || isCssRequest)) {
              // The chunk no longer exists on the server (new deploy).
              // Signal ALL clients to hard-reload so they pick up the new index.html
              // which references the new chunk hashes.
              console.warn('SW: Stale chunk detected (HTML instead of JS/CSS):', requestUrl);
              const clients = await self.clients.matchAll({ type: 'window' });
              for (const client of clients) {
                client.postMessage({ type: 'STALE_CHUNK', url: requestUrl });
              }
              // Return a 404 so the browser import fails cleanly
              // (the client-side listener will reload the page)
              return new Response('/* chunk outdated — reloading */', {
                status: 404,
                statusText: 'Chunk Outdated',
                headers: { 'Content-Type': isJsRequest ? 'application/javascript' : 'text/css' }
              });
            }

            // Only cache if we got actual JS/CSS, not something unexpected
            if (networkResponse.ok && networkResponse.type === 'basic' && !gotHtml) {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          } catch (err) {
            // Fallback to cache only if network fails
            const cached = await caches.match(event.request);
            if (cached) return cached;
            throw err;
          }
        }

        // Cache-first for everything else (images, fonts, etc.)
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          console.log('SW: Serving from cache:', requestUrl);
          return cachedResponse;
        }
        
        // Пытаемся получить из сети
        console.log('SW: Fetching from network:', requestUrl);
        const networkResponse = await safeFetch(event.request);
        
        // Кэшируем успешные ответы
        if (networkResponse.ok && networkResponse.type === 'basic') {
          try {
            const cache = await caches.open(CACHE_NAME);
            const responseClone = networkResponse.clone();
            await cache.put(event.request, responseClone);
            console.log('SW: Cached response for:', requestUrl);
          } catch (cacheError) {
            console.warn('SW: Failed to cache response:', cacheError.message);
          }
        }
        
        return networkResponse;
        
      } catch (error) {
        console.error('SW: Request completely failed:', requestUrl, error.message);
        
        // Не отдаём fallback для sub-apps — у них свои index.html
        const url = new URL(requestUrl);
        const isSubApp = url.pathname.startsWith('/workshop') ||
                         url.pathname.startsWith('/admin') ||
                         url.pathname.startsWith('/superowner') ||
                         url.pathname.startsWith('/owner') ||
                         url.pathname.startsWith('/barista') ||
                         url.pathname.startsWith('/courier');
        
        if (!isSubApp) {
          // Последняя попытка получить что-то из кэша для основного приложения
          try {
            const fallbackResponse = await caches.match('/index.html') || 
                                    await caches.match('/');
            
            if (fallbackResponse) {
              console.log('SW: Serving fallback from cache');
              return fallbackResponse;
            }
          } catch (cacheError) {
            console.error('SW: Cache fallback failed:', cacheError.message);
          }
        }
        
        // Если ничего не помогло, возвращаем минимальную ошибку
        return new Response('Service Unavailable', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    })()
  );
});

// Обработчик сообщений для обновления Service Worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('SW: Service Worker script loaded, version', CACHE_VERSION);
