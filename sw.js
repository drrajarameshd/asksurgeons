// sw.js - AskSurgeons Service Worker (drop-in copy/paste)
// Version changes force update; change when you want clients to update.
const SW_VERSION = 'asksurgeons-v1.2025-09-05';

// Cache names
const PRECACHE = `${SW_VERSION}-precache`;
const RUNTIME = `${SW_VERSION}-runtime`;
const IMAGE_CACHE = `${SW_VERSION}-images`;
const DATA_CACHE = `${SW_VERSION}-data`;

// Files to precache (app shell)
const PRECACHE_URLS = [
  '/', // start_url must be cached & controlled
  '/index.html',
  '/about.html',
  '/services.html',
  '/contact.html',
  '/doctors.html',
  '/manifest.json',
  '/assets/style.css',
  '/assets/scripts/script.js',
  '/assets/scripts/doctors.js',
  '/assets/scripts/chat.js',
  '/assets/logos/logo.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/photos/photo1.jpg',
  '/assets/photos/photo2.jpg',
  '/assets/photos/photo3.jpg',
  '/doctors/data.json',
  '/offline.html'
];

// Limits for image cache
const IMAGE_CACHE_MAX_ENTRIES = 60;
const IMAGE_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

// Utility: trim cache to max entries (FIFO)
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxItems) return;
    // delete oldest until under limit
    const removeCount = keys.length - maxItems;
    for (let i = 0; i < removeCount; i++) {
      await cache.delete(keys[i]);
    }
  } catch (e) {
    console.warn('trimCache error', e);
  }
}

// Utility: delete items older than maxAge (optional cleanup)
async function removeOldEntries(cacheName, maxAgeMs) {
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    const now = Date.now();
    for (const req of requests) {
      const resp = await cache.match(req);
      if (!resp) continue;
      const dateHeader = resp.headers.get('date');
      if (!dateHeader) continue;
      const age = now - new Date(dateHeader).getTime();
      if (age > maxAgeMs) {
        await cache.delete(req);
      }
    }
  } catch (e) {
    // not fatal
  }
}

// Install: safer precache that logs missing resources
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE);
    const failed = [];
    for (const url of PRECACHE_URLS) {
      try {
        // use no-store to ensure we fetch fresh versions during install
        const res = await fetch(url, { cache: 'no-store' });
        if (!res || !res.ok) throw new Error(`${res ? res.status : 'no-response'}`);
        await cache.put(url, res.clone());
      } catch (err) {
        failed.push({ url, err: err && err.message ? err.message : String(err) });
        console.warn('Precache failed for', url, err);
      }
    }
    if (failed.length) {
      // We do NOT throw here to allow SW to install in development; uncomment to enforce precache
      // throw new Error('Precache failed: ' + JSON.stringify(failed));
      // But log an explicit summary for debugging:
      console.warn('Precache encountered failures (see above). Files missing may prevent offline behavior or installability:', failed);
    }
  })());
});

// Activate: cleanup old caches and claim clients
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    clients.claim();
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => ![PRECACHE, RUNTIME, IMAGE_CACHE, DATA_CACHE].includes(k))
          .map(k => caches.delete(k))
    );
    // optional: cleanup old entries in image cache
    removeOldEntries(IMAGE_CACHE, IMAGE_CACHE_MAX_AGE);
  })());
});

// Helper to determine if request expects JSON
function isJSONRequest(request) {
  try {
    const accept = request.headers.get('Accept') || '';
    return request.url.endsWith('.json') || accept.includes('application/json') || request.destination === 'document' && request.url.endsWith('.json');
  } catch (e) {
    return false;
  }
}

// Fetch handler
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests with our runtime strategies here
  if (url.origin === location.origin) {

    // NAVIGATION (page loads) -> prefer cache (app shell), fallback network, then offline.html
    if (request.mode === 'navigate') {
      event.respondWith((async () => {
        // 1. try exact match in cache
        const cachedNav = await caches.match(request);
        if (cachedNav) return cachedNav;

        // 2. try cached start page explicit (/) or index.html
        const start = await caches.match('/') || await caches.match('/index.html');
        if (start) return start;

        // 3. network and cache result
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(RUNTIME);
          // only cache successful HTML responses
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // offline fallback
          const offline = await caches.match('/offline.html');
          return offline || new Response('<h1>Offline</h1><p>The app is offline and no offline page is cached.</p>', { headers: { 'Content-Type': 'text/html' }});
        }
      })());
      return;
    }

    // API / JSON -> network-first, fallback to cache, fallback to doctors/data.json
    if (isJSONRequest(request)) {
      event.respondWith((async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(DATA_CACHE);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          const cached = await caches.match(request);
          if (cached) return cached;
          // fallback to known static data file if present
          const fallback = await caches.match('/doctors/data.json');
          if (fallback) return fallback;
          return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' }});
        }
      })());
      return;
    }

    // CSS & JS -> stale-while-revalidate (serve cache if present, update in background)
    if (request.destination === 'style' || request.destination === 'script') {
      event.respondWith((async () => {
        const cache = await caches.open(RUNTIME);
        const cachedResp = await cache.match(request);
        const networkFetch = (async () => {
          try {
            const networkResp = await fetch(request);
            if (networkResp && networkResp.ok) {
              cache.put(request, networkResp.clone());
            }
            return networkResp;
          } catch (e) {
            return undefined;
          }
        })();
        // return cached if available, otherwise await network
        return cachedResp || await networkFetch || new Response('', { status: 504 });
      })());
      return;
    }

    // Images -> cache-first with max entries and fallback
    if (request.destination === 'image' || /\.(png|jpg|jpeg|webp|svg|gif)$/.test(url.pathname)) {
      event.respondWith((async () => {
        const cache = await caches.open(IMAGE_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const networkResp = await fetch(request);
          if (networkResp && networkResp.ok) {
            cache.put(request, networkResp.clone());
            // trim cache (non-blocking)
            trimCache(IMAGE_CACHE, IMAGE_CACHE_MAX_ENTRIES).catch(() => {});
          }
          return networkResp;
        } catch (err) {
          // fallback to a cached logo or a simple placeholder response
          const fallback = await caches.match('/assets/logos/logo.png');
          if (fallback) return fallback;
          return new Response('', { status: 504 });
        }
      })());
      return;
    }
  }

  // Default handler: try network, fallback to cache
  event.respondWith((async () => {
    try {
      return await fetch(request);
    } catch (err) {
      const cached = await caches.match(request);
      if (cached) return cached;
      // ultimate fallback: offline page for navigations handled above; here return network error response
      return new Response('Network error', { status: 504 });
    }
  })());
});

// Support skipWaiting via postMessage from client
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
