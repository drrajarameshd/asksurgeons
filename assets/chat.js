// assets/chat.js
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  const idx = parseInt(params.get('doc') || "0", 10);

  // load doctors data
  async function loadDoctors(){
    try {
      const res = await fetch('doctors/data.json', {cache: "no-store"});
      return await res.json();
    } catch (e) {
      console.error('Could not load doctors data', e);
      return [];
    }
  }

  const doctors = await loadDoctors();
  const doctor = doctors[idx] || doctors[0] || { name: 'Doctor', speciality:'', image:'assets/logo.png', bio:'No details' };

  // build header
  const root = document.getElementById('chat-root');
  root.innerHTML = `
    <header class="chat-header">
      <button id="back-btn" aria-label="Back" style="background:transparent;border:none;color:white;font-size:1.1rem;margin-right:.5rem"><i class="fas fa-arrow-left"></i></button>
      <img class="avatar" src="${doctor.image}" alt="${doctor.name}" onerror="this.src='assets/logo.png'">
      <div class="meta">
        <div class="name">${doctor.name}</div>
        <div class="spec">${doctor.speciality}</div>
      </div>
      <div class="chat-actions">
        <a href="tel:+918062182411" style="color:white"><i class="fas fa-phone"></i></a>
      </div>
    </header>
  `;

  document.getElementById('back-btn').addEventListener('click', ()=> history.back());

  const area = document.getElementById('chat-area');

  // show system message with full bio (like pinned message)
  function addSystemMessage(html) {
    const div = document.createElement('div');
    div.className = 'msg system';
    div.innerHTML = html;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  }

  function addMyMessage(text) {
    const div = document.createElement('div');
    div.className = 'msg me';
    div.innerHTML = `<div>${escapeHtml(text)}</div><span class="time">${timeNow()}</span>`;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  }

  // escape tiny helper
  function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function timeNow(){ const d=new Date(); return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0'); }

  // render doctor bio as message HTML
  const bioHtml = `
    <strong>${doctor.name}</strong><br/>
    <em>${doctor.speciality}</em><br/><br/>
    ${doctor.bio.replace(/\n/g,'<br/>')}
  `;
  addSystemMessage(bioHtml);

  // handle composer
  const input = document.getElementById('composer-input');
  const sendBtn = document.getElementById('send-btn');
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e)=> { if (e.key === 'Enter') sendMessage(); });

  function sendMessage(){
    const text = input.value.trim();
    if (!text) return;
    addMyMessage(text);
    input.value = '';
    // For now, messages are local only. You can integrate API here for real chat.
  }
});
