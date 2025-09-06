// assets/doctors.js
// Robust doctors list + search. Uses data-index to keep original indices stable.
//
// Usage: include <script src="assets/doctors.js"></script> on doctors.html
// Assumes there is: <input id="doctors-search"> and <ul class="wa-list" id="doctors-list"></ul>

document.addEventListener('DOMContentLoaded', () => {
  const LIST_EL = document.getElementById('doctors-list');     // <ul id="doctors-list" class="wa-list">
  const SEARCH_INPUT = document.getElementById('search-input'); // <input id="search-input">
  const NO_RESULTS_HTML = '<li class="wa-item" style="justify-content:center;background:transparent;box-shadow:none;color:#666;">No results found</li>';
  const searchToggle = document.getElementById("search-toggle");
  const searchBar = document.getElementById("search-bar");
  const searchInput = document.getElementById("search-input");


  if (!LIST_EL) {
    console.warn('doctors.js: #doctors-list not found in DOM.');
    return;
  }

  // Load doctors data
  async function loadDoctors() {
    try {
      const res = await fetch('doctors/data.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      console.error('Failed to load doctors/data.json', err);
      return [];
    }
  }

  // Render a single doctor li (returns DOM node)
  function renderDoctorItem(doctor, originalIndex) {
    const li = document.createElement('li');
    li.className = 'wa-item';
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    li.dataset.index = originalIndex; // IMPORTANT: stable original index used for navigation

    li.innerHTML = `
      <img class="wa-avatar" src="${escapeHtml(doctor.image || 'assets/logos/logo3.webp')}" alt="${escapeHtml(doctor.name)}" onerror="this.src='assets/logos/logo3.webp'">
      <div class="wa-body">
        <div class="wa-top">
          <div class="wa-name">${escapeHtml(doctor.name)}</div>
          <div class="wa-time">${escapeHtml(doctor.speciality || '')}</div>
        </div>
        <div class="wa-sub">${escapeHtml((doctor.bio || '').slice(0, 120))}${(doctor.bio && doctor.bio.length > 120) ? '…' : ''}</div>
      </div>
    `;
    return li;
  }

  // Escape helper
  function escapeHtml(s = '') {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Debounce
  function debounce(fn, wait = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  }

  // Setup: load, render list, wire search + click delegation
  (async function init() {
    const doctors = await loadDoctors(); // array of doctor objects
    // Keep original array for index mapping
    window._AS_DOCTORS = doctors; // optional debug hook

    // Render full list
    function renderList(filteredIndices = null) {
      // If filteredIndices is null => show all
      LIST_EL.innerHTML = '';
      const indices = Array.isArray(filteredIndices) ? filteredIndices : doctors.map((_, i) => i);
      if (indices.length === 0) {
        LIST_EL.innerHTML = NO_RESULTS_HTML;
        return;
      }
      // Append nodes
      const frag = document.createDocumentFragment();
      for (const i of indices) {
        const doc = doctors[i];
        frag.appendChild(renderDoctorItem(doc, i));
      }
      LIST_EL.appendChild(frag);
    }

    // Initial full render
    renderList();

    // Click / keyboard activation: event delegation
    LIST_EL.addEventListener('click', (e) => {
      const item = e.target.closest('.wa-item');
      if (!item) return;
      const idx = item.dataset.index;
      if (typeof idx === 'undefined') return;
      // navigate to chat with the original index
      window.location.href = `chat.html?doc=${encodeURIComponent(idx)}`;
    });

    // Also support keyboard "Enter" / Space activation for accessibility via delegation
    LIST_EL.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const item = e.target.closest('.wa-item');
        if (!item) return;
        e.preventDefault();
        const idx = item.dataset.index;
        window.location.href = `chat.html?doc=${encodeURIComponent(idx)}`;
      }
    });

    // Search handler (debounced)
    if (SEARCH_INPUT) {
      const doSearch = () => {
        const q = (SEARCH_INPUT.value || '').trim().toLowerCase();
        if (!q) {
          renderList(); // show all
          return;
        }
        // find matching original indices
        const matched = [];
        for (let i = 0; i < doctors.length; i++) {
          const d = doctors[i];
          const hay = `${d.name || ''} ${d.speciality || ''} ${d.bio || ''}`.toLowerCase();
          if (hay.indexOf(q) !== -1) matched.push(i);
        }
        renderList(matched);
      };

      const deb = debounce(doSearch, 180);
      SEARCH_INPUT.addEventListener('input', deb, { passive: true });
      // optional: clear on Escape key
      SEARCH_INPUT.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          SEARCH_INPUT.value = '';
          renderList();
        }
      });
    }

  })(); // init
});

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


