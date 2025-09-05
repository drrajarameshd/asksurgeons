// Carousel with auto-slide + dots
document.addEventListener("DOMContentLoaded", () => {
  const slides = document.querySelector(".carousel .slides");
  const images = document.querySelectorAll(".carousel img");
  const dotsContainer = document.querySelector(".carousel .dots");

  if (slides && images.length > 0) {
    let index = 0;

    // Create dots
    images.forEach((_, i) => {
      const dot = document.createElement("span");
      if (i === 0) dot.classList.add("active");
      dotsContainer.appendChild(dot);
    });
    const dots = dotsContainer.querySelectorAll("span");

    function showSlide(i) {
      slides.style.transform = `translateX(${-i * 100}%)`;
      dots.forEach(dot => dot.classList.remove("active"));
      dots[i].classList.add("active");
    }

    function nextSlide() {
      index = (index + 1) % images.length;
      showSlide(index);
    }

    setInterval(nextSlide, 4000); // change every 4s
  }
});

// Keep your existing carousel code; add this below it
document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".bottom-nav a").forEach(a => {
    const href = a.getAttribute("href");
    if ((path === "" && href === "index.html") || href === path) {
      a.classList.add("active");
    } else {
      a.classList.remove("active");
    }
  });
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        console.log('Service Worker registered:', reg);

        // If a new SW is waiting, you can activate it immediately
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker installed. Refresh for update.');
              // Optional: prompt user with a toast/notification to reload
            }
          });
        });
      })
      .catch(err => console.warn('Service Worker registration failed:', err));
  });
}


