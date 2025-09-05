// assets/chat.js (updated: WA button only on auto-reply; composer fixed)
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

  // Build header
  const root = document.getElementById('chat-root');
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

  const area = document.getElementById('chat-area');
  const input = document.getElementById('composer-input');
  const sendBtn = document.getElementById('send-btn');

  // helpers
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function timeNow(){ const d=new Date(); return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0'); }

  // create simple message node (no WA button)
  function createMessageNodeSimple({html, cls='system'}) {
    const wrapper = document.createElement('div');
    wrapper.className = `msg ${cls}`;
    const inner = document.createElement('div');
    inner.className = 'msg-content';
    inner.innerHTML = html;
    wrapper.appendChild(inner);
    return wrapper;
  }

  // create system node with WA connect button (only used for the polite auto-reply)
  function createSystemNodeWithWA(html, patientMsgForWA = '') {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg system';
    const content = document.createElement('div');
    content.className = 'msg-content';
    content.innerHTML = html;
    wrapper.appendChild(content);

    const waBtn = document.createElement('button');
    waBtn.className = 'wa-connect-btn';
    waBtn.type = 'button';
    waBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Connect via WhatsApp';
    waBtn.addEventListener('click', () => {
      const waMessage = buildWhatsAppMessage(patientMsgForWA);
      showToast('Opening WhatsApp…');
      window.open(WA_BASE + encodeURIComponent(waMessage), '_blank');
    });

    wrapper.appendChild(waBtn);
    return wrapper;
  }

  function addSystemMessage(html) {
    const node = createMessageNodeSimple({html, cls:'system'});
    area.appendChild(node);
    area.scrollTop = area.scrollHeight;
  }
  function addMyMessage(text) {
    const html = `<div>${escapeHtml(text)}</div><span class="time">${timeNow()}</span>`;
    const node = createMessageNodeSimple({html, cls:'me'});
    area.appendChild(node);
    area.scrollTop = area.scrollHeight;
  }

  // toast
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

  // build WA message
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

  // Initial doctor bio as a system message (without WA)
  const bioHtml = `<strong>${escapeHtml(doctor.name)}</strong><br/><em>${escapeHtml(doctor.speciality)}</em><br/><br/>${escapeHtml(doctor.bio).replace(/\n/g,'<br/>')}`;
  addSystemMessage(bioHtml);

  // Track if auto-reply already shown for this doctor in this session
  const sessionKey = `as_auto_reply_shown_doc_${idx}`;
  const autoReplyShown = sessionStorage.getItem(sessionKey) === '1';

  // Composer behavior
  sendBtn.addEventListener('click', onComposerSend);
  input.addEventListener('keydown', (e)=> { if (e.key === 'Enter') onComposerSend(); });

  function onComposerSend() {
    const text = input.value.trim();
    if (!text) return;
    // add to chat locally
    addMyMessage(text);
    input.value = '';

    // If this is the first message this session for this doctor, show polite auto-reply and WA connect button
    if (!sessionStorage.getItem(sessionKey)) {
      const polite = `<strong>AskSurgeons</strong><br/>Thanks — we’ve received your message. To continue securely and get a prompt response, please connect with AskSurgeons on WhatsApp. Tap the green WhatsApp button below to open WhatsApp and send your message to our team.`;
      const node = createSystemNodeWithWA(polite, text);
      area.appendChild(node);
      area.scrollTop = area.scrollHeight;
      sessionStorage.setItem(sessionKey, '1');
    } else {
      // optional subtle system tip
      const tipHtml = `<em>Tip:</em> Use the WhatsApp button above to continue on WhatsApp with AskSurgeons.`;
      addSystemMessage(tipHtml);
    }
  }

  // focus composer input on load
  input && input.focus();
});
