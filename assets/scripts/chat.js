// assets/scripts/chat.js
// Simplified chat.js — department-only pills (single pills.json), uses existing .pill CSS.

document.addEventListener("DOMContentLoaded", async () => {
  const ASKSURGEONS_NUMBER = "918062182411";
  const WA_BASE = `https://wa.me/${ASKSURGEONS_NUMBER}?text=`;

  const params = new URLSearchParams(location.search);
  const idx = parseInt(params.get("doc") || "0", 10);

  async function loadJSON(path) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      return await res.json();
    } catch (e) {
      console.warn("Failed to load", path, e);
      return null;
    }
  }

  const doctors = (await loadJSON("doctors/data.json")) || [];
  const pillsData = (await loadJSON("doctors/pills.json")) || {};

  const doctor = doctors[idx] || doctors[0] || {
    name: "Doctor",
    speciality: "",
    image: "assets/logo2.png",
    bio: "No details available."
  };

  const STORAGE_KEY = `as_chat_doc_${idx}`;

  const esc = s => String(s || "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
  const nowTime = () => {
    const d = new Date();
    return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
  };

  const root = document.getElementById("chat-root");
  const area = document.getElementById("chat-area");

  root.innerHTML = `
    <header class="chat-header" role="banner">
      <button id="back-btn" aria-label="Back" class="icon-btn"><i class="fas fa-arrow-left"></i></button>
      <img class="avatar" src="${esc(doctor.image)}" alt="${esc(doctor.name)}" onerror="this.src='assets/logos/logo3.webp'">
      <div class="meta">
        <div class="name">${esc(doctor.name)}</div>
        <div class="spec">${esc(doctor.speciality)}</div>
      </div>
      <div class="chat-actions">
        <a id="call-link" href="tel:+918062182411" style="color:white"><i class="fas fa-phone"></i></a>
      </div>
    </header>
  `;
  document.getElementById("back-btn").addEventListener("click", () => history.back());

  function loadFromSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) { return null; }
  }
  function saveToSession(messages) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch (e) { }
  }

  let messages = loadFromSession();
  if (!messages) {
    const bioHtml = `<strong>${esc(doctor.name)}</strong><br/><em>${esc(doctor.speciality)}</em><br/><br/>${esc(doctor.bio).replace(/\n/g, "<br/>")}`;
    messages = [{ type: "system", content: bioHtml, time: nowTime() }];
    saveToSession(messages);
  }

  // Create pill menu using existing .pill styles
  function createPillMenu() {
    const menu = document.createElement("div");
    menu.className = "pill-menu";
    menu.innerHTML = `
      <button type="button" class="pill" data-pill="Specialisation" aria-label="Areas of expertise">
        <i class="fa-solid fa-stethoscope" aria-hidden="true"></i><span>Areas</span>
      </button>
      <button type="button" class="pill" data-pill="symptoms" aria-label="Common symptoms">
        <i class="fa-solid fa-heartbeat" aria-hidden="true"></i><span>Symptoms</span>
      </button>
      <button type="button" class="pill" data-pill="surgeries" aria-label="Common surgeries">
        <i class="fa fa-hospital-o" aria-hidden="true"></i><span>Surgeries</span>
      </button>
    `;
    menu.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-pill]");
      if (!btn) return;
      const pill = btn.getAttribute("data-pill");
      addPillBubble(pill);
    });
    return menu;
  }

  // Build content from pills.json using department key (exact match). fallback to "default".
  function buildPillHtml(pillKey) {
    const deptKey = (doctor.speciality && pillsData[doctor.speciality]) ? doctor.speciality : "default";
    const dept = pillsData[deptKey] || pillsData["default"] || {};
    const arr = pillKey === "areas" ? dept.areas : (pillKey === "symptoms" ? dept.symptoms : dept.surgeries);
    if (!Array.isArray(arr) || arr.length === 0) return `<em>No information available.</em>`;
    const title = pillKey === "areas" ? "Areas of expertise" : (pillKey === "symptoms" ? "Common symptoms" : "Common surgeries");
    return `<div class="pill-data"><strong>${esc(title)}</strong><ul>${arr.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div>`;
  }

  function addPillBubble(pillKey) {
    const content = buildPillHtml(pillKey);
    messages.push({ type: "system", content, time: nowTime() });
    saveToSession(messages);
    renderAll();
    showToast("Added to chat");
  }

  function createMsgNode(msg) {
    const wrapper = document.createElement("div");
    wrapper.className = `msg ${msg.type === "me" ? "me" : "system"}`;
    const inner = document.createElement("div");
    inner.className = "msg-content";
    inner.innerHTML = msg.content;
    wrapper.appendChild(inner);
    // append pill menu under every bubble
    wrapper.appendChild(createPillMenu());
    return wrapper;
  }

  function renderAll() {
    area.innerHTML = "";
    messages.forEach(m => area.appendChild(createMsgNode(m)));
    area.scrollTop = area.scrollHeight;
  }

  function showToast(text = "Opening WhatsApp…") {
    let t = document.getElementById("as-toast");
    if (!t) {
      t = document.createElement("div"); t.id = "as-toast"; t.className = "as-toast"; document.body.appendChild(t);
    }
    t.textContent = text; t.classList.add("show");
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(() => t.classList.remove("show"), 2000);
  }

  function buildWhatsAppMessage() {
    const plainDocName = doctor.name.replace(/^Dr\.\s*/i, "").trim();
    return `Hello,\n\nI'd like to consult with Dr. ${plainDocName} (${doctor.speciality}).\n\nPlease advise how to proceed.\n\n— Sent via AskSurgeons`;
  }

  // WA button at bottom (if present on page)
  const waBtn = document.getElementById("wa-btn");
  if (waBtn) waBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    showToast("Opening WhatsApp…");
    window.open(WA_BASE + encodeURIComponent(buildWhatsAppMessage()), "_blank");
  });

  renderAll();
});
