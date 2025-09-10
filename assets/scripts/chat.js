// assets/scripts/chat.js
// Final chat logic (sessionStorage, single auto-reply with WA connect button).
// Composer/input removed; WA bottom button now opens WhatsApp with a prefilled message
// that includes doctor name & speciality.

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
    bio: "No details available."
  };

  const STORAGE_KEY = `as_chat_doc_${idx}`;

  const esc = s => String(s).replace(/[&<>"']/g, c =>
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
      <img class="avatar" src="${esc(doctor.image)}" alt="${esc(doctor.name)}" onerror="this.src='assets/logos/logo.png'">
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
      if (!Array.isArray(parsed)) return null;
      return parsed;
    } catch (e) {
      console.warn("Failed to parse session messages", e);
      return null;
    }
  }
  function saveToSession(messages) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn("Failed to save session messages", e);
    }
  }

  let messages = loadFromSession();
  if (!messages) {
    const bioHtml = `<strong>${esc(doctor.name)}</strong><br/><em>${esc(doctor.speciality)}</em><br/><br/>${esc(doctor.bio).replace(/\n/g, "<br/>")}`;
    messages = [{ type: "bio", content: bioHtml, time: nowTime(), meta: {} }];
    saveToSession(messages);
  }

  function createMsgNode(msg) {
    const wrapper = document.createElement("div");
    wrapper.className = `msg ${msg.type === "me" ? "me" : "system"}`;

    const inner = document.createElement("div");
    inner.className = "msg-content";
    inner.innerHTML = msg.content;
    wrapper.appendChild(inner);

    // keep auto_reply handling (in case you later push such messages),
    // but the UI no longer creates 'me' messages from a composer.
    if (msg.type === "auto_reply") {
      const waBtn = document.createElement("button");
      waBtn.className = "wa-connect-btn";
      waBtn.type = "button";
      waBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Connect via WhatsApp';
      waBtn.addEventListener("click", () => {
        const patientText = msg.meta && msg.meta.patientMsg ? msg.meta.patientMsg : "";
        const waMessage = buildWhatsAppMessage(patientText);
        showToast("Opening WhatsApp…");
        window.open(WA_BASE + encodeURIComponent(waMessage), "_blank");
      });
      wrapper.appendChild(waBtn);
    }

    if (msg.type === "me") {
      const t = document.createElement("span");
      t.className = "time";
      t.textContent = msg.time || nowTime();
      inner.appendChild(t);
    }

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
      t = document.createElement("div");
      t.id = "as-toast";
      t.className = "as-toast";
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function buildWhatsAppMessage(patientText = "") {
    // Build a prefilled message that includes doctor name & speciality.
    const lines = [];
    const plainDocName = doctor.name.replace(/^Dr\.\s*/i, "").trim();
    lines.push(`Hello,`);
    lines.push("");
    lines.push(`I'd like to consult with Dr. ${plainDocName} (${doctor.speciality}).`);
    if (patientText && patientText.length) {
      const truncated = patientText.length > 800 ? patientText.slice(0, 800) + "..." : patientText;
      lines.push("");
      lines.push(`My query: ${truncated}`);
    } else {
      lines.push("");
      lines.push(`Please advise how to proceed.`);
    }
    lines.push("");
    lines.push("— Sent via AskSurgeons");
    return lines.join("\n");
  }

  renderAll();

  // ---- Removed composer / input / send button logic ----
  // The UI no longer has a composer. Instead the bottom WhatsApp button will
  // open WhatsApp with a prefilled message including the doctor's name & speciality.

  const waBtn = document.getElementById("wa-btn");
  if (waBtn) {
    waBtn.addEventListener("click", (ev) => {
      // prevent the default href navigation so we can include the prefilled text
      ev.preventDefault();
      const waMessage = buildWhatsAppMessage("");
      showToast("Opening WhatsApp…");
      // open in a new tab/window — use the wa.me link with encoded text
      window.open(WA_BASE + encodeURIComponent(waMessage), "_blank");
    });
  }

  // focus nothing in particular since there's no composer
});
