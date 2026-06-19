// =============================================
// ðŸ”¹ HARDWARE MONITORING SYSTEM (DB CONNECTED)
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const hardwareSection = document.getElementById("hardware");
  if (!hardwareSection) return;

  // ======================
  // ELEMENT REFERENCES
  // ======================
  const hardwareOnlineCount  = document.getElementById("hardwareOnlineCount");
  const hardwareOfflineCount = document.getElementById("hardwareOfflineCount");
  const hardwareErrorCount   = document.getElementById("hardwareErrorCount");

  const hardwareSearch       = document.getElementById("hardwareSearch");
  const hardwareFilterStatus = document.getElementById("hardwareFilterStatus");
  const hardwareFilterRoom   = document.getElementById("hardwareFilterRoom");

  const hardwareTableBody    = document.getElementById("hardwareTableBody");

  if (!hardwareOnlineCount || !hardwareOfflineCount || !hardwareErrorCount || !hardwareTableBody) {
    console.warn("[Hardware Monitoring] Missing required DOM elements.");
    return;
  }

  // ======================
  // HARDWARE DATA (loaded from DB)
  // ======================
  let hardwareData = [];

  // ======================
  // FILTER STATE
  // ======================
  let searchQuery = "";
  let filterStatus = ""; // "" = All
  let filterRoom = "";   // "" = All

  // ======================
  // UI STATUS BADGE
  // ======================
  function statusBadge(status) {
    const s = (status || "").toLowerCase();
    const colors = {
      online:  "color:#28c76f; font-weight:800;",
      offline: "color:#6c757d; font-weight:800;",
      error:   "color:#ea5455; font-weight:800;"
    };
    const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : "â€”";
    return `<span style="${colors[s] || ""}">${label}</span>`;
  }

  // ======================
  // Small helper (prevents HTML injection)
  // ======================
  function escapeHtml(str) {
    return String(str ?? "â€”").replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m]));
  }

  // ======================
  // RENDER FUNCTION
  // ======================
  function renderHardwareTable() {
    hardwareTableBody.innerHTML = "";

    const q = searchQuery;

    const filtered = hardwareData.filter(d => {
      const matchStatus = !filterStatus || d.status === filterStatus;
      const matchRoom   = !filterRoom || d.room === filterRoom;

      const matchSearch =
        !q ||
        (d.name || "").toLowerCase().includes(q) ||
        (d.type || "").toLowerCase().includes(q) ||
        (d.room || "").toLowerCase().includes(q) ||
        (d.key  || "").toLowerCase().includes(q);

      return matchStatus && matchRoom && matchSearch;
    });

    if (filtered.length === 0) {
      const emptyRow = document.createElement("tr");
      emptyRow.innerHTML = `
        <td colspan="6" style="text-align:center; color:#9aa8b3; font-style:italic;">
          No hardware found
        </td>`;
      hardwareTableBody.appendChild(emptyRow);
      return;
    }

    filtered.forEach((d, index) => {
      const row = document.createElement("tr");
      
      // ✅ Logic: If status is not online, show the error message under the name
      const nameDisplay = d.status !== 'online' && d.error 
        ? `<div>${escapeHtml(d.name)}</div><small style="color:#ea5455;">${escapeHtml(d.error)}</small>`
        : escapeHtml(d.name);
    
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${nameDisplay}</td>
        <td>${escapeHtml(d.type)}</td>
        <td>${statusBadge(d.status)}</td>
        <td>${escapeHtml(d.room)}</td>
        <td>${escapeHtml(d.last)}</td>
      `;
      hardwareTableBody.appendChild(row);
    });
  }

  // ======================
  // âœ… LOAD FROM DB/API
  // expects: { success, counts:{online,offline,error}, data:[...] }
  // data fields: device_key, device_label, device_type, monitor_status, room_code, last_active
  // ======================
  async function loadHardwareMonitoring() {
  try {
    const baseUrl = window.location.origin;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // âœ… Target live clean endpoints
    await fetch(`${cleanBase}/api/hwmon_mark_offline?timeout=45`, { cache: "no-store" });

    const res = await fetch(`${cleanBase}/api/hwmon_get_devices`, { cache: "no-store" });
    const json = await res.json();

    if (!res.ok || !json.success) {
      console.warn("[hwmon_get_devices] Failed:", json.error || json);
      return;
    }

    hardwareOnlineCount.textContent  = json.counts?.online  ?? 0;
    hardwareOfflineCount.textContent = json.counts?.offline ?? 0;
    hardwareErrorCount.textContent   = json.counts?.error   ?? 0;

    const rows = Array.isArray(json.data) ? json.data : [];
    hardwareData = rows.map(r => {
      // âœ… last_active is already "last ON time" because heartbeat updates it only when ONLINE
      const last = r.last_active ? new Date(r.last_active).toLocaleString() : "â€”";
      return {
        key:    (r.device_key || ""),
        name:   (r.device_label || r.device_key || "—"),
        type:   (r.device_type || "—"),
        // ✅ Ensure we capture 'offline' or 'error' correctly
        status: (r.monitor_status || "offline").toLowerCase(), 
        // ✅ NEW: Capture the error message from the ESP8266
        error:  (r.last_error || ""), 
        room:   (r.room_code || "—"),
        last:   last
      };
    });

    renderHardwareTable();
  } catch (err) {
    console.error("Hardware monitoring fetch error:", err);
  }
}


  // ======================
  // FILTER HANDLERS
  // ======================
  hardwareSearch.addEventListener("input", () => {
    searchQuery = hardwareSearch.value.toLowerCase().trim();
    renderHardwareTable();
  });

  hardwareFilterStatus.addEventListener("change", () => {
    filterStatus = hardwareFilterStatus.value; // "", "online", "offline", "error"
    renderHardwareTable();
  });

  hardwareFilterRoom.addEventListener("change", () => {
    filterRoom = hardwareFilterRoom.value; // "", "A301", "A302"
    renderHardwareTable();
  });

  // ======================
  // AUTO REFRESH
  // ======================
  loadHardwareMonitoring();
  setInterval(loadHardwareMonitoring, 3000);

  // Initial empty state render (optional)
  renderHardwareTable();
});