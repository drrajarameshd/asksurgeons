// sw.js - AskSurgeons (multi-page friendly)
// Version bump to force update when you change this file.
const SW_VERSION = 'asksurgeons-v1.2025-09-06';

// Cache names
const PRECACHE = `${SW_VERSION}-precache`;
const RUNTIME = `${SW_VERSION}-runtime`;
const IMAGE_CACHE = `${SW_VERSION}-images`;
const DATA_CACHE = `${SW_VERSION}-data`;

// Files to precache (app shell + important pages)
const PRECACHE_URLS = [
  '/',              // start_url - must be cached & controlled
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

// Image cache limits
const IMAGE_CACHE_MAX_ENTRIES = 60;
const IMAGE_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

// Utility: trim cache to a max number of entries (FIFO)
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxItems) return;
    const removeCount = keys.length - maxItems;
    for (let i = 0; i < removeCount; i++) {
      await cache.delete(keys[i]);
    }
  } catch (e) {
    console.warn('trimCache error', e);
  }
}

// Utility: remove entries older than maxAgeMs (optional)
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
    // non-fatal cleanup
  }
}

// Create aliases in precache so requests like '/doctors' match '/doctors.html'
async function createPrecacheAliases() {
  try {
    const cache = await caches.open(PRECACHE);
    const aliasMap = [
      { from: '/doctors', to: '/doctors.html' },
      { from: '/doctors/', to: '/doctors.html' },
      { from: '/about', to: '/about.html' },
      { from: '/services', to: '/services.html' },
      { from: '/contact', to: '/contact.html' }
      // add more aliases if you have other "extensionless" routes
    ];
    for (const a of aliasMap) {
      const resp = await cache.match(a.to);
      if (resp) {
        await cache.put(a.from, resp.clone());
      }
    }
  } catch (e) {
    console.warn('createPrecacheAliases failed', e);
  }
}

// Install: precache resources (safe: logs failures)
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE);
    const failed = [];
    for (const url of PRECACHE_URLS) {
      try {
        // fetch fresh during install
        const res = await fetch(url, { cache: 'no-store' });
        if (!res || !res.ok) throw new Error(`${res ? res.status : 'no-response'}`);
        await cache.put(url, res.clone());
      } catch (err) {
        failed.push({ url, err: err && err.message ? err.message : String(err) });
        console.warn('Precache failed for', url, err);
      }
    }
    // Create alias entries to support extensionless routes like /doctors
    await createPrecacheAliases();

    if (failed.length) {
      // We don't abort install by default to allow development; uncomment to enforce.
      // throw new Error('Precache failed: ' + JSON.stringify(failed));
      console.warn('Precache encountered failures:', failed);
    }
  })());
});

// Activate: cleanup and claim clients
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    clients.claim();
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => ![PRECACHE, RUNTIME, IMAGE_CACHE, DATA_CACHE].includes(k))
          .map(k => caches.delete(k))
    );
    // optional: cleanup old image entries by age
    removeOldEntries(IMAGE_CACHE, IMAGE_CACHE_MAX_AGE);
  })());
});

// Helper: detect JSON/API requests
function isJSONRequest(request) {
  try {
    const accept = request.headers.get('Accept') || '';
    return request.url.endsWith('.json') || accept.includes('application/json') || request.destination === 'document' && request.url.endsWith('.json');
  } catch (e) {
    return false;
  }
}

// Fetch handler with multi-page navigation support
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle same-origin resources with runtime strategies
  if (url.origin === location.origin) {

    // NAVIGATION - multi-page friendly
    if (request.mode === 'navigate') {
      event.respondWith((async () => {
        // 1) Try exact match (covers alias keys too)
        const exact = await caches.match(request);
        if (exact) return exact;

        // 2) Try common multi-page variants: /foo -> /foo.html and /foo/index.html
        try {
          const pathname = url.pathname.replace(/\/+$/, ''); // remove trailing slash
          if (pathname && pathname !== '') {
            const base = pathname.startsWith('/') ? pathname : `/${pathname}`;
            const candidates = [
              `${base}.html`,
              `${base}/index.html`,
              `${base}.html`.replace(/^\//, ''),
              `${base}/index.html`.replace(/^\//, '')
            ];
            for (const cand of candidates) {
              const resp = await caches.match(cand);
              if (resp) return resp;
            }
          }
        } catch (e) {
          // ignore and continue to shell/network
        }

        // 3) Fallback to the app shell (index.html or root) as last resort
        const shell = await caches.match('/index.html') || await caches.match('/');
        if (shell) return shell;

        // 4) Network fallback and cache if succeeds
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            const runtimeCache = await caches.open(RUNTIME);
            runtimeCache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // 5) Final fallback: offline page
          const offline = await caches.match('/offline.html');
          if (offline) return offline;
          return new Response('<h1>Offline</h1><p>Page not available offline.</p>', {
            headers: { 'Content-Type': 'text/html' }, status: 503
          });
        }
      })());
      return;
    }

    // API / JSON -> network-first, fallback to cache, fallback to /doctors/data.json
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
          const fallback = await caches.match('/doctors/data.json');
          if (fallback) return fallback;
          return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503, headers: { 'Content-Type': 'application/json' }
          });
        }
      })());
      return;
    }

    // CSS & JS -> stale-while-revalidate
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
            return undefi
