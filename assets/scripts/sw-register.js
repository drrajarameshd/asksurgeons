/* sw-register.js
   Lightweight service worker register + user update prompt for AskSurgeons
   Place this file at /sw-register.js and include on every page:
   <script src="/sw-register.js" defer></script>
*/

(function () {
  if (!('serviceWorker' in navigator)) {
    // Not supported — nothing to do
    return;
  }

  // small DOM helper to create a low-profile update banner
  function createUpdateBanner() {
    // Avoid duplicate banners
    if (document.getElementById('sw-update-banner')) return null;

    const banner = document.createElement('div');
    banner.id = 'sw-update-banner';
    banner.style.position = 'fixed';
    banner.style.left = '12px';
    banner.style.right = '12px';
    banner.style.bottom = '18px';
    banner.style.zIndex = 999999;
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.justifyContent = 'space-between';
    banner.style.gap = '12px';
    banner.style.padding = '10px 14px';
    banner.style.borderRadius = '10px';
    banner.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
    banner.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
    banner.style.fontSize = '14px';
    banner.style.background = '#ffffff';
    banner.style.color = '#111';
    banner.style.maxWidth = '720px';
    banner.style.margin = '0 auto';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';

    const text = document.createElement('div');
    text.textContent = 'A new version of the app is available.';

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';

    const btnUpdate = document.createElement('button');
    btnUpdate.type = 'button';
    btnUpdate.textContent = 'Update';
    btnUpdate.style.border = 'none';
    btnUpdate.style.background = '#007BBF';
    btnUpdate.style.color = '#fff';
    btnUpdate.style.padding = '8px 12px';
    btnUpdate.style.borderRadius = '8px';
    btnUpdate.style.cursor = 'pointer';
    btnUpdate.style.fontWeight = '600';

    const btnDismiss = document.createElement('button');
    btnDismiss.type = 'button';
    btnDismiss.textContent = 'Dismiss';
    btnDismiss.style.border = '1px solid #ddd';
    btnDismiss.style.background = '#fff';
    btnDismiss.style.color = '#333';
    btnDismiss.style.padding = '8px 10px';
    btnDismiss.style.borderRadius = '8px';
    btnDismiss.style.cursor = 'pointer';

    actions.appendChild(btnUpdate);
    actions.appendChild(btnDismiss);
    banner.appendChild(text);
    banner.appendChild(actions);

    document.body.appendChild(banner);

    // Dismiss removes the banner
    btnDismiss.addEventListener('click', () => {
      banner.remove();
    });

    return { banner, btnUpdate, btnDismiss };
  }

  // Register immediately (as early as script runs)
  let refreshing = false;

  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(reg => {
      console.log('[SW] Registered with scope:', reg.scope);

      // If there's an active waiting worker (from previous registration), prompt immediately
      if (reg.waiting) {
        console.log('[SW] update waiting (already installed)');
        const ui = createUpdateBanner();
        if (ui) {
          ui.btnUpdate.addEventListener('click', () => {
            // tell waiting worker to skipWaiting, then reload when it takes control
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          });
        }
      }

      // Listen for updates found while this page is open
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        console.log('[SW] updatefound - new worker state:', newWorker.state);
        newWorker.addEventListener('statechange', () => {
          console.log('[SW] new worker statechange:', newWorker.state);
          // When newWorker.state === 'installed' and there's a controller, it means an update is waiting
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // show update prompt
            const ui = createUpdateBanner();
            if (!ui) return;
            ui.btnUpdate.addEventListener('click', () => {
              // Post message to trigger skipWaiting in worker
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            });
          }
        });
      });
    })
    .catch(err => console.error('[SW] Registration failed:', err));

  // When the new SW activates and takes control, reload to use new assets
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    console.log('[SW] controller changed — reloading page to activate new SW');
    // small delay to allow the newly-activated SW to claim clients
    setTimeout(() => {
      try { window.location.reload(); } catch (e) { console.warn(e); }
    }, 300);
  });

  // Optional: listen for messages from the SW (helpful for debugging)
  navigator.serviceWorker.addEventListener('message', (evt) => {
    // example: worker could send {type: 'LOG', message: '...'}
    if (evt.data && evt.data.type === 'LOG') {
      console.log('[SW message]', evt.data.message);
    }
  });

})();
