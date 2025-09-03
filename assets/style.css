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
