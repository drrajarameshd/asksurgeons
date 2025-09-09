// assets/scripts/gtag.js - pure JS init (no <script> wrapper)
(function () {
  'use strict';
  var GTAG_ID = 'AW-17523822825';

  // safe shim so gtag() is callable immediately
  window.dataLayer = window.dataLayer || [];
  function shimGtag(){ window.dataLayer.push(arguments); }
  if (typeof window.gtag !== 'function') window.gtag = shimGtag;

  try {
    window.gtag('js', new Date());
    window.gtag('config', GTAG_ID);
  } catch (e) {
    console.warn('gtag shim init error', e);
  }

  // optionally protect against multiple insertions
  if (!document.querySelector('script[data-gtag-init]')) {
    var s = document.createElement('script');
    s.setAttribute('data-gtag-init', '1');
    // we already loaded remote gtag via <script async src="..."> in head,
    // so this is optional. If you want to async load the remote script from here,
    // uncomment the following lines and remove remote <script> from <head>.
    // s.async = true;
    // s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GTAG_ID;
    // s.crossOrigin = 'anonymous';
    // (document.head || document.documentElement).appendChild(s);
  }

})();
