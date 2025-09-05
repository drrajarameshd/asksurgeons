// assets/chat.js (sessionStorage version - chat lasts only for current app/tab session)
document.addEventListener("DOMContentLoaded", async () => {
  const ASKSURGEONS_NUMBER = "918062182411"; // no plus
  const WA_BASE = `https://wa.me/${ASKSURGEONS_NUMBER}?text=`;

  const params = new URLSearchParams(location.search);
  const idx = parseInt(params.get('doc') || "0", 10);

  async function loadDoctors(){
    try {
      const res = await fetch('doctors/data.json', { cache: "no-store" });
      return await res.json();
    } catch (e) {
      console.error('Could not load doctors data', e);
      return [];
    }
  }

  const doctors = await loadDoctors();
  const doctor = doctors[idx] || doctors[0] || {
    name: 'Doctor', speciality:'', image:'assets/logo.png', bio:'No details'
  };

  // sessionStorage key per doctor
  const STORAGE_KEY = `as_chat_doc_${idx}`;

  // Helpers
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function timeNow(){ const d=new Date(); return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0'); }

  // sessionStorage functions
  function loadMessagesFromSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse stored messages from sessionStorage', e);
      return null;
    }
  }

  function saveMessagesToSession(messages) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); }
    catch (e) { console.warn('Failed to save messages to sessionStorage', e); }
  }

  // DOM
  const root = document.getElementById('chat-root');
  const area = document.getElementById('chat-area');
  const input = document.getElementById('composer-input');
  const sendBtn = document.getElementById('send-btn');

  // Build header
  root.innerHTML = `
    <header class="chat-header" role="banner">
      <button id="back-btn" aria-label="Back" class="icon-btn"><i class="fas fa-arrow-left"></i></button>
      <img class="avatar" src="${doctor.image}" alt="${doctor.name}" onerror="this.src='assets/logo.png'">
      <div class="meta">
        <div class="name">${doctor.name}</div>
        <div class="spec">${doctor.speciality}</div>
      </div>
      <div class="chat-actions">
        <a id="call-link" href="tel:+918062182411" style="color:white"><i class="fas fa-phone"></i></a>
      </div>
    </header>
  `;
  document.getElementById('back-btn').addEventListener('click', ()=> history.back());

  // UI builders
  function createMsgNode(msg) {
    const wrapper = document.createElement('div');
    wrapper.className = `msg ${msg.type === 'me' ? 'me' : 'system'}`;
    const inner = document.createElement('div');
    inner.className = 'msg-content';
    inner.innerHTML = msg.content;
    wrapper.appendChild(inner);

    if (msg.type === 'auto_reply') {
      const waBtn = document.createElement('button');
      waBtn.className = 'wa-connect-btn';
      waBtn.type = 'button';
      waBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Connect via WhatsApp';
      waBtn.addEventListener('click', () => {
        const patientText = msg.meta && msg.meta.patientMsg ? msg.meta.patientMsg : '';
        const waMessage = buildWhatsAppMessage(patientText);
        showToast('Opening WhatsApp…');
        window.open(WA_BASE + encodeURIComponent(waMessage), '_blank');
      });
      wrapper.appendChild(waBtn);
    }

    if (msg.type === 'me') {
      const t = document.createElement('span');
      t.className = 'time';
      t.textContent = msg.time || timeNow();
      inner.appendChild(t);
    }

    return wrapper;
  }

  function renderMessages(messages) {
    area.innerHTML = '';
    messages.forEach(m => {
      const node = createMsgNode(m);
      area.appendChild(node);
    });
    area.scrollTop = area.scrollHeight;
  }

  // Toast
  function showToast(text='Opening WhatsApp…') {
    let t = document.getElementById('as-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'as-toast';
      t.className = 'as-toast';
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(()=> t.classList.remove('show'), 2200);
  }

  function buildWhatsAppMessage(patientText = '') {
    const lines = [];
    const plainDoctorName = doctor.name.replace(/^Dr\.\s*/i,'').trim();
    lines.push(`Hi Dr. ${plainDoctorName},`);
    lines.push('');
    if (patientText && patientText.length) {
      const truncated = patientText.length > 800 ? patientText.slice(0,800) + '...' : patientText;
      lines.push(`My query: ${truncated}`);
    } else {
      lines.push(`I would like to discuss my case with you.`);
    }
    lines.push('');
    lines.push(`Doctor specialty: ${doctor.speciality}`);
    lines.push('');
    lines.push(`— Sent via AskSurgeons`);
    return lines.join('\n');
  }

  // Initialize messages from sessionStorage or fresh
  let messages = loadMessagesFromSession();
  if (!messages || !Array.isArray(messages)) {
    messages = [];
    const bioHtml = `<strong>${escapeHtml(doctor.name)}</strong><br/><em>${escapeHtml(doctor.speciality)}</em><br/><br/>${escapeHtml(doctor.bio).replace(/\n/g,'<br/>')}`;
    messages.push({ type: 'bio', content: bioHtml, time: timeNow(), meta: {} });
    saveMessagesToSession(messages);
  }

  renderMessages(messages);

  // Composer
  sendBtn.addEventListener('click', onSend);
  input.addEventListener('keydown', (e)=> { if (e.key === 'Enter') onSend(); });

  function onSend() {
    const text = input.value.trim();
    if (!text) return;
    const myMsg = { type: 'me', content: `<div>${escapeHtml(text)}</div>`, time: timeNow(), meta: {} };
    messages.push(myMsg);
    saveMessagesToSession(messages);
    renderMessages(messages);
    input.value = '';

    const hasAuto = messages.some(m => m.type === 'auto_reply');
    if (!hasAuto) {
      const polite = `<strong>AskSurgeons</strong><br/>Thanks — we’ve received your message. To continue securely and get a prompt response, please connect with AskSurgeons on WhatsApp. Tap the green WhatsApp button below to open WhatsApp and send your message to our team.`;
      const autoMsg = {
        type: 'auto_reply',
        content: polite,
        time: timeNow(),
        meta: { patientMsg: text } // store patient message to include in WA message
      };
      messages.push(autoMsg);
      saveMessagesToSession(messages);
      renderMessages(messages);
    } else {
      const tip = { type: 'system', content: `<em>Tip:</em> Use the WhatsApp button above to continue on WhatsApp with AskSurgeons.`, time: timeNow(), meta:{} };
      messages.push(tip);
      saveMessagesToSession(messages);
      renderMessages(messages);
    }
  }

  // focus composer input
  input && input.focus();
});
