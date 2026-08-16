const KEY="moon_light_staff_v1";
const seed=[
{id:1,name:"Ahmed Hassan",age:25,discord:"558939870618189834",steam:"https://steamcommunity.com/profiles/76561199438138084/",experience:"Intermediate (3–12 months)",backstory:"A young mechanic who moved to the city looking for a fresh start and honest work.",why:"I want a serious RP environment with a strong community.",submitted:"Today, 01:18",status:"pending",interview:null},
{id:2,name:"Michael Carter",age:22,discord:"michael_carter",steam:"https://steamcommunity.com/id/michaelcarter",experience:"Advanced (over 1 year)",backstory:"Former EMS trainee trying to build a new life in the city.",why:"I enjoy story-driven RP and want to be part of an organized server.",submitted:"Yesterday, 22:40",status:"interview",interview:"2026-08-08T20:00"},
{id:3,name:"Omar Ali",age:28,discord:"omar.ali",steam:"https://steamcommunity.com/id/omarali",experience:"Pro (over 2 years)",backstory:"A businessman focused on building a legitimate company.",why:"I am looking for mature, serious RolePlay.",submitted:"Aug 07, 18:12",status:"accepted",interview:"2026-08-07T21:00"},
{id:4,name:"Daniel Reed",age:19,discord:"dan_reed",steam:"https://steamcommunity.com/id/danreed",experience:"Beginner (less than 3 months)",backstory:"A student who wants to explore the city and learn the RP experience.",why:"I want to learn serious RP and meet new people.",submitted:"Aug 07, 16:05",status:"rejected",interview:null}
];
let apps=JSON.parse(localStorage.getItem(KEY)||"null")||seed;
const $=s=>document.querySelector(s);
function save(){localStorage.setItem(KEY,JSON.stringify(apps));render()}
function initials(n){return n.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}
function statusLabel(s){return `<span class="status ${s}">${s}</span>`}
function render(){
 const q=$("#search").value.toLowerCase(), filter=$("#statusFilter").value;
 const list=apps.filter(a=>(filter==="all"||a.status===filter)&&(!q||[a.name,a.discord,a.steam,a.experience].join(" ").toLowerCase().includes(q)));
 $("#totalStat").textContent=apps.length;
 $("#pendingStat").textContent=apps.filter(a=>a.status==="pending").length;
 $("#acceptedStat").textContent=apps.filter(a=>a.status==="accepted").length;
 $("#interviewStat").textContent=apps.filter(a=>a.status==="interview").length;
 $("#pendingCount").textContent=apps.filter(a=>a.status==="pending").length;
 $("#applicationRows").innerHTML=list.length?list.map(a=>`<tr>
 <td><div class="applicant"><span class="mini">${initials(a.name)}</span><div><b>${a.name}</b><small>Age ${a.age}</small></div></div></td>
 <td>${a.discord}</td><td class="muted">${a.experience}</td><td class="muted">${a.submitted}</td>
 <td>${statusLabel(a.status)}</td><td><button class="view-btn" onclick="openApp(${a.id})">View</button></td></tr>`).join(""):`<tr><td colspan="6"><div class="empty">No applications found.</div></td></tr>`;
 const interviews=apps.filter(a=>a.interview);
 $("#interviewList").innerHTML=interviews.length?interviews.map(a=>`<div class="interview-card"><div><b>${a.name}</b><small>${a.discord} · ${a.experience}</small></div><div class="time">${new Date(a.interview).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})}</div></div>`).join(""):`<div class="empty">No interviews scheduled.</div>`;
}

