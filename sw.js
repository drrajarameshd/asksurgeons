// /sw.js - Safe Service Worker for AskSurgeons
// - Precaches core assets
// - Bypasses common analytics/CDN hosts so external scripts are fetched from network
// - Navigation fallback only for navigations (no HTML fallback for scripts/fonts)
// - Supports SKIP_WAITING via message (works with sw-register.js)

const CACHE_VERSION = 'v1';
const CACHE_NAME = `asksurgeons-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/.well-known/assetlinks.json',
  '/index.html',
  '/chat.html',
  '/contact.html',
  '/disclaimer.html',
  '/doctors.html',
  '/doctors/data.json',
  '/doctors/images/image1.webp',
  '/doctors/images/image2.webp',
  '/doctors/images/image3.webp',
  '/offline.html',
  '/manifest.json',
  '/assets/style.css',
  '/assets/scripts/chat.js',
  '/assets/scripts/doctors.js',
  '/assets/scripts/script.js',
  '/assets/scripts/sw-register.js',
  '/assets/icons/favicon.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/logos/logo.png',
  '/assets/logos/logo2.png',
  '/assets/logos/logo3.webp',
  '/assets/logos/logow.webp',
  // add other app-shell assets you consider essential
];

// Hosts we will never intercept/cache — always go to network
const EXTERNAL_HOSTS = [
  'googletagmanager.com',
  'google-analytics.com',
  'www.google-analytics.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net'
];

/* ---------- Install: pre-cache app shell ---------- */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .catch(err => {
        // Log and allow install to finish — worker will still activate, but cache may be partial
        console.warn('[SW] precache failed:', err);
      })
  );
});

/* ---------- Activate: cleanup old caches ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

/* ---------- Utility to detect external/analytics hosts ---------- */
function isExternalRequest(url) {
  try {
    if (url.origin !== self.location.origin) return true;
    const host = url.hostname || '';
    return EXTERNAL_HOSTS.some(h => host.includes(h));
  } catch (e) {
    return true;
  }
}

/* ---------- Fetch handler ---------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ignore non-GET requests to avoid cache issues
  if (req.method !== 'GET') {
    return;
  }

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    // Malformed URL — don't intercept
    return;
  }

  // If this is cross-origin or a host we consider external, DO NOT intercept — let browser fetch
  if (isExternalRequest(url)) {
    return; // no event.respondWith => browser will perform default fetch
  }

  // For navigation requests (page loads), use network-first, fallback to cache (and offline page)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(networkRes => {
          // Optionally update cache with navigation response
          if (networkRes && networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(req, clone).catch(()=>{/* ignore */});
            });
          }
          return networkRes;
        })
        .catch(() => {
          // Network failed: return cached index.html or offline.html
          return caches.match('/index.html').then(res => res || caches.match('/offline.html'));
        })
    );
    return;
  }

  // For same-origin static assets: try cache first, then network; cache successful GET responses
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(networkRes => {
        if (networkRes && networkRes.ok) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, clone).catch(()=>{/* ignore caching errors */});
          });
        }
        return networkRes;
      }).catch(() => {
        // If request expects HTML, return offline page
        const accept = req.headers.get('accept') || '';
        if (accept.includes('text/html')) {
          return caches.match('/offline.html');
        }
        // otherwise return a generic fallback response (could be empty)
        return new Response('', { status: 504, statusText: 'Network error' });
      });
    })
  );
});

/* ---------- Message handler: SKIP_WAITING support ---------- */
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ---------- Optional: listen for push/notification events if you use them (not included) ---------- */
