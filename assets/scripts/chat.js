// assets/scripts/chat.js — corrected, drop-in replacement
document.addEventListener("DOMContentLoaded", async () => {
  const ASKSURGEONS_NUMBER = "918062182411";
  const WA_BASE = `https://wa.me/${ASKSURGEONS_NUMBER}?text=`;

  const params = new URLSearchParams(location.search);
  const idx = parseInt(params.get("doc") || "0", 10);

  async function loadDoctors() {
    try {
      const res = await fetch("doctors/data.json", { cache: "no-store" });
      return await res.json();
    } catch (err) {
      console.error("Could not load doctors/data.json", err);
      return [];
    }
  }

  const doctors = await loadDoctors();
  const doctor = doctors[idx] || doctors[0] || {
    name: "Doctor",
    speciality: "",
    image: "assets/logo2.png",
    bio: "No details available.",
    areas_of_speciality: []
  };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[c]));

  // Ensure root and area exist
  let root = document.getElementById("chat-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "chat-root";
    document.body.prepend(root);
  }
  let area = document.getElementById("chat-area");
  if (!area) {
    area = document.createElement("div");
    area.id = "chat-area";
    document.body.appendChild(area);
  }

  root.innerHTML = `
    <header class="chat-header" role="banner">
      <button id="back-btn" aria-label="Back" class="icon-btn"><i class="fas fa-arrow-left"></i></button>
      <img class="avatar" src="${esc(doctor.image)}" alt="${esc(doctor.name)}" onerror="this.src='assets/logos/logo.png'">
      <div class="meta">
        <div class="name">${esc(doctor.name)}</div>
        <div class="spec">${esc(doctor.speciality)}</div>
      </div>
      <div class="chat-actions">
        <a id="header-call" href="tel:+${ASKSURGEONS_NUMBER}" style="color:white"><i class="fas fa-phone"></i></a>
      </div>
    </header>
  `;

  // header back — navigate back or to directory
  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      // prefer explicit directory route if available
      if (location.pathname.includes('chat.html')) location.href = '/doctors';
      else history.back();
    });
  }

  // Render initial doctor bio + collapsible Areas of speciality
  function renderDoctorIntro() {
    const bioHtml = `<strong>${esc(doctor.name)}</strong><br/><em>${esc(doctor.speciality)}</em><br/><br/>${esc(doctor.bio).replace(/\n/g, "<br/>")}`;

    const detailsNode = document.createElement('div');
    detailsNode.className = 'spec-card';

    // details with native <details>
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.innerHTML = 'Areas of speciality <span class="chev">›</span>';
    details.appendChild(summary);

    const ul = document.createElement('ul');
    ul.className = 'spec-list';
    (doctor.areas_of_speciality || []).forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    details.appendChild(ul);

    // insert bio and then details
    detailsNode.innerHTML = bioHtml;
    detailsNode.appendChild(details);

    // clear area then append
    area.innerHTML = '';
    area.appendChild(detailsNode);
  }

  renderDoctorIntro();

  // bottom bar hooks
  const dirBtn = document.getElementById('dir-btn');
  const waBtn = document.getElementById('wa-btn');
  const callBtn = document.getElementById('call-btn');

  if (dirBtn) {
    dirBtn.addEventListener('click', () => {
      // emulate header back
      if (backBtn) backBtn.click();
      else history.back();
    });
  }

  function buildWhatsAppMessage() {
    const plainDocName = (doctor.name || '').replace(/^Dr\.?\s*/i, "").trim();
    return [
      `Hi Dr. ${plainDocName},`,
      '',
      'I would like to discuss my case with you.',
      '',
      `Doctor specialty: ${doctor.speciality}`,
      '',
      '— Sent via AskSurgeons'
    ].join('\n');
  }

  if (waBtn) {
    waBtn.addEventListener('click', () => {
      const msg = buildWhatsAppMessage();
      window.open(WA_BASE + encodeURIComponent(msg), '_blank');
    });
  }

  // callBtn may be <a href="tel:..."> or button
  if (callBtn) {
    if (callBtn.tagName.toLowerCase() !== 'a') {
      callBtn.addEventListener('click', () => {
        location.href = `tel:+${ASKSURGEONS_NUMBER}`;
      });
    }
  }

  // accessibility: focus main area
  area.setAttribute('tabindex', '-1');
  area.focus();
});
