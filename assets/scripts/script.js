/* assets/script.js — site-wide, minimal, production-ready
   - Service worker registration (non-blocking)
   - Carousel (mobile-first)
   - Bottom-nav active highlight
   - Accessibility helpers
   - Lightweight, avoids keyboard/nav logic
*/

/* ----------------------------- Utilities ----------------------------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const isInputEl = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');

function debounce(fn, wait = 120) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}
function onIdle(cb) {
  if ('requestIdleCallback' in window) requestIdleCallback(cb, { timeout: 1000 });
  else setTimeout(cb, 500);
}

/* ----------------------------- Service Worker Registration ----------------------------- */
(function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => {
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          reg.addEventListener('updatefound', () => {
            const newSW = reg.installing;
            newSW.addEventListener('statechange', () => {
              if (newSW.state === 'installed') {
                console.log('New service worker installed.');
              }
            });
          });
          console.log('Service worker registered:', reg);
        })
        .catch(err => console.warn('SW registration failed:', err));
    }, { passive: true });
  }
})();

/* ----------------------------- Bottom-nav active highlight ----------------------------- */
(function highlightBottomNav() {
  const nav = $('.bottom-nav');
  if (!nav) return;

  function normalizePath(p) {
    if (!p) return 'index.html';
    p = p.split('?')[0].split('#')[0];
    p = p.replace(/^\.\//, '');
    if (p === '') p = 'index.html';
    return p;
  }

  function activate() {
    const path = normalizePath(location.pathname.split('/').pop() || 'index.html');
    $$('.bottom-nav a').forEach(a => {
      const hrefRaw = a.getAttribute('href') || '';
      const href = normalizePath(hrefRaw);
      if (href === path) a.classList.add('active'); else a.classList.remove('active');
    });
  }

  activate();
  window.addEventListener('popstate', activate, { passive: true });
  onIdle(activate);
})();

/* ----------------------------- Carousel (mobile-first) ----------------------------- */
(function initCarousel() {
  const carousel = $('.carousel');
  if (!carousel) return;

  const slidesWrap = carousel.querySelector('.slides');
  if (!slidesWrap) return;

  const slides = Array.from(slidesWrap.querySelectorAll('img'));
  if (slides.length === 0) return;

  let index = 0;
  let timer = null;
  const intervalMs = 4000;
  const dotsContainer = carousel.querySelector('.dots') || (() => {
    const d = document.createElement('div'); d.className = 'dots'; carousel.appendChild(d); return d;
  })();

  // build dots
  dotsContainer.innerHTML = '';
  slides.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => { goTo(i); restartTimer(); }, { passive: true });
    dotsContainer.appendChild(dot);
  });
  const dots = Array.from(dotsContainer.children);

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    slidesWrap.style.transform = `translateX(${-index * 100}%)`;
    dots.forEach(d => d.classList.remove('active'));
    dots[index]?.classList.add('active');
  }
  function next() { goTo(index + 1); }
  function startTimer() { if (!timer) timer = setInterval(next, intervalMs); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function restartTimer() { stopTimer(); startTimer(); }

  // touch support
  let touching = false, startX = 0, deltaX = 0;
  slidesWrap.addEventListener('touchstart', (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touching = true; startX = e.touches[0].clientX; deltaX = 0; stopTimer();
  }, { passive: true });

  slidesWrap.addEventListener('touchmove', (e) => {
    if (!touching) return;
    const x = e.touches[0].clientX;
    deltaX = x - startX;
    slidesWrap.style.transition = 'none';
    slidesWrap.style.transform = `translateX(${ -index*100 + (deltaX / carousel.clientWidth) * 100 }%)`;
  }, { passive: true });

  slidesWrap.addEventListener('touchend', () => {
    if (!touching) return;
    touching = false;
    slidesWrap.style.transition = '';
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) next(); else goTo(index - 1);
    } else {
      goTo(index);
    }
    restartTimer();
  }, { passive: true });

  // pause on mouse hover (desktop)
  carousel.addEventListener('mouseenter', stopTimer, { passive: true });
  carousel.addEventListener('mouseleave', restartTimer, { passive: true });

  onIdle(startTimer);
})();

/* ----------------------------- Accessibility & small helpers ----------------------------- */
(function a11yHelpers() {
  // ensure touchstart listener is passive for performance
  document.addEventListener('touchstart', (() => {}), { passive: true });

  // auto-focus composer input if present and idle
  onIdle(() => {
    const input = document.getElementById('composer-input');
    if (input) input.focus({ preventScroll: true });
  });
})();

/* ----------------------------- Dynamic nav re-check on click ----------------------------- */
(function dynamicNavWatch() {
  const nav = $('.bottom-nav');
  if (!nav) return;
  nav.addEventListener('click', () => {
    setTimeout(() => window.dispatchEvent(new Event('popstate')), 10);
  }, { passive: true });
})();