const STREAMER_KEY="moon_light_streamers_v1";
const defaultStreamers=[
{id:1,name:"MOON LIGHT Official",platform:"Twitch",link:"https://twitch.tv/moonlight"},
{id:2,name:"MOON LIGHT RP",platform:"YouTube",link:"https://youtube.com/"}
];
let streamers=JSON.parse(localStorage.getItem(STREAMER_KEY)||"null")||defaultStreamers;
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function renderStreamers(){
 const list=$("#streamerList"); if(!list)return;
 $("#streamerCount").textContent=streamers.length;
 list.innerHTML=streamers.length?streamers.map(s=>`<div class="streamer-card">
 <span class="streamer-avatar">${initials(s.name)}</span><div class="streamer-info">
 <b>${esc(s.name)}</b><small>${esc(s.platform)}</small><a href="${esc(s.link)}" target="_blank" rel="noopener">${esc(s.link)} ↗</a>
 </div><button class="streamer-remove" onclick="removeStreamer(${s.id})">Remove</button></div>`).join(""):`<div class="streamer-empty">No streamers added yet.</div>`;
}
function removeStreamer(id){
 const s=streamers.find(x=>x.id===id); if(!s)return;
 if(confirm(`Remove ${s.name} from the official streamer list?`)){
  streamers=streamers.filter(x=>x.id!==id);
  localStorage.setItem(STREAMER_KEY,JSON.stringify(streamers)); renderStreamers();
 }
}

function openApp(id){
 const a=apps.find(x=>x.id===id); if(!a)return;
 $("#modalContent").innerHTML=`<div class="detail-head"><span class="eyebrow">APPLICATION #${String(a.id).padStart(4,"0")}</span><h2>${a.name}</h2>${statusLabel(a.status)}</div>
 <div class="detail-grid">
 <div class="detail-item"><small>Age</small><b>${a.age}</b></div><div class="detail-item"><small>Discord ID</small><b>${a.discord}</b></div>
 <div class="detail-item"><small>RolePlay Experience</small><b>${a.experience}</b></div><div class="detail-item"><small>Submitted</small><b>${a.submitted}</b></div>
 <div class="detail-item"><small>Steam Profile</small><a href="${a.steam}" target="_blank">Open Steam Profile ↗</a></div>
 </div>
 <div class="detail-block"><h3>CHARACTER BACKSTORY</h3><p>${a.backstory}</p></div>
 <div class="detail-block"><h3>WHY DO YOU WANT TO JOIN MOON LIGHT?</h3><p>${a.why}</p></div>
 <div class="actions">
   <button class="primary" onclick="setStatus(${a.id},'interview')">Move to Interview</button>
   <button onclick="setStatus(${a.id},'accepted')">Accept</button>
   <button class="danger" onclick="setStatus(${a.id},'rejected')">Reject</button>
 </div>
 <div class="schedule"><b style="font-size:12px">Schedule Interview</b><div style="margin-top:10px"><input id="dateInput" type="datetime-local" value="${a.interview||""}"><button onclick="schedule(${a.id})">Schedule</button></div></div>`;
 $("#modal").classList.remove("hidden");
}
function setStatus(id,status){const a=apps.find(x=>x.id===id);a.status=status;if(status!=="interview")a.interview=null;save();openApp(id)}
function schedule(id){const v=$("#dateInput").value;if(!v)return;const a=apps.find(x=>x.id===id);a.interview=v;a.status="interview";save();openApp(id)}
$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")$("#modal").classList.add("hidden")});
$("#search").oninput=render;$("#statusFilter").onchange=render;
// Reset button handler removed; application data is persisted locally via localStorage.
$("#logout").onclick=()=>alert("Authentication is handled by the backend server.");

$("#openStreamerForm")?.addEventListener("click",()=>{$("#streamerForm").classList.remove("hidden-form");$("#streamerName").focus()});
$("#cancelStreamer")?.addEventListener("click",()=>{$("#streamerForm").classList.add("hidden-form");$("#streamerError").textContent=""});
$("#saveStreamer")?.addEventListener("click",()=>{
 const name=$("#streamerName").value.trim(), platform=$("#streamerPlatform").value, link=$("#streamerLink").value.trim(), err=$("#streamerError");
 if(!name||!link){err.textContent="Streamer name and link are required.";return}
 try{new URL(link)}catch(e){err.textContent="Enter a valid URL.";return}
 streamers.push({id:Date.now(),name,platform,link});
 localStorage.setItem(STREAMER_KEY,JSON.stringify(streamers));
 $("#streamerName").value="";$("#streamerLink").value="";err.textContent="";
 $("#streamerForm").classList.add("hidden-form");renderStreamers();
});

renderStreamers();
render();
