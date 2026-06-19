// =============================================
// 🔹 SYSTEM LOGS (Global logger for all modules)
//    Used by:
//      - addSystemLog("Teacher/Admin Staff/Maintenance/Admin", event, detail)
//      - Auto-capture common UI actions (clicks/submits) in key sections
// =============================================

let logsTableBody = null;
let clearLogsBtn = null;

const LOGS_EMPTY_ROW_CLASS = "logs-empty-row";
const LOGS_STORAGE_KEY = "systemLogs";

// ✅ Keep logs from growing forever
const MAX_LOGS = 300;

// ✅ Prevent spam/duplicates (same role+event+detail quickly)
const DUP_THROTTLE_MS = 800;
let _lastLogSig = "";
let _lastLogAt = 0;

// Try to show toast using any available toast function
function showLogsToast(message, type = "success") {
  if (typeof showAdminStaffToast === "function") {
    showAdminStaffToast(message, type);
  } else if (typeof showMaintenanceToast === "function") {
    showMaintenanceToast(message, type);
  } else if (typeof showToast === "function") {
    // teacher toast
    showToast(message, type);
  } else {
    console.log(`[SYSTEM LOGS][${type}] ${message}`);
  }
}

// =============================================
// INIT
// =============================================
function initSystemLogs() {
  const logsSection = document.querySelector("#systemlogs");
  if (!logsSection) return;

  logsTableBody = logsSection.querySelector(".logs-table tbody");
  clearLogsBtn = logsSection.querySelector(".lbtn-clear");

  if (!logsTableBody) return;

  // Load existing logs from localStorage
  loadAllLogs();
  refreshEmptyStateRow();

  if (clearLogsBtn) {
    clearLogsBtn.addEventListener("click", handleClearLogsClick);
  }
}

document.addEventListener("DOMContentLoaded", initSystemLogs);

// =============================================
// CLEAR ALL LOGS (with confirmation popup)
// =============================================
function handleClearLogsClick() {
  const confirmBox = document.createElement("div");
  confirmBox.className = "logs-confirm-box";

  confirmBox.innerHTML = `
    <div class="logs-confirm-content">
      <h3><i class="fa-solid fa-circle-exclamation"></i> Clear All Logs?</h3>
      <p>This action cannot be undone.</p>

      <div class="logs-confirm-actions">
        <button class="lbtn-confirm-yes">
          <i class="fa-solid fa-trash"></i> Yes, Clear
        </button>
        <button class="lbtn-confirm-no">
          <i class="fa-solid fa-xmark"></i> Cancel
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(confirmBox);

  const btnNo = confirmBox.querySelector(".lbtn-confirm-no");
  const btnYes = confirmBox.querySelector(".lbtn-confirm-yes");

  if (btnNo) {
    btnNo.addEventListener("click", () => {
      confirmBox.classList.add("hide-confirm");
      setTimeout(() => confirmBox.remove(), 250);
    });
  }

  if (btnYes) {
    btnYes.addEventListener("click", () => {
      localStorage.removeItem(LOGS_STORAGE_KEY);
      if (logsTableBody) logsTableBody.innerHTML = "";

      refreshEmptyStateRow();
      showLogsToast("All system logs cleared.", "success");

      confirmBox.classList.add("hide-confirm");
      setTimeout(() => confirmBox.remove(), 250);
    });
  }
}

// =============================================
// EMPTY STATE HANDLER
// =============================================
function refreshEmptyStateRow() {
  if (!logsTableBody) return;

  const realRows = logsTableBody.querySelectorAll(`tr:not(.${LOGS_EMPTY_ROW_CLASS})`);
  let emptyRow = logsTableBody.querySelector(`tr.${LOGS_EMPTY_ROW_CLASS}`);

  if (realRows.length === 0) {
    if (!emptyRow) {
      emptyRow = document.createElement("tr");
      emptyRow.className = LOGS_EMPTY_ROW_CLASS;
      emptyRow.innerHTML = `
        <td colspan="3" class="t-empty-cell">
          <div class="t-empty-center">No logs yet.</div>
        </td>
      `;
      logsTableBody.appendChild(emptyRow);
    }
  } else if (emptyRow) {
    emptyRow.remove();
  }
}

// =============================================
// TIMESTAMP FORMATTER
// =============================================
function getTimestamp() {
  const now = new Date();

  const date = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${date} • ${time}`;
}

