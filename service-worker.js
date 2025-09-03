self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("asksurgeons-cache").then(cache => {
      return cache.addAll(["/", "/index.html", "/about.html", "/services.html", "/contact.html"]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
