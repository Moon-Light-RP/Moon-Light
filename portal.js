
// ---------- Supabase remote persistence ----------
// LocalStorage remains as a fast cache, while every saved MOON LIGHT record is
// mirrored to Supabase through /api/store. This keeps the existing UI synchronous
// and makes the data available across browsers/devices.
(function initMoonLightCloudStore(){
  if (window.__moonLightCloudStoreInitialized) return;
  window.__moonLightCloudStoreInitialized = true;

  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;
  const nativeGet = Storage.prototype.getItem;
  const shouldSync = key => typeof key === "string" && key.startsWith("moon_light_");
  let hydrating = false;

  async function push(key, value){
    if (hydrating || !shouldSync(key)) return;
    try {
      await fetch("/api/store", {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({key, value})
      });
    } catch (_) {}
  }

  async function remove(key){
    if (hydrating || !shouldSync(key)) return;
    try {
      await fetch("/api/store?key=" + encodeURIComponent(key), {method:"DELETE"});
    } catch (_) {}
  }

  Storage.prototype.setItem = function(key, value){
    nativeSet.call(this, key, value);
    if (this === window.localStorage) push(key, value);
  };
  Storage.prototype.removeItem = function(key){
    nativeRemove.call(this, key);
    if (this === window.localStorage) remove(key);
  };

  async function hydrate(){
    if (location.protocol === "file:") return;
    try {
      const response = await fetch("/api/store");
      if (!response.ok) return;
      const data = await response.json();
      const items = Array.isArray(data.items) ? data.items : [];
      const local = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (shouldSync(key)) local.push({key, value:nativeGet.call(window.localStorage, key)});
      }

      if (!items.length && local.length) {
        // First deployment migration: move existing browser data into Supabase.
        for (const item of local) await push(item.key, item.value);
        return;
      }
      if (!items.length) return;

      hydrating = true;
      items.forEach(item => {
        if (item && shouldSync(item.key)) nativeSet.call(window.localStorage, item.key, String(item.value ?? ""));
      });
      hydrating = false;

      // Reload once so pages that render immediately from localStorage see cloud data.
      if (!sessionStorage.getItem("ml_cloud_hydrated")) {
        sessionStorage.setItem("ml_cloud_hydrated", "1");
        location.reload();
      }
    } catch (_) { hydrating = false; }
  }

  // Expose a manual sync hook for debugging/admin pages.
  window.mlCloudSync = hydrate;
  hydrate();
})();
/* MOON LIGHT — Local platform layer
   Storage keys, permissions, notifications, audit log, streamers, content management. */

const APPS_KEY="moon_light_department_apps_v1";
const MEMBERS_KEY="moon_light_members_v1";
const RANKS_KEY="moon_light_ranks_v1";
const NOTICES_KEY="moon_light_notices_v1";
const ROLE_KEY="moon_light_role";
const STAFFNAME_KEY="moon_light_staff_name_v1";
const AUDIT_KEY="moon_light_audit_log_v1";
const NOTIF_KEY="moon_light_notifications_v1";
const STREAMERS_KEY="moon_light_streamers_v1";
const CONTENT_KEY="moon_light_content_v1";

const ML_DEFAULT_RANKS={POLICE:["Recruit","Officer","Senior Officer","Supervisor","Command"],EMS:["Recruit","Officer","Senior Officer","Supervisor","Command"]};

/* ---------- Applications ---------- */
function mlGetApps(){try{return JSON.parse(localStorage.getItem(APPS_KEY)||"[]")}catch(e){return[]}}
function mlSaveApps(all){localStorage.setItem(APPS_KEY,JSON.stringify(all))}

/* ---------- Members / Ranks ---------- */
function mlGetMembers(){try{return JSON.parse(localStorage.getItem(MEMBERS_KEY)||"{}")}catch(e){return{}}}
function mlSaveMembers(all){localStorage.setItem(MEMBERS_KEY,JSON.stringify(all))}
function mlDeptMembers(dept){return mlGetMembers()[dept]||[]}
function mlSaveDeptMembers(dept,list){const all=mlGetMembers();all[dept]=list;mlSaveMembers(all)}
function mlGetRanks(dept){let all={};try{all=JSON.parse(localStorage.getItem(RANKS_KEY)||"{}")}catch(e){}return(all[dept]&&all[dept].length)?all[dept]:ML_DEFAULT_RANKS[dept]}
function mlSaveRanks(dept,arr){let all={};try{all=JSON.parse(localStorage.getItem(RANKS_KEY)||"{}")}catch(e){}all[dept]=arr;localStorage.setItem(RANKS_KEY,JSON.stringify(all))}

/* ---------- Announcements / Internal Notices (per-department) ---------- */
function mlGetNotices(dept){let all={};try{all=JSON.parse(localStorage.getItem(NOTICES_KEY)||"{}")}catch(e){}return all[dept]||{announcements:[],internal:[]}}
function mlSaveNotices(dept,data){let all={};try{all=JSON.parse(localStorage.getItem(NOTICES_KEY)||"{}")}catch(e){}all[dept]=data;localStorage.setItem(NOTICES_KEY,JSON.stringify(all))}

