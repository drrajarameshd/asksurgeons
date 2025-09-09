<!-- Place this immediately after the opening <body> tag -->
<script>
(function () {
  'use strict';
  var GTAG_ID = 'G-9FBX0G12S5';

  // 1) install safe shim so other code can call gtag() immediately
  window.dataLayer = window.dataLayer || [];
  function shimGtag(){ window.dataLayer.push(arguments); }
  window.gtag = window.gtag || shimGtag;

  // 2) queue the standard init calls (these will be queued if remote script doesn't load)
  try {
    window.gtag('js', new Date());
    window.gtag('config', GTAG_ID);
  } catch (e) {
    console.warn('gtag shim init error', e);
  }

  // 3) async-load the real remote gtag script safely (avoids SyntaxError if HTML returned)
  function loadRemoteGtag() {
    try {
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GTAG_ID;
      s.onload = function () { console.info('gtag: remote script loaded'); };
      s.onerror = function (err) { console.warn('gtag: failed to load remote script', err); };
      (document.head || document.documentElement).appendChild(s);
    } catch (err) {
      console.warn('gtag loader exception', err);
    }
  }

  // Try to load now if online, otherwise wait for online
  if (navigator.onLine) {
    loadRemoteGtag();
  } else {
    window.addEventListener('online', function onOnline() {
      window.removeEventListener('online', onOnline);
      loadRemoteGtag();
    }, { once: true });
  }
})();
</script>
