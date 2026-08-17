/* MOON LIGHT Portal - Server-Backed Storage & Auth */

const SUPABASE_URL="https://moon-light-db.supabase.co"; // Replace with actual URL
const SUPABASE_KEY=""; // Service role key should be set server-side

/* ---------- Core Storage ---------- */
async function mlStore(method,key,value){
  const body=method==="GET"?undefined:JSON.stringify({key,value});
  const headers={};
  if(method!=="GET")headers["Content-Type"]="application/json";
  try{
    const url=method==="GET"?`/api/store`:"/api/store";
    const r=await fetch(url,{method,headers,body});
    const d=await r.json();
    if(!d.ok)throw new Error(d.error||"Storage failed");
    if(method==="GET"){
      const items=Array.isArray(d.items)?d.items:[];
      const item=items.find(i=>i.key===key);
      if(!item)return null;
      try{return JSON.parse(item.value)}catch(e){return item.value}
    }
    return d;
  }catch(e){
    console.error("Storage error:",e);
    throw e;
  }
}
async function mlGetStore(key){return await mlStore("GET",key)}
async function mlSetStore(key,value){return await mlStore("PUT",key,value)}
async function mlDeleteStore(key){return await mlStore("DELETE",key)}

/* ---------- Identity ---------- */
const IDENTITY_KEY="moon_light_discord_identity_v1";
async function mlGetIdentity(){const d=await mlGetStore(IDENTITY_KEY);return typeof d==="object"?d:null}
async function mlSetIdentity(id){return await mlSetStore(IDENTITY_KEY,id)}
async function mlClearIdentity(){return await mlDeleteStore(IDENTITY_KEY)}

/* ---------- Auto Role Lookup ---------- */
async function mlAutoRole(discordIdOrName){
  // Get role from server (new table-based system only)
  try{
    const response=await fetch("/api/auth/role");
    if(response.ok){
      const data=await response.json();
      if(data.ok && data.roleId && data.roleId!=='PLAYER'){
        return data.roleId;
      }
    }
  }catch(e){
    console.error("Failed to fetch role from server:",e);
  }
  
  return "";
}

/* ---------- Staff Name (Deprecated - now uses identity) ---------- */
/* Removed manual staff name setting - system now uses Discord identity automatically */

/* ---------- Server Status ---------- */
const STATUS_KEY="moon_light_server_status_v1";
async function mlGetServerStatus(){const d=await mlGetStore(STATUS_KEY);return typeof d==="object"?d:{online:true,players:0,maxPlayers:128,lastSync:new Date().toISOString()}}
async function mlSaveServerStatus(s){return await mlSetStore(STATUS_KEY,s)}

/* ---------- Applications (Table-based) ---------- */
async function mlGetApps(){
  try{
    const response=await fetch("/api/applications");
    const data=await response.json();
    return data.ok?data.applications:[];
  }catch(e){
    console.error("Error fetching applications:",e);
    return [];
  }
}
async function mlSaveApps(all){
  // Not needed with table-based API - applications are saved individually
  console.warn("mlSaveApps is deprecated with table-based API");
}

/* ---------- Members / Ranks ---------- */
async function mlGetMembers(){const data=await mlGetStore(MEMBERS_KEY);return typeof data==="object"&&data!==null?data:{}}
async function mlSaveMembers(all){return await mlSetStore(MEMBERS_KEY,all)}
async function mlDeptMembers(dept){const all=await mlGetMembers();return(all[dept]||[])}
async function mlSaveDeptMembers(dept,list){const all=await mlGetMembers();all[dept]=list;return await mlSaveMembers(all)}
async function mlGetRanks(dept){const all=await mlGetStore(RANKS_KEY);const data=typeof all==="object"&&all!==null?all:{};return(data[dept]&&data[dept].length)?data[dept]:ML_DEFAULT_RANKS[dept]}
async function mlSaveRanks(dept,arr){const all=await mlGetStore(RANKS_KEY)||{};all[dept]=arr;return await mlSetStore(RANKS_KEY,all)}

/* ---------- Announcements / Internal Notices (per-department) ---------- */
async function mlGetNotices(dept){const all=await mlGetStore(NOTICES_KEY)||{};return all[dept]||{announcements:[],internal:[]}}
async function mlSaveNotices(dept,data){const all=await mlGetStore(NOTICES_KEY)||{};all[dept]=data;return await mlSetStore(NOTICES_KEY,all)}

/* ---------- Permissions ---------- */
/* Role IDs for flexibility and multiple role support */
const ML_ROLE_IDS={
  MANAGEMENT:"MANAGEMENT_ROLE_ID",
  ADMINISTRATOR:"ADMINISTRATOR_ROLE_ID",
  MODERATOR:"MODERATOR_ROLE_ID",
  SUPPORT:"SUPPORT_ROLE_ID",
  POLICE_MANAGEMENT:"POLICE_MANAGEMENT_ROLE_ID",
  EMS_MANAGEMENT:"EMS_MANAGEMENT_ROLE_ID"
};

/* Mapping from server role IDs to client-side role labels */
const ML_ROLE_ID_TO_CLIENT={
  MANAGEMENT_ROLE_ID:"Management",
  MODERATOR_ROLE_ID:"Staff",
  POLICE_MANAGEMENT_ROLE_ID:"Police Cmd",
  EMS_MANAGEMENT_ROLE_ID:"EMS Cmd",
  ADMINISTRATOR_ROLE_ID:"Streamer Manager"
};

/* Area -> Client-side role labels allowed (matching portal.js system) */
const ML_PERMS={
  Applications:["Staff","Streamer Manager","Police Cmd","EMS Cmd"],
  Police:["Police Cmd"],
  EMS:["EMS Cmd"],
  Streamers:["Streamer Manager"],
  AuditLogs:["Staff"],
  Settings:["Management"]
};

/* Server-side role validation - SECURE */
let cachedRoleId=null;
let roleFetchInProgress=false;
let cachedPermissions=null;

async function mlRole(){
  // Return cached role label if available
  if(cachedRoleId!==null) return cachedRoleId;
  
  // Prevent multiple simultaneous fetches
  if(roleFetchInProgress) return "PLAYER";
  
  roleFetchInProgress=true;
  try{
    console.log("Fetching role from /api/auth/role...");
    const response=await fetch("/api/auth/role");
    console.log("Role response status:", response.status);
    if(response.ok){
      const data=await response.json();
      console.log("Role response data:", data);
      if(data.ok && data.roleId){
        // Translate server role ID to client-side label
        const clientLabel = ML_ROLE_ID_TO_CLIENT[data.roleId] || "PLAYER";
        cachedRoleId = clientLabel;
        return clientLabel;
      }
    }
  }catch(e){
    console.error("Failed to fetch role from server:",e);
  }finally{
    roleFetchInProgress=false;
  }
  
  cachedRoleId="PLAYER";
  return "PLAYER";
}

/* REMOVED: mlSetRole is now disabled for security */
function mlSetRole(role){
  console.warn("Direct role setting is disabled for security. Role is validated server-side.");
}

async function mlHasPerm(area){
  const roleLabel=await mlRole();
  // SECURITY: Always verify with server for sensitive areas
  if(roleLabel==="Management"){
    // Double-check with server for Management role
    try{
      const response=await fetch("/api/auth/role");
      if(response.ok){
        const data=await response.json();
        // Only trust Management if server confirms it
        if(data.roleId!=="MANAGEMENT_ROLE_ID"){
          console.warn("SECURITY: Client claims Management but server disagrees. Denying access.");
          return false;
        }
      }
    }catch(e){
      console.error("SECURITY: Failed to verify Management role with server:",e);
      return false;
    }
    return true;
  }
  return(ML_PERMS[area]||[]).includes(roleLabel);
}

// Get detailed permissions from server
async function mlGetDetailedPermissions(){
  if(cachedPermissions!==null) return cachedPermissions;
  
  try{
    const response=await fetch("/api/permissions");
    const data=await response.json();
    if(data.ok){
      cachedPermissions=data.permissions;
      return data.permissions;
    }
  }catch(e){
    console.error("Failed to fetch permissions:",e);
  }
  
  return [];
}

// Get role name for display
async function mlGetRoleName(){
  try{
    // Use /api/auth/role instead of /api/permissions as it's more reliable
    const response=await fetch("/api/auth/role");
    const data=await response.json();
    console.log("mlGetRoleName - /api/auth/role response:", data);
    if(data.ok && data.roleName){
      const name=data.roleName;
      // Ensure it's a string
      return typeof name === 'string' ? name : 'Player';
    }
  }catch(e){
    console.error("Failed to fetch role name:",e);
  }
  
  // Fallback: try to get from local storage or role ID
  try{
    const roleId=await mlRole();
    const nameMapping={
      'MANAGEMENT_ROLE_ID':'Management',
      'ADMINISTRATOR_ROLE_ID':'Administrator',
      'MODERATOR_ROLE_ID':'Moderator',
      'SUPPORT_ROLE_ID':'Support',
      'POLICE_MANAGEMENT_ROLE_ID':'Police Management',
      'EMS_MANAGEMENT_ROLE_ID':'EMS Management',
      'PLAYER':'Player'
    };
    const name=nameMapping[roleId]||"Player";
    return typeof name === 'string' ? name : 'Player';
  }catch(e){
    console.error("Fallback role name failed:",e);
  }
  
  return "Player";
}

// Check specific permission
async function mlHasPermission(permission){
  const permissions=await mlGetDetailedPermissions();
  return permissions.includes(permission);
}

