// assets/chat.js
// Final chat logic (sessionStorage, single auto-reply with WA connect button).
// Behavior:
// - Session-only persistence (cleared when app/tab closed).
// - Doctor bio shown initially (no WA button).
// - On first patient message, a polite auto-reply with a single green WA button is added (persisted for session).
// - Composer adds local messages; WA opens only when user taps the green button.
// - Call icon always dials AskSurgeons helpline.

document.addEventListener("DOMContentLoaded", async () => {
  const ASKSURGEONS_NUMBER = "918062182411";
  const WA_BASE = `https://wa.me/${ASKSURGEONS_NUMBER}?text=`;

  const params = new URLSearchParams(location.search);
  const idx = parseInt(params.get("doc") || "0", 11);

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

  // DOM refs
  const root = document.getElementById("chat-root");
  const area = document.getElementById("chat-area");
  const input = document.getElementById("composer-input");
  const sendBtn = document.getElementById("send-btn");

  // Render header (injected)
  root.innerHTML = `
    <header class="chat-header" role="banner">
      <button id="back-btn" aria-label="Back" class="icon-btn"><i class="fas fa-arrow-left"></i></button>
      <img class="avatar" src="${esc(doctor.image)}" alt="${esc(doctor.name)}" onerror="this.src='assets/logos/logo.png'">
      <div class="meta">
        <div class="name">${esc(doctor.name)}</div>
        <div class="spec">${esc(doctor.speciality)}</div>
      </div>
      <div class="chat-actions">
        <a id="call-link" href="tel:+${ASKSURGEONS_NUMBER}" style="color:white"><i class="fas fa-phone"></i></a>
      </div>
    </header>
  `;
  const backBtn = document.getElementById("back-btn");
  backBtn && backBtn.addEventListener("click", () => history.back());

  // sessionStorage helpers
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

  // initial messages (bio)
  let messages = loadFromSession();
  if (!messages) {
    const bioHtml = `<strong>${esc(doctor.name)}</strong><br/><em>${esc(doctor.speciality)}</em><br/><br/>${esc(doctor.bio).replace(/\n/g, "<br/>")}`;
    messages = [{ type: "bio", content: bioHtml, time: nowTime(), meta: {} }];
    saveToSession(messages);
  }

  // create DOM node for a message
  function createMsgNode(msg) {
    const wrapper = document.createElement("div");
    wrapper.className = `msg ${msg.type === "me" ? "me" : (msg.type === "bio" ? "system bio" : msg.type === "auto_reply" ? "system auto" : "system")}`;

    const inner = document.createElement("div");
    inner.className = "msg-content";
    inner.innerHTML = msg.content;
    wrapper.appendChild(inner);

    if (msg.type === "auto_reply") {
      const waBtn = document.createElement("button");
      waBtn.className = "wa-connect-btn";
      waBtn.type = "button";
      waBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Connect via WhatsApp';
      waBtn.addEventListener("click", () => {
        const patientText = msg.meta && msg.meta.patientMsg ? msg.meta.patientMsg : "";
        const waMessage = buildWhatsAppMessage(patientText);
        showToast("Opening WhatsApp…");
        // open in new tab (will switch app on mobile)
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

  // render all messages into area
  function renderAll() {
    if (!area) return;
    area.innerHTML = "";
    messages.forEach(m => area.appendChild(createMsgNode(m)));
    // ensure scroll to bottom
    area.scrollTop = area.scrollHeight;
  }

  // small toast helper
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
    const lines = [];
    const plainDocName = doctor.name.replace(/^Dr\.\s*/i, "").trim();
    lines.push(`Hi Dr. ${plainDocName},`);
    lines.push("");
    if (patientText && patientText.length) {
      const truncated = patientText.length > 800 ? patientText.slice(0, 800) + "..." : patientText;
      lines.push(`My query: ${truncated}`);
    } else {
      lines.push(`I would like to discuss my case with you.`);
    }
    lines.push("");
    lines.push(`Doctor specialty: ${doctor.speciality}`);
    lines.push("");
    lines.push(`— Sent via AskSurgeons`);
    return lines.join("\n");
  }

  // initial render
  renderAll();

  // -------------------------
  // Defensive onSend + touch-friendly handlers
  // -------------------------
  function onSend(e) {
    try {
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();

      if (!input) {
        console.warn("composer input missing");
        return;
      }

      const text = (input.value || "").trim();
      if (!text) return;

      // Prevent double-tap/spam: disable button briefly
      if (sendBtn) {
        sendBtn.disabled = true;
        setTimeout(() => { try { sendBtn.disabled = false; } catch(_){} }, 300);
      }

      // append message
      const myMsg = { type: "me", content: `<div>${esc(text)}</div>`, time: nowTime(), meta: {} };
      messages.push(myMsg);
      saveToSession(messages);
      renderAll();

      // clear and refocus input (prevent scroll if possible)
      input.value = "";
      try { input.focus({ preventScroll: true }); }
      catch (err) { try { input.focus(); } catch(_){} }

      // auto-reply logic
      const hasAuto = messages.some(m => m.type === "auto_reply");
      if (!hasAuto) {
        const polite = `<strong>AskSurgeons</strong><br/>Thanks — we’ve received your message. To continue securely and get a prompt response, please connect with AskSurgeons on WhatsApp. Tap the green WhatsApp button below to open WhatsApp and send your message to our team.`;
        const autoMsg = {
          type: "auto_reply",
          content: polite,
          time: nowTime(),
          meta: { patientMsg: text }
        };
        messages.push(autoMsg);
        saveToSession(messages);
        renderAll();
      } else {
        const tip = { type: "system", content: `<em>Tip:</em> To continue securely, tap the green WhatsApp button above.`, time: nowTime(), meta: {} };
        messages.push(tip);
        saveToSession(messages);
        renderAll();
      }
    } catch (err) {
      console.error("onSend error:", err);
    }
  }

  // ensure sendBtn isn't a form submitter
  if (sendBtn) sendBtn.type = "button";

  function attachSendHandlers() {
    if (!sendBtn) return;
    // remove old listeners to avoid duplicates
    sendBtn.removeEventListener("pointerdown", onSend);
    sendBtn.removeEventListener("touchend", onSend);
    sendBtn.removeEventListener("click", onSend);

    // pointerdown fires earliest and is reliable for touch + mouse
    try {
      sendBtn.addEventListener("pointerdown", onSend, { passive: false });
    } catch (e) {
      // older browsers may throw for options
      sendBtn.addEventListener("pointerdown", onSend);
    }
    // fallback for older devices
    try {
      sendBtn.addEventListener("touchend", onSend, { passive: false });
    } catch (e) {
      sendBtn.addEventListener("touchend", onSend);
    }
    // keep click as last resort
    sendBtn.addEventListener("click", onSend);
  }

  function onInputKeyDown(e) {
    if (!e) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend(e);
    }
  }

  // bind handlers
  attachSendHandlers();
  if (input) {
    input.removeEventListener("keydown", onInputKeyDown);
    input.addEventListener("keydown", onInputKeyDown);
  }

  // -------------------------
  // visualViewport handling so composer stays visible when keyboard opens
  // -------------------------
  function onViewportResize() {
    const composer = document.querySelector('.composer');
    if (!composer || !area) return;

    if (window.visualViewport) {
      const vh = window.visualViewport.height;
      const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 60;
      const composerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--composer-height')) || 60;
      // set chat area height to visible viewport minus header and composer
      area.style.height = `${vh - headerH - composerH}px`;
      // translate composer up by keyboard height (if any)
      const offset = Math.max(0, window.innerHeight - vh);
      composer.style.transform = `translateY(-${offset}px)`;
    } else {
      // fallback - remove inline styles so CSS takes over
      area.style.height = '';
      composer.style.transform = '';
    }
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewportResize);
    window.visualViewport.addEventListener('scroll', onViewportResize);
  }
  window.addEventListener('resize', onViewportResize);
  // run once now
  onViewportResize();

  // focus input on idle (keep existing behavior)
  if ("requestIdleCallback" in window) {
    try {
      requestIdleCallback(() => { input && input.focus && input.focus({ preventScroll: true }); }, { timeout: 700 });
    } catch (e) {
      setTimeout(() => { input && input.focus && input.focus({ preventScroll: true }); }, 300);
    }
  } else {
    setTimeout(() => { input && input.focus && input.focus({ preventScroll: true }); }, 300);
  }

  // debug helpers (uncomment during dev)
  // window.addEventListener('error', ev => console.error('Runtime error', ev.error || ev.message, ev));
  // window.addEventListener('unhandledrejection', ev => console.error('Unhandled rejection', ev.reason));
  // document.addEventListener('pointerdown', e => console.log('pointerdown ->', e.target));
});
