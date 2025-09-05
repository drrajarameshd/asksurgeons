/* assets/script.js — consolidated, optimized, production-ready
   - Carousel (auto + touch)
   - Bottom-nav active highlight
   - Service worker registration
   - Keyboard-safe bottom-nav hide + composer sync
   - Non-blocking, debounced handlers
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

/* ----------------------------- SW registration ----------------------------- */
(function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // register on load so page paint isn't blocked
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => {
          // prompt new SW to take over quickly (safe)
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          // monitor events
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

/* ----------------------------- Active bottom-tab highlight ----------------------------- */
(function highlightBottomNav() {
  // Graceful: do nothing if no bottom-nav
  const nav = $('.bottom-nav');
  if (!nav) return;

  function normalizePath(p) {
    if (!p) return 'index.html';
    p = p.split('?')[0].split('#')[0];
    p = p.replace(/^\.\//, ''); // remove leading ./
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

  // run now + on navigation events (popstate)
  activate();
  window.addEventListener('popstate', activate, { passive: true });
  // also run after idle in case SPA changes were made
  onIdle(activate);
})();

/* ----------------------------- Carousel (mobile-first) ----------------------------- */
(function initCarousel() {
  const carousel = $('.carousel');
  if (!carousel) return;

  const slidesWrap = carousel.querySelector('.slides');
  const slides = Array.from(slidesWrap.querySelectorAll('img'));
  const dotsContainer = carousel.querySelector('.dots') || (() => {
    const d = document.createElement('div'); d.className = 'dots'; carousel.appendChild(d); return d;
  })();

  let index = 0;
  let autoplay = true;
  const intervalMs = 4000;
  let timer;

  // Create dots
  dotsContainer.innerHTML = '';
  slides.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    dotsContainer.appendChild(dot);
    dot.addEventListener('click', () => { goTo(i); restartTimer(); }, { passive: true });
  });
  const dots = Array.from(dotsContainer.children);

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    slidesWrap.style.transform = `translateX(${-index * 100}%)`;
    dots.forEach(d => d.classList.remove('active'));
    dots[index]?.classList.add('active');
  }

  function next() { goTo((index + 1) % slides.length); }

  function startTimer() { if (!timer && autoplay) timer = setInterval(next, intervalMs); }
  function stopTimer() { clearInterval(timer); timer = null; }
  function restartTimer() { stopTimer(); startTimer(); }

  // Touch handling (lightweight)
  let startX = 0, deltaX = 0, touching = false;
  slidesWrap.addEventListener('touchstart', (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touching = true; startX = e.touches[0].clientX; deltaX = 0; stopTimer();
  }, { passive: true });

  slidesWrap.addEventListener('touchmove', (e) => {
    if (!touching) return;
    const x = e.touches[0].clientX;
    deltaX = x - startX;
    // slight transform for drag feel
    slidesWrap.style.transition = 'none';
    slidesWrap.style.transform = `translateX(${ -index*100 + (deltaX / carousel.clientWidth) * 100 }%)`;
  }, { passive: true });

  slidesWrap.addEventListener('touchend', () => {
    if (!touching) return;
    touching = false;
    slidesWrap.style.transition = ''; // restore CSS transition
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) next(); else goTo(index - 1);
    } else {
      goTo(index);
    }
    restartTimer();
  }, { passive: true });

  // Pause on hover/focus to improve UX on desktop/emulators (non-blocking)
  carousel.addEventListener('mouseenter', stopTimer, { passive: true });
  carousel.addEventListener('mouseleave', restartTimer, { passive: true });

  // Start autoplay after idle
  onIdle(startTimer);
})();

/* ----------------------------- Auto-hide bottom nav + composer sync ----------------------------- */
(function keyboardNavComposer() {
  const bottomNav = $('.bottom-nav');
  const composer = $('.composer');
  if (!bottomNav || !composer) return;

  // initial baseline for resize detection
  let initialInnerHeight = window.innerHeight;

  // helper to sync composer with nav
  function syncComposerWithNav() {
    const navHidden = bottomNav.classList.contains('hide');
    if (navHidden) composer.classList.add('nav-hidden'); else composer.classList.remove('nav-hidden');
  }

  // MutationObserver to catch class changes on bottomNav quickly
  if (window.MutationObserver) {
    const mo = new MutationObserver(syncComposerWithNav);
    mo.observe(bottomNav, { attributes: true, attributeFilter: ['class'] });
  }

  // Focusin/out handlers to hide/show nav
  document.addEventListener('focusin', (e) => {
    if (isInputEl(e.target)) {
      bottomNav.classList.add('hide');
      composer.classList.add('nav-hidden', 'input-focused');
    }
  }, { passive: true });

  document.addEventListener('focusout', (e) => {
    if (isInputEl(e.target)) {
      composer.classList.remove('input-focused');
      // small defer to allow resize event if any
      setTimeout(() => {
        // if viewport regained baseline height, assume keyboard closed
        if (window.innerHeight >= initialInnerHeight - 50) {
          bottomNav.classList.remove('hide');
          composer.classList.remove('nav-hidden');
        } else {
          // still smaller (keyboard maybe open); keep nav hidden
          bottomNav.classList.add('hide');
          composer.classList.add('nav-hidden');
        }
      }, 120);
    }
  }, { passive: true });

  // Debounced resize fallback — detect keyboard open/close across browsers
  window.addEventListener('resize', debounce(() => {
    const current = window.innerHeight;
    if (current < initialInnerHeight - 100) {
      // keyboard likely opened
      bottomNav.classList.add('hide');
      composer.classList.add('nav-hidden', 'input-focused');
    } else {
      // keyboard likely closed
      bottomNav.classList.remove('hide');
      composer.classList.remove('nav-hidden', 'input-focused');
      initialInnerHeight = current; // update baseline
    }
  }, 150), { passive: true });

  // initial sync
  syncComposerWithNav();
})();

/* ----------------------------- Accessibility & small helpers ----------------------------- */
(function a11yHelpers() {
  // ensure taps feel responsive
  document.addEventListener('touchstart', (() => {}), { passive: true });

  // auto-focus composer input if present and on chat page
  onIdle(() => {
    const input = document.getElementById('composer-input');
    if (input) input.focus({ preventScroll: true });
  });
})();

/* ----------------------------- Non-critical: highlight nav on dynamic changes ----------------------------- */
(function dynamicNavWatch() {
  const nav = $('.bottom-nav');
  if (!nav) return;
  // re-run highlight on click nav links (in case SPA or relative changes)
  nav.addEventListener('click', (e) => {
    // microtask to allow href navigation to update location
    setTimeout(() => {
      const event = new Event('popstate');
      window.dispatchEvent(event);
    }, 10);
  }, { passive: true });
})();

/* ----------------------------- End of script.js ----------------------------- */
