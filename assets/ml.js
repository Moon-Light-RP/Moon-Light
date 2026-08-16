
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
const ML = {
    appKey: "moon_light_applications_v4",
    deptKey: "moon_light_department_apps_v4",
    staffKey: "moon_light_staff_role_v4",
    profileKey: "moon_light_profile_v4",
    noticeKey: "moon_light_notifications_v4",
    logKey: "moon_light_audit_v4",
    streamerKey: "moon_light_streamers_v4"
};

function read(key, defaultValue = []) {
    try {
        return JSON.parse(
            localStorage.getItem(key) || "null"
        ) ?? defaultValue;
    } catch {
        return defaultValue;
    }
}

function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function esc(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char])
    );
}

function role() {
    return read(ML.staffKey, "Guest");
}

function can(permission) {

    const currentRole = role();

    if (currentRole === "Management")
        return true;

    if (
        permission === "police" &&
        (
            currentRole === "Police Recruitment" ||
            currentRole === "Police Command"
        )
    )
        return true;

    if (
        permission === "ems" &&
        (
            currentRole === "EMS Recruitment" ||
            currentRole === "EMS Command"
        )
    )
        return true;

    if (
        permission === "streamers" &&
        currentRole === "Streamer Manager"
    )
        return true;

    return false;
}

function audit(action, details) {

    const logs = read(ML.logKey, []);

    logs.unshift({
        id: "LOG-" + Date.now(),
        at: new Date().toLocaleString(),
        action,
        details,
        actor: role()
    });

    write(
        ML.logKey,
        logs.slice(0, 300)
    );
}

function notify(title, message) {

    const notifications =
        read(ML.noticeKey, []);

    notifications.unshift({
        id: Date.now(),
        title,
        message,
        at: new Date().toLocaleString(),
        read: false
    });

    write(
        ML.noticeKey,
        notifications.slice(0, 100)
    );
}

function initials(name) {

    return String(name || "?")
        .split(/\s+/)
        .map(x => x[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}