// assets/chat.js — trimmed and updated
document.addEventListener("DOMContentLoaded", async () => {
const ASKSURGEONS_NUMBER = "918062182411";
const WA_BASE = `https://wa.me/${ASKSURGEONS_NUMBER}?text=`;


const params = new URLSearchParams(location.search);
const idx = parseInt(params.get("doc") || "0", 10);


async function loadDoctors() {
try { const res = await fetch("doctors/data.json", { cache: "no-store" }); return await res.json(); }
catch (err) { console.error("Could not load doctors/data.json", err); return []; }
}


const doctors = await loadDoctors();
const doctor = doctors[idx] || doctors[0] || { name: "Doctor", speciality: "", image: "assets/logo2.png", bio: "No details available.", areas_of_speciality: [] };


const esc = s => String(s).replace(/[&<>\"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));


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
<a id="header-call" href="tel:+${ASKSURGEONS_NUMBER}" style="color:white"><i class="fas fa-phone"></i></a>
</div>
</header>
`;


// header back — navigate back or to directory
document.getElementById("back-btn").addEventListener("click", () => {
// prefer explicit directory route if available
if (location.pathname.includes('chat.html')) location.href = '/doctors';
else history.back();
});


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


detailsNode.innerHTML = bioHtml;
detailsNode.appendChild(details);
});
