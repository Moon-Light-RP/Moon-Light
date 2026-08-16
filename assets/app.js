let currentStep=0;
const steps=[...document.querySelectorAll('.form-step')];
const indicators=[...document.querySelectorAll('.steps span')];
function showStep(n){if(!steps.length)return;currentStep=n;steps.forEach((s,i)=>s.classList.toggle('active',i===n));indicators.forEach((s,i)=>s.classList.toggle('active',i===n));window.scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('.next').forEach(btn=>btn.addEventListener('click',()=>{const form=btn.closest('form');const fields=[...steps[currentStep].querySelectorAll('input,textarea,select')];if(!fields.every(x=>x.checkValidity())){fields.forEach(x=>x.reportValidity());return}showStep(Math.min(currentStep+1,steps.length-1))}));
document.querySelectorAll('.back').forEach(btn=>btn.addEventListener('click',()=>showStep(Math.max(currentStep-1,0))));
document.getElementById('applicationForm')?.addEventListener('submit',e=>{e.preventDefault();document.getElementById('formMsg').textContent='Application submitted successfully. Your application is now pending review.';e.target.reset();showStep(0)});
const menu=document.getElementById('menuBtn');if(menu)menu.onclick=()=>document.querySelector('.nav')?.classList.toggle('open');


(function(){
  const KEY="moon_light_streamers_v1";
  const list=document.getElementById("publicStreamerList");
  if(!list)return;
  const defaults=[
    {id:1,name:"MOON LIGHT Official",platform:"Twitch",link:"https://twitch.tv/moonlight"},
    {id:2,name:"MOON LIGHT RP",platform:"YouTube",link:"https://youtube.com/"}
  ];
  let streamers=[];
  try{streamers=JSON.parse(localStorage.getItem(KEY)||"null")||defaults}catch(e){streamers=defaults}
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const initials=n=>String(n).split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();
  function render(){
    list.innerHTML=streamers.length?streamers.map(s=>`
      <article class="public-streamer-card">
        <span class="public-streamer-avatar">${initials(s.name)}</span>
        <div class="public-streamer-info">
          <b>${esc(s.name)}</b>
          <small>${esc(s.platform)}</small>
          <a href="${esc(s.link)}" target="_blank" rel="noopener">Visit channel ↗</a>
        </div>
      </article>`).join(""):`<div class="public-streamers-empty">No official streamers are listed yet.</div>`;
  }
  render();
  window.addEventListener("storage",e=>{if(e.key===KEY){try{streamers=JSON.parse(e.newValue)||[];render()}catch(err){}}});
})();