/* Renders the standard permission gate - SECURE VERSION */
async function mlRoleGate(lockEl,contentEl,area,label){
  const roleId=await mlRole();
  const roleName=await mlGetRoleName();
  const has=await mlHasPerm(area);
  
  // SECURITY: Double-check with server for sensitive areas
  if(has && (area==="Settings" || area==="Management" || area==="AuditLogs")){
    try{
      const response=await fetch("/api/auth/role");
      if(response.ok){
        const data=await response.json();
        // Verify server agrees with client role
        if(data.roleId!==roleId && roleId==="MANAGEMENT_ROLE_ID"){
          console.warn("SECURITY: Server disagrees with client Management role. Denying access.");
          lockEl.innerHTML=`Security check failed. Your role: <b>${mlEsc(roleName||"Player")}</b>`;
          contentEl.style.display="none";
          return false;
        }
      }
    }catch(e){
      console.error("SECURITY: Failed to verify sensitive area access:",e);
      lockEl.innerHTML=`Security check failed. Please refresh.`;
      contentEl.style.display="none";
      return false;
    }
  }
  
  if(has){
    lockEl.className="role-ok";
    lockEl.innerHTML=`Access granted (${mlEsc(label)}). Your role: <b>${mlEsc(roleName||"Player")}</b>`;
    contentEl.style.display="block";
  }else{
    lockEl.innerHTML=`Access denied. This area requires the <b>${mlEsc(label)}</b> permission (or Management). Your role: <b>${mlEsc(roleName||"Player")}</b>`;
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
async function mlGetNotifs(){const data=await mlGetStore(NOTIF_KEY);return Array.isArray(data)?data:[]}
async function mlSaveNotifs(all){return await mlSetStore(NOTIF_KEY,all)}
/* toDiscord=null broadcasts to everyone (used for Staff Announcements). */
async function mlAddNotification(toDiscord,type,title,body){
  const all=await mlGetNotifs();
  all.unshift({id:mlUid(),toDiscord:toDiscord?String(toDiscord).trim().toLowerCase():null,type,title,body,date:new Date().toISOString(),read:false});
  await mlSaveNotifs(all);
}
async function mlNotifsFor(discord){
  const d=(discord||"").trim().toLowerCase();
  const all=await mlGetNotifs();
  return all.filter(n=>n.toDiscord===null||n.toDiscord===d);
}

/* ---------- Audit Log ---------- */
async function mlGetAudit(){const data=await mlGetStore(AUDIT_KEY);return Array.isArray(data)?data:[]}
async function mlSaveAudit(all){return await mlSetStore(AUDIT_KEY,all)}
/* area should match an ML_PERMS key so the audit log can be scoped per viewer permission. */
async function mlLog(area,action,target,details){
  const all=await mlGetAudit();
  const identity=await mlGetIdentity();
  const staffName=identity?.username||identity?.discordId||"Unknown Staff";
  const role=await mlGetRoleName();
  all.unshift({id:mlUid(),area,action,target,details,staffName,staffRole:role,timestamp:new Date().toISOString()});
  await mlSaveAudit(all);
}

/* ---------- Tickets ---------- */
async function mlGetTickets(){const data=await mlGetStore(TICKETS_KEY);return Array.isArray(data)?data:[]}
async function mlSaveTickets(all){return await mlSetStore(TICKETS_KEY,all)}
async function mlCreateTicket(type,discord,channelName){
  const all=await mlGetTickets();
  all.unshift({id:mlUid(),type,discord,channel:channelName,status:"open",created:new Date().toLocaleString()});
  await mlSaveTickets(all);
}
async function mlPushDiscordLog(type,message,details){
  // This would call a Discord bot API
  console.log("Discord log:",type,message,details);
}

/* ---------- Streamers ---------- */
async function mlGetStreamers(){const data=await mlGetStore(STREAMER_KEY);return Array.isArray(data)?data:[]}
async function mlSaveStreamers(all){return await mlSetStore(STREAMER_KEY,all)}

/* ---------- Content ---------- */
async function mlGetContent(){const data=await mlGetStore(CONTENT_KEY);return typeof data==="object"?data:{faq:[],siteAnnouncements:[]}}
async function mlSaveContent(c){return await mlSetStore(CONTENT_KEY,c)}

/* ---------- Utilities ---------- */
function mlUid(){return Date.now().toString(36)+Math.random().toString(36).substr(2,9)}
function mlEsc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function mlFmt(date){if(!date)return"—";try{return new Date(date).toLocaleString()}catch(e){return date}}
const APPS_KEY="moon_light_department_apps_v1";
const TICKETS_KEY="moon_light_tickets_v1";
const NOTIF_KEY="moon_light_notifications_v1";
const AUDIT_KEY="moon_light_audit_log_v1";
const MEMBERS_KEY="moon_light_members_v1";
const RANKS_KEY="moon_light_ranks_v1";
const NOTICES_KEY="moon_light_department_notices_v1";
const STREAMER_KEY="moon_light_streamers_v1";
const CONTENT_KEY="moon_light_content_v1";
const ML_DEFAULT_RANKS={POLICE:["Cadet","Officer","Sergeant","Lieutenant","Captain","Deputy Chief","Chief"],EMS:["EMT","Paramedic","Senior Paramedic","Lieutenant","Captain","Deputy Chief","Chief"]};