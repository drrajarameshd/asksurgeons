<script>
(function(){
  var GTAG_ID = 'G-9FBX0G12S5';
  function loadGtag(){
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GTAG_ID;
    s.onload = function(){
      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', GTAG_ID);
      console.log('gtag loaded');
    };
    s.onerror = function(e){
      console.warn('gtag failed to load', e);
    };
    document.head.appendChild(s);
  }
  if (navigator.onLine) loadGtag(); else window.addEventListener('online', loadGtag, {once:true});
})();
</script>
