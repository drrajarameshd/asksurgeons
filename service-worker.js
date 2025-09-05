// Service Worker for AskSurgeons (simple, robust caching strategies)
// Version this to force updates when you change SW
const SW_VERSION = 'asksurgeons-v1.2025-09-05';

// Core caches
const PRECACHE = `${SW_VERSION}-precache`;
const RUNTIME = `${SW_VERSION}-runtime`;
const IMAGE_CACHE = `${SW_VERSION}-images`;
const DATA_CACHE = `${SW_VERSION}-data`;

// Files to precache (app shell). Adjust list if your filenames differ.
const PRECACHE_URLS = [
  '/', // important: start_url must be cached and controlled
  '/index.html',
  '/about.html',
  '/services.html',
  '/contact.html',
  '/doctors.html',
  '/manifest.json',
  '/assets/style.css',
  '/assets/script.js',
  '/assets/doctors.js',
  '/assets/chat.js',
  '/assets/logo.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/photo1.jpg',
  '/assets/photo2.jpg',
  '/assets/photo3.jpg',
  '/doctors/data.json',
  '/offline.html' // fallback page included in precache
];

// Limits
const IMAGE_CACHE_MAX_ENTRIES = 60;
const IMAGE_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

// Utility: trim cache to max entries (FIFO)
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    // recursive trim
    await trimCache(cacheName, maxItems);
  }
}

// Install: precache app shell
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .catch(err => {
        console.warn('Precaching failed:', err);
      })
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', event => {
  clients.claim();
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => ![PRECACHE, RUNTIME, IMAGE_CACHE, DATA_CACHE].includes(key))
          .map(key => caches.delete(key))
    ))
  );
});

// Fetch handler - routing strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests for runtime caching here
  if (url.origin === location.origin) {

    // 1) Navigation requests (user visits pages) -> serve cached start_url / page first for fast load
    if (request.mode === 'navigate') {
      event.respondWith(
        caches.match(request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          // network fallback: fetch and cache for offline
          return fetch(request).then(networkResponse => {
            return caches.open(RUNTIME).then(cache => {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            });
          }).catch(() => caches.match('/offline.html'));
        })
      );
      return;
    }

    // 2) API / JSON - network first, fallback to cache
    if (request.destination === '' || request.url.endsWith('.json') || request.headers.get('Accept')?.includes('application/json')) {
      event.respondWith(
        fetch(request).then(networkResponse => {
          // cache a copy
          caches.open(DATA_CACHE).then(cache => cache.put(request, networkResponse.clone()));
          return networkResponse;
        }).catch(() => caches.match(request).then(cached => cached || caches.match('/doctors/data.json')))
      );
      return;
    }

    // 3) CSS & JS - stale-while-revalidate
    if (request.destination === 'script' || request.destination === 'style') {
      event.respondWith(
        caches.open(RUNTIME).then(cache =>
          cache.match(request).then(cachedResp => {
            const networkFetch = fetch(request).then(networkResp => {
              cache.put(request, networkResp.clone());
              return networkResp;
            }).catch(() => {});
            // return cached if available, otherwise network
            return cachedResp || networkFetch;
          })
        )
      );
      return;
    }

    // 4) Images - cache-first, limit size
    if (request.destination === 'image' || /\.(png|jpg|jpeg|webp|svg|gif)$/.test(url.pathname)) {
      event.respondWith(
        caches.open(IMAGE_CACHE).then(cache =>
          cache.match(request).then(cachedResp => {
            if (cachedResp) return cachedResp;
            return fetch(request).then(networkResp => {
              cache.put(request, networkResp.clone());
              // trim cache but not awaited
              trimCache(IMAGE_CACHE, IMAGE_CACHE_MAX_ENTRIES);
              return networkResp;
            }).catch(() => {
              // fallback to a local placeholder (logo) if image missing
              return caches.match('/assets/logo.png');
            });
          })
        )
      );
      return;
    }
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Listen for skipWaiting via message from page (for controlled updates)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