/* ---------- Permissions ---------- */
const ML_ROLES=["Management","Staff","Police Cmd","EMS Cmd","Streamer Manager"];
/* Area -> roles allowed, besides Management which always has full access everywhere. */
const ML_PERMS={
  Applications:["Staff"],
  Police:["Police Cmd"],
  EMS:["EMS Cmd"],
  Streamers:["Streamer Manager"],
  AuditLogs:["Staff"],
  Settings:[],
  Management:["Management"]
};
function mlRole(){return localStorage.getItem(ROLE_KEY)||""}
function mlHasPerm(area){const r=mlRole();if(r==="Management")return true;return(ML_PERMS[area]||[]).includes(r)}

/* Renders the standard permission gate */
function mlRoleGate(lockEl,contentEl,area,label){
  const has=mlHasPerm(area);
  if(has){
    lockEl.className="role-ok";
    lockEl.innerHTML=`Access granted (${mlEsc(label)}). Your role: <b>${mlEsc(mlRole()||"No staff role")}</b>`;
    contentEl.style.display="block";
  }else{
    lockEl.innerHTML=`Access denied. This area requires the <b>${mlEsc(label)}</b> permission (or Management). Your role: <b>${mlEsc(mlRole()||"No staff role")}</b>`;
    contentEl.style.display="none";
  }
  return has;
}

/* ---------- Notifications ---------- */
const ML_NOTIF_TYPES={
  SUBMITTED:"Application Submitted",
  APPROVED:"Application Approved",
  REJECTED:"Application Rejected",
  INTERVIEW_SCHEDULED:"Interview Scheduled",
  INTERVIEW_RESULT:"Interview Result",
  DEPT_ACCEPTED:"Department Accepted",
  STAFF_ANNOUNCEMENT:"Staff Announcement"
};
function mlGetNotifs(){try{return JSON.parse(localStorage.getItem(NOTIF_KEY)||"[]")}catch(e){return[]}}
function mlSaveNotifs(all){localStorage.setItem(NOTIF_KEY,JSON.stringify(all))}
/* toDiscord=null broadcasts to everyone (used for Staff Announcements). */
function mlAddNotification(toDiscord,type,title,body){
  const all=mlGetNotifs();
  all.unshift({id:mlUid(),toDiscord:toDiscord?String(toDiscord).trim().toLowerCase():null,type,title,body,date:new Date().toISOString(),read:false});
  mlSaveNotifs(all);
}
function mlNotifsFor(discord){
  const d=(discord||"").trim().toLowerCase();
  return mlGetNotifs().filter(n=>n.toDiscord===null||n.toDiscord===d);
}

/* ---------- Audit Log ---------- */
function mlGetAudit(){try{return JSON.parse(localStorage.getItem(AUDIT_KEY)||"[]")}catch(e){return[]}}
function mlSaveAudit(all){localStorage.setItem(AUDIT_KEY,JSON.stringify(all))}
function mlStaffName(){return localStorage.getItem(STAFFNAME_KEY)||"Staff Member"}
function mlSetStaffName(n){localStorage.setItem(STAFFNAME_KEY,n)}
/* area should match an ML_PERMS key so the audit log can be scoped per viewer permission. */
function mlLog(area,action,target,details){
  const all=mlGetAudit();
  all.unshift({id:mlUid(),staff:mlStaffName(),role:mlRole()||"Management",area,action,target,details:details||"",date:new Date().toISOString()});
  mlSaveAudit(all);
  mlPushDiscordLog("staff-action",`${mlStaffName()}: ${action}`,`${target||""}${details?" — "+details:""}`.trim());
}

/* ---------- Streamers (shown live on the homepage) ---------- */
function mlGetStreamers(){try{return JSON.parse(localStorage.getItem(STREAMERS_KEY)||"[]")}catch(e){return[]}}
function mlSaveStreamers(all){localStorage.setItem(STREAMERS_KEY,JSON.stringify(all))}

/* ---------- Content Management (Rules / FAQ / Website announcements) ---------- */
const ML_DEFAULT_RULES=[
 {title:"Respect Everyone",body:"Treat players, staff, and the community with respect. Harassment, discrimination, and unnecessary toxicity are not tolerated."},
 {title:"Stay In Character",body:"Keep roleplay realistic and avoid breaking character without a valid roleplay reason."},
 {title:"No RDM / VDM",body:"Do not randomly kill or intentionally run over players without a valid roleplay reason."},
 {title:"No Metagaming",body:"Do not use information obtained outside the game to influence your character's decisions."},
 {title:"No Powergaming",body:"Do not force actions or outcomes on another player's character without giving them a fair chance to respond."},
 {title:"No Exploits",body:"Exploiting bugs, glitches, or vulnerabilities is prohibited. Report issues to staff instead."},
 {title:"Value Your Life",body:"Your character should react realistically to serious threats and dangerous situations."},
 {title:"Staff Decisions",body:"Follow staff instructions during active situations. Appeals and reports should be handled through the proper channels."}
];
const ML_DEFAULT_FAQ=[
 {q:"How do I join MOON LIGHT?",a:"Submit the application, wait for review, and if approved you will receive an interview."},
 {q:"Do I need previous FiveM RP experience?",a:"Experience helps, but our interview is designed to verify that you understand the basics of serious RolePlay."},
 {q:"Are Police and EMS applications separate?",a:"Department recruitment will have its own process after you become an approved member of the community."}
];
function mlGetContent(){
  let c={};try{c=JSON.parse(localStorage.getItem(CONTENT_KEY)||"{}")}catch(e){}
  return{rules:(c.rules&&c.rules.length)?c.rules:ML_DEFAULT_RULES,faq:(c.faq&&c.faq.length)?c.faq:ML_DEFAULT_FAQ,siteAnnouncements:c.siteAnnouncements||[]};
}
function mlSaveContent(c){localStorage.setItem(CONTENT_KEY,JSON.stringify(c))}

