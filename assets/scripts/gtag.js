<!-- Safe Google tag loader (replace your existing gtag tags with this) -->
<script>
(function () {
  'use strict';

  var GTAG_ID = 'G-9FBX0G12S5';

  // 1) Install safe shim so gtag() calls are queued and won't throw
  window.dataLayer = window.dataLayer || [];
  function shimGtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || shimGtag;

  // 2) Queue initial GA calls
  try {
    window.gtag('js', new Date());
    window.gtag('config', GTAG_ID);
  } catch (e) {
    console.warn('gtag shim init error', e);
  }

  // 3) Load remote gtag script safely (prevents SyntaxError if response is HTML)
  function loadRemote() {
    try {
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GTAG_ID;

      s.onload = function () {
        // remote script loaded; it will normally replace window.gtag with the real impl
        console.info('gtag: remote script loaded');
      };

      s.onerror = function (err) {
        // network error or blocked resource — keep shim in place (queued calls remain)
        console.warn('gtag: failed to load remote script', err);
      };

      (document.head || document.documentElement).appendChild(s);
    } catch (err) {
      console.warn('gtag: loader exception', err);
    }
  }

  // Only attempt load if online; otherwise wait for online event
  if (navigator.onLine) {
    loadRemote();
  } else {
    window.addEventListener('online', function onOnline() {
      window.removeEventListener('online', onOnline);
      loadRemote();
    }, { once: true });
  }
})();
</script>
