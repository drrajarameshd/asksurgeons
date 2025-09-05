// assets/chat.js
// Updated chat logic (session-only storage, auto-reply with single WhatsApp button,
// doctor bio preserved, composer safe, toast, polite UX).
//
// Behavior summary:
// - Messages stored in sessionStorage per doctor (cleared when app/tab closed).
// - On first patient message, add a polite auto-reply system message WITH a single green WhatsApp button.
// - Doctor bio is shown as an initial system message (no WA button).
// - Composer adds local message only; WA opens only when user taps the green connect button.
// - Call icon always dials AskSurgeons helpline.

document.addEventListener("DOMContentLoaded", async () => {
  const ASKSURGEONS_NUMBER = "918062182411"; // without plus
  const WA_BASE = `https://wa.me/${ASKSURGEONS_NUMBER}?text=`;

  // parse doc index from URL ?doc=N
  const params = new URLSearchParams(location.search);
  const idx = parseInt(params.get("doc") || "0", 10);

  // load doctors data
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
    image: "assets/logo.png",
    bio: "No details available."
  };

  // sessionStorage key per doctor (session-lifetime)
  const STORAGE_KEY = `as_chat_doc_${idx}`;

  // tiny helpers
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

  // Build chat header (dynamic)
  root.innerHTML = `
    <header class="chat-header" role="banner">
      <button id="back-btn" aria-label="Back" class="icon-btn"><i class="fas fa-arrow-left"></i></button>
      <img class="avatar" src="${esc(doctor.image)}" alt="${esc(doctor.name)}" onerror="this.src='assets/logo.png'">
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

  // session storage helpers
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

  // message format:
  // { type: 'bio'|'system'|'me'|'auto_reply', content: string (HTML), time: 'HH:MM', meta: { patientMsg? } }

  // initialize messages
  let messages = loadFromSession();
  if (!messages) {
    const bioHtml = `<strong>${esc(doctor.name)}</strong><br/><em>${esc(doctor.speciality)}</em><br/><br/>${esc(doctor.bio).replace(/\n/g, "<br/>")}`;
    messages = [{ type: "bio", content: bioHtml, time: nowTime(), meta: {} }];
    saveToSession(messages);
  }

  // render helpers
  function createMsgNode(msg) {
    const wrapper = document.createElement("div");
    wrapper.className = `msg ${msg.type === "me" ? "me" : "system"}`;

    const inner = document.createElement("div");
    inner.className = "msg-content";
    inner.innerHTML = msg.content;
    wrapper.appendChild(inner);

    // Only auto_reply has the green WA connect button
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

    // add timestamp for 'me' messages (visual)
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
    // scroll to bottom
    area.scrollTop = area.scrollHeight;
  }

  // toast helper
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

  // WA message builder (refined)
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

  // Composer send
  function onSend() {
    const text = (input.value || "").trim();
    if (!text) return;

    // push patient message
    const myMsg = { type: "me", content: `<div>${esc(text)}</div>`, time: nowTime(), meta: {} };
    messages.push(myMsg);
    saveToSession(messages);
    renderAll();
    input.value = "";

    // if auto_reply not yet present, add polite auto-reply with WA button (persisted for session)
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
      // Do not auto-open WhatsApp; user chooses
    } else {
      // optional brief tip (system)
      const tip = { type: "system", content: `<em>Tip:</em> To continue securely, tap the green WhatsApp button above.`, time: nowTime(), meta: {} };
      messages.push(tip);
      saveToSession(messages);
      renderAll();
    }
  }

  // wire send button + Enter key
  sendBtn && sendBtn.addEventListener("click", onSend);
  input && input.addEventListener("keydown", e => { if (e.key === "Enter") onSend(); });

  // focus composer on load for convenience (mobile-friendly)
  onIdle(() => { input && input.focus && input.focus({ preventScroll: true }); });

  // small helper: clear session chat (developer use)
  // window.clearChatForDoc = () => { sessionStorage.removeItem(STORAGE_KEY); messages = [{ type:'bio', content:`<strong>${esc(doctor.name)}</strong><br/><em>${esc(doctor.speciality)}</em><br/><br/>${esc(doctor.bio).replace(/\n/g,'<br/>')}`, time: nowTime(), meta:{} }]; saveToSession(messages); renderAll(); };

  // helper for requestIdleCallback fallback
  function onIdle(cb) {
    if ("requestIdleCallback" in window) requestIdleCallback(cb, { timeout: 700 });
    else setTimeout(cb, 300);
  }
});