/* ---------- Discord Identity & Automatic Role Detection (SIMULATED) ----------
   Real Discord OAuth2 requires a server-side client secret and a redirect handler,
   which cannot run in a static browser page. This models the same *shape* of flow:
   a local "identity" plus a staff-maintained Discord-ID → Role map that a real bot
   would otherwise populate automatically from the live Discord server's roles. */
const IDENTITY_KEY="moon_light_discord_identity_v1";
const ROLEMAP_KEY="moon_light_discord_role_map_v1";
function mlGetIdentity(){try{return JSON.parse(localStorage.getItem(IDENTITY_KEY)||"null")}catch(e){return null}}
function mlSetIdentity(id){localStorage.setItem(IDENTITY_KEY,JSON.stringify(id))}
function mlClearIdentity(){localStorage.removeItem(IDENTITY_KEY)}
function mlGetRoleMap(){try{return JSON.parse(localStorage.getItem(ROLEMAP_KEY)||"{}")}catch(e){return{}}}
function mlSaveRoleMap(m){localStorage.setItem(ROLEMAP_KEY,JSON.stringify(m))}
/* Looks up the role a real Discord role-sync bot would have assigned, keyed by Discord ID or username. */
function mlAutoRole(discordKey){const m=mlGetRoleMap();return m[(discordKey||"").trim().toLowerCase()]||""}

/* ---------- FiveM Server Status (SIMULATED) ----------
   A real integration would poll the FiveM server's /players.json or a txAdmin API on an interval.
   Here Management/Settings edits a local snapshot that the homepage renders live. */
const SERVERSTATUS_KEY="moon_light_server_status_v1";
function mlGetServerStatus(){
  let s={};try{s=JSON.parse(localStorage.getItem(SERVERSTATUS_KEY)||"null")}catch(e){}
  return s||{online:true,players:128,maxPlayers:256,lastSync:new Date().toISOString()};
}
function mlSaveServerStatus(s){s.lastSync=new Date().toISOString();localStorage.setItem(SERVERSTATUS_KEY,JSON.stringify(s))}

/* ---------- Tickets (Application → Discord Ticket, SIMULATED) ---------- */
const TICKETS_KEY="moon_light_tickets_v1";
function mlGetTickets(){try{return JSON.parse(localStorage.getItem(TICKETS_KEY)||"[]")}catch(e){return[]}}
function mlSaveTickets(all){localStorage.setItem(TICKETS_KEY,JSON.stringify(all))}
function mlCreateTicket(type,discord,characterName){
  const all=mlGetTickets();
  const num=String(all.length+1).padStart(4,"0");
  const t={id:mlUid(),channel:`#app-ticket-${num}`,type,discord,characterName,status:"open",created:new Date().toISOString()};
  all.unshift(t);
  mlSaveTickets(all);
  mlPushDiscordLog("ticket",`Ticket ${t.channel} opened`,`${characterName||"Applicant"} (${discord||"—"}) — ${type} application`);
  return t;
}

/* ---------- Discord Activity Log (SIMULATED) ----------
   Represents what a real Discord bot would post/DM. A real system replaces mlPushDiscordLog's
   body with an actual bot API call (webhook / DM / channel message). */
const DISCORDLOG_KEY="moon_light_discord_log_v1";
function mlGetDiscordLog(){try{return JSON.parse(localStorage.getItem(DISCORDLOG_KEY)||"[]")}catch(e){return[]}}
function mlSaveDiscordLog(all){localStorage.setItem(DISCORDLOG_KEY,JSON.stringify(all))}
function mlPushDiscordLog(kind,title,body){
  const all=mlGetDiscordLog();
  all.unshift({id:mlUid(),kind,title,body,date:new Date().toISOString()});
  mlSaveDiscordLog(all);
}

/* ---------- Small utilities ---------- */
function mlEsc(s){return(s==null?"":String(s)).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function mlUid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function mlFmt(d){try{return new Date(d).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})}catch(e){return d||"—"}}
function mlDate(d){try{return new Date(d).toLocaleDateString()}catch(e){return d||"—"}}
function mlTime(d){try{return new Date(d).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}catch(e){return""}}