// =============================================
// STORAGE HELPERS (with MAX_LOGS cap)
// =============================================
function saveLogToStorage(log) {
  const logs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY)) || [];
  logs.push(log);

  // ✅ Keep only latest MAX_LOGS
  if (logs.length > MAX_LOGS) {
    logs.splice(0, logs.length - MAX_LOGS);
  }

  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
}

function loadAllLogs() {
  const logs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY)) || [];
  logsTableBody.innerHTML = "";

  // Newest first
  logs
    .slice()
    .reverse()
    .forEach((log) => appendLogToTable(log));

  refreshEmptyStateRow();
}

// =============================================
// SAFE TEXT HELPERS (avoid HTML injection)
// =============================================
function safeText(v) {
  if (v == null) return "";
  return String(v);
}

function normalizeRoleClass(role) {
  return safeText(role)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

// =============================================
// TABLE RENDERER (SAFE: uses textContent)
// =============================================
function appendLogToTable(log, options = {}) {
  if (!logsTableBody) return;

  const tr = document.createElement("tr");

  const tdRole = document.createElement("td");
  tdRole.className = "col-role";
  tdRole.textContent = safeText(log.role);

  // helper class like role-teacher, role-admin-staff, etc.
  const normalized = normalizeRoleClass(log.role);
  if (normalized) tdRole.classList.add(`role-${normalized}`);

  const tdEvent = document.createElement("td");
  tdEvent.className = "col-event";

  const eventText = document.createElement("div");
  eventText.textContent = safeText(log.event);

  const timeText = document.createElement("span");
  timeText.className = "log-time";
  timeText.textContent = safeText(log.timestamp);

  tdEvent.appendChild(eventText);
  tdEvent.appendChild(document.createElement("br"));
  tdEvent.appendChild(timeText);

  const tdDetail = document.createElement("td");
  tdDetail.className = "col-detail";
  tdDetail.textContent = safeText(log.detail);

  tr.appendChild(tdRole);
  tr.appendChild(tdEvent);
  tr.appendChild(tdDetail);

  if (options.prepend) logsTableBody.prepend(tr);
  else logsTableBody.appendChild(tr);
}

// =============================================
// SMALL HELPER TO KEEP LOG LIST ON TOP
// =============================================
function scrollLogsToTop() {
  if (!logsTableBody) return;

  const wrapper =
    logsTableBody.closest(".logs-table-wrapper") || logsTableBody.parentElement;

  if (wrapper && typeof wrapper.scrollTop === "number") {
    wrapper.scrollTop = 0;
  }
}

// =============================================
// MAIN LOGGER (called by other modules)
// =============================================
function addSystemLog(role, event, detail) {
  const timestamp = getTimestamp();

  const r = safeText(role).trim();
  const e = safeText(event).trim();
  const d = safeText(detail).trim();

  // ✅ anti-duplicate throttle
  const sig = `${r}||${e}||${d}`;
  const now = Date.now();
  if (sig === _lastLogSig && now - _lastLogAt < DUP_THROTTLE_MS) return;
  _lastLogSig = sig;
  _lastLogAt = now;

  const newLog = { role: r || "System", event: e || "Activity", detail: d, timestamp };

  saveLogToStorage(newLog);

  // Render in UI (prepend newest on top)
  if (logsTableBody) {
    appendLogToTable(newLog, { prepend: true });
    refreshEmptyStateRow();
    scrollLogsToTop();
  }
}

// Expose globally so other JS files can call it
window.addSystemLog = addSystemLog;

// =============================================
// OPTIONAL: SIMPLE ANALYTICS FOR LOGS
// Usage:
//   const stats = window.getSystemLogsAnalytics();
//   stats.total, stats.byRole["Teacher"], stats.byEvent["Added"], etc.
// =============================================
window.getSystemLogsAnalytics = function () {
  const logs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY)) || [];

  const stats = { total: logs.length, byRole: {}, byEvent: {} };

  logs.forEach((log) => {
    if (log.role) stats.byRole[log.role] = (stats.byRole[log.role] || 0) + 1;
    if (log.event) stats.byEvent[log.event] = (stats.byEvent[log.event] || 0) + 1;
  });

  return stats;
};

