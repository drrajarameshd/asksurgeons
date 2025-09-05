// assets/doctors.js
document.addEventListener("DOMContentLoaded", async () => {
  const listEl = document.getElementById("doctors-list");
  const searchToggle = document.getElementById("search-toggle");
  const searchBar = document.getElementById("search-bar");
  const searchInput = document.getElementById("search-input");

  // load data
  async function loadDoctors() {
    try {
      const res = await fetch('doctors/data.json', {cache: "no-store"});
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Failed to load doctors", err);
      return [];
    }
  }

  const doctors = await loadDoctors();
  let filtered = doctors.slice();

  function renderList(items) {
    listEl.innerHTML = '';
    items.forEach((doc, idx) => {
      const li = document.createElement('li');
      li.className = 'wa-item';
      li.innerHTML = `
        <img class="wa-avatar" loading="lazy" src="${doc.image}" alt="${doc.name}" onerror="this.src='assets/logos/logo3.webp'">
        <div class="wa-body">
          <div class="wa-top">
            <div class="wa-name">${doc.name}</div>
            <div class="wa-time">▶</div>
          </div>
          <div class="wa-sub">${doc.speciality} • ${doc.department || ''}</div>
        </div>
      `;
      li.addEventListener('click', () => {
        // open chat page with index
        window.location.href = `chat.html?doc=${idx}`;
      });
      listEl.appendChild(li);
    });
  }

  renderList(filtered);

  // search toggle
  searchToggle?.addEventListener('click', () => {
    if (searchBar.style.display === 'none') {
      searchBar.style.display = 'block';
      searchInput.focus();
    } else {
      searchBar.style.display = 'none';
      searchInput.value = '';
      filtered = doctors.slice();
      renderList(filtered);
    }
  });

  // search input
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    filtered = doctors.filter(d => (d.name + ' ' + d.speciality + ' ' + (d.department||'')).toLowerCase().includes(q));
    renderList(filtered);
  });
});