// =============================================
// 🔹 PROFILE ACTIVITY LOGGING (Full name + avatar)
// Hooks into existing profile.js elements.
// =============================================
function initProfileActivityLogging() {
  const profileNameEl = document.getElementById("profileName");
  const mainAvatar = document.querySelector(".profile-avatar");
  const editForm = document.getElementById("editProfileForm");
  const nameInput = document.getElementById("editName");
  const avatarInput = document.getElementById("editAvatarInput");

  if (!profileNameEl && !editForm && !avatarInput) return;

  let lastSavedName = profileNameEl ? profileNameEl.textContent.trim() : "";
  let lastAvatarSrc = mainAvatar ? mainAvatar.src : "";

  if (editForm) {
    editForm.addEventListener("submit", () => {
      const newName = nameInput ? nameInput.value.trim() : "";

      // Log name change
      if (newName && newName !== lastSavedName) {
        addSystemLog(
          "Admin",
          "Profile Updated",
          `Full name changed from "${lastSavedName || "(empty)"}" to "${newName}".`
        );
        lastSavedName = newName;
      }

      // Log avatar change AFTER profile.js updates mainAvatar.src
      if (mainAvatar) {
        setTimeout(() => {
          const currentSrc = mainAvatar.src;
          if (currentSrc && currentSrc !== lastAvatarSrc) {
            addSystemLog("Admin", "Profile Updated", "Profile avatar was changed.");
            lastAvatarSrc = currentSrc;
          }
        }, 0);
      }
    });
  }

  // Optional: log when a new avatar file is selected (before saving)
  if (avatarInput) {
    avatarInput.addEventListener("change", function () {
      if (this.files && this.files[0]) {
        addSystemLog("Admin", "Avatar Selected", `New avatar selected: ${this.files[0].name}`);
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", initProfileActivityLogging);

// =============================================
// ✅ AUTO CAPTURE ACTIVITY (no need to edit other JS files)
// Captures common clicks/submits in these sections:
//  - #adminstaffaccounts
//  - #maintenanceaccounts
//  - #teachersaccounts
//  - profile actions/modals
// =============================================
function initAutoActivityCapture() {
  // capture button clicks
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const adminStaffSec = btn.closest("#adminstaffaccounts");
    const maintSec = btn.closest("#maintenanceaccounts");
    const teacherSec = btn.closest("#teachersaccounts");
    const profileSec = btn.closest("#profile") || btn.closest("#editProfileModal") || btn.closest("#changePasswordModal");

    let role = "";
    if (adminStaffSec) role = "Admin Staff";
    else if (maintSec) role = "Maintenance";
    else if (teacherSec) role = "Teacher";
    else if (profileSec) role = "Admin";
    else return; // outside monitored areas

    // identify action
    const cls = btn.className || "";
    const label = (btn.querySelector("span")?.textContent || btn.textContent || "").trim();

    // avoid logging tiny icon-only clicks with no label
    const prettyLabel = label || (btn.getAttribute("aria-label") || "").trim() || "Button";

    // map known actions (edit/delete)
    let event = "UI Click";
    if (cls.includes("mtag-edit")) event = "Edit Click";
    else if (cls.includes("mtag-delete")) event = "Delete Click";
    else if (cls.includes("mbtn-clear") || cls.includes("tbtn-clear")) event = "Clear Click";
    else if (btn.type === "submit") event = "Submit Click";

    addSystemLog(role, event, `${prettyLabel}${btn.id ? ` (id: ${btn.id})` : ""}`);
  });

  // capture form submissions (extra safety)
  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;

    const adminStaffSec = form.closest("#adminstaffaccounts");
    const maintSec = form.closest("#maintenanceaccounts");
    const teacherSec = form.closest("#teachersaccounts");
    const profileSec = form.closest("#editProfileModal") || form.closest("#changePasswordModal") || form.closest("#profile");

    let role = "";
    if (adminStaffSec) role = "Admin Staff";
    else if (maintSec) role = "Maintenance";
    else if (teacherSec) role = "Teacher";
    else if (profileSec) role = "Admin";
    else return;

    addSystemLog(role, "Form Submitted", form.id ? `Form: ${form.id}` : "Form submitted");
  });
}

document.addEventListener("DOMContentLoaded", initAutoActivityCapture);
