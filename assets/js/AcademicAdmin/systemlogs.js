// =============================================
// 🔹 SYSTEM LOGS (Global logger for all modules)
//    Used by:
//      - logTeacherEvent("Added/Updated/Deleted", "...")
//      - logAdminStaffEvent("Added/Updated/Deleted", "...")
//      - logMaintenanceEvent("Added/Updated/Deleted", "...")
// =============================================

let logsTableBody = null;
let clearLogsBtn  = null;

const LOGS_EMPTY_ROW_CLASS = "logs-empty-row";
const LOGS_STORAGE_KEY     = "systemLogs";

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
    // fallback to console
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
  clearLogsBtn  = logsSection.querySelector(".lbtn-clear");

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

  const btnNo  = confirmBox.querySelector(".lbtn-confirm-no");
  const btnYes = confirmBox.querySelector(".lbtn-confirm-yes");

  if (btnNo) {
    btnNo.addEventListener("click", () => {
      confirmBox.classList.add("hide-confirm");
      setTimeout(() => confirmBox.remove(), 250);
    });
  }

  if (btnYes) {
    btnYes.addEventListener("click", () => {
      // Clear from storage & table
      localStorage.removeItem(LOGS_STORAGE_KEY);
      if (logsTableBody) {
        logsTableBody.innerHTML = "";
      }

      // Re-check empty state after clearing everything
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
  let emptyRow   = logsTableBody.querySelector(`tr.${LOGS_EMPTY_ROW_CLASS}`);

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
    year: "numeric"
  });

  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${date} • ${time}`;
}

// =============================================
// MAIN LOGGER (called by other modules)
// =============================================
function addSystemLog(role, event, detail) {
  const timestamp = getTimestamp();
  const newLog = { role, event, detail, timestamp };

  // Save to localStorage
  saveLogToStorage(newLog);

  // Render in UI (prepend newest on top)
  if (logsTableBody) {
    appendLogToTable(newLog, { prepend: true });
    refreshEmptyStateRow();

    // 🔹 NEW: always keep view at top when newest log arrives
    scrollLogsToTop();
  }
}

// Expose globally so other JS files can call it
window.addSystemLog = addSystemLog;

// =============================================
// TABLE RENDERER
// =============================================
function appendLogToTable(log, options = {}) {
  if (!logsTableBody) return;

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="col-role">${log.role}</td>
    <td class="col-event">
      ${log.event}
      <br><span class="log-time">${log.timestamp}</span>
    </td>
    <td class="col-detail">${log.detail}</td>
  `;

  // 🔹 NEW: add role-based helper class (e.g. role-teacher, role-admin-staff, role-profile)
  const roleCell = tr.querySelector(".col-role");
  if (roleCell && log.role) {
    const normalized = String(log.role)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
    roleCell.classList.add(`role-${normalized}`);
  }

  if (options.prepend) {
    logsTableBody.prepend(tr);
  } else {
    logsTableBody.appendChild(tr);
  }
}

// =============================================
// LOCALSTORAGE HELPERS
// =============================================
function saveLogToStorage(log) {
  const logs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY)) || [];
  logs.push(log);
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
// OPTIONAL: SIMPLE ANALYTICS FOR LOGS
// Usage:
//   const stats = window.getSystemLogsAnalytics();
//   stats.total, stats.byRole["Teacher"], stats.byEvent["Added"], etc.
// =============================================
window.getSystemLogsAnalytics = function () {
  const logs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY)) || [];

  const stats = {
    total: logs.length,
    byRole: {},
    byEvent: {}
  };

  logs.forEach((log) => {
    if (log.role) {
      stats.byRole[log.role] = (stats.byRole[log.role] || 0) + 1;
    }
    if (log.event) {
      stats.byEvent[log.event] = (stats.byEvent[log.event] || 0) + 1;
    }
  });

  return stats;
};

// =============================================
// 🔹 NEW: PROFILE ACTIVITY LOGGING (Full name + avatar)
// =============================================
// This hooks into the existing profile.js elements:
//   - #editProfileForm
//   - #editName
//   - #profileName
//   - .profile-avatar
//   - #editAvatarInput
// and writes logs via addSystemLog("Admin", ...)

// Small helper to avoid duplicate profile logs in this session
let lastProfileLogSignature = null;
function logProfileChange(actor, action, details) {
  const sig = `${actor}::${action}::${details}`;
  if (sig === lastProfileLogSignature) {
    // same exact log already recorded, skip
    return;
  }
  lastProfileLogSignature = sig;

  if (typeof addSystemLog === "function") {
    addSystemLog(actor, action, details);
  } else {
    console.log(`[SYSTEM LOG][${actor}] ${action} - ${details}`);
  }
}

function initProfileActivityLogging() {
  const profileNameEl     = document.getElementById("profileName");
  const profileEmailEl    = document.getElementById("profileEmail");
  const profileUsernameEl = document.getElementById("profileUsername");
  const mainAvatar        = document.querySelector(".profile-avatar");

  const editForm          = document.getElementById("editProfileForm");
  const nameInput         = document.getElementById("editName");
  const emailInput        = document.getElementById("editEmail");
  const usernameInput     = document.getElementById("editUsername");

  // 🔒 Prevent multiple bindings (avoids duplicate logs on each submit)
  if (!editForm || editForm.dataset.logsBound === "1") return;
  editForm.dataset.logsBound = "1";

  // 🔹 Initial values from the profile header
  let lastSavedName     = profileNameEl?.textContent.trim() || "";
  let lastSavedEmail    = profileEmailEl?.textContent.trim() || "";
  let lastSavedUsername = profileUsernameEl?.textContent.trim() || "";
  let lastAvatarSrc     = mainAvatar?.src || "";

  editForm.addEventListener("submit", () => {
    const actor = "Admin";

    const newName     = nameInput?.value.trim()     || "";
    const newEmail    = emailInput?.value.trim()    || "";
    const newUsername = usernameInput?.value.trim() || "";

    let nameUpdated = false;
    let emailUpdated = false;
    let usernameUpdated = false;

    let nameDetail = "";
    let emailDetail = "";
    let usernameDetail = "";

    // 1️⃣ Detect name change (highest priority)
    if (newName && newName !== lastSavedName) {
      nameUpdated = true;
      nameDetail = `Name: "${lastSavedName || '(empty)'}" → "${newName}"`;
      lastSavedName = newName;
    }

    // 2️⃣ Detect email change
    if (newEmail && newEmail !== lastSavedEmail) {
      emailUpdated = true;
      emailDetail = `Email: "${lastSavedEmail || '(empty)'}" → "${newEmail}"`;
      lastSavedEmail = newEmail;
    }

    // 3️⃣ Detect username change
    if (newUsername && newUsername !== lastSavedUsername) {
      usernameUpdated = true;
      usernameDetail = `Username: "${lastSavedUsername || '(empty)'}" → "${newUsername}"`;
      lastSavedUsername = newUsername;
    }

    const prevAvatarSrc = lastAvatarSrc;

    // 4️⃣ Avatar is checked after DOM updates
    setTimeout(() => {
      let avatarUpdated = false;

      if (mainAvatar && mainAvatar.src && mainAvatar.src !== prevAvatarSrc) {
        avatarUpdated = true;
        lastAvatarSrc = mainAvatar.src;
      }

      // 🎯 Priority:
      // 1) Name
      // 2) Email
      // 3) Username
      // 4) Avatar
      let detailText = "";

      if (nameUpdated) {
        // If fullname changed → ONLY show fullname change
        detailText = nameDetail;
      } else if (emailUpdated) {
        // If email changed (and name didn't) → ONLY email
        detailText = emailDetail;
      } else if (usernameUpdated) {
        // If username changed (and name/email didn't) → ONLY username
        detailText = usernameDetail;
      } else if (avatarUpdated) {
        // If only avatar changed → show only avatar
        detailText = "Avatar: updated";
      } else {
        // Nothing changed → don't log
        return;
      }

      if (typeof addSystemLog === "function") {
        addSystemLog(actor, "Profile Updated", detailText);
      } else {
        console.log(`[SYSTEM LOG][${actor}] Profile Updated - ${detailText}`);
      }
    }, 0);
  });
}

document.addEventListener("DOMContentLoaded", initProfileActivityLogging);

// =============================================
// 🔹 SMALL HELPER TO KEEP LOG LIST ON TOP
// =============================================
function scrollLogsToTop() {
  if (!logsTableBody) return;

  // Prefer a wrapper with its own scroll, fallback to tbody parent
  const wrapper =
    logsTableBody.closest(".logs-table-wrapper") ||
    logsTableBody.parentElement;

  if (wrapper && typeof wrapper.scrollTop === "number") {
    wrapper.scrollTop = 0;
  }
}

/* =====================================================================
   ✅ ADDED ONLY (DO NOT REMOVE ANYTHING ABOVE)
   AUTO-ACTIVITY LOGGING FOR OTHER MODULES (Schedule, Attendance, etc.)
   - Logs common actions by intercepting fetch + listening to events
   - Safe guards to avoid double wrapping
===================================================================== */

// 🔒 Prevent duplicate auto-logs (session-level)
window.__KLASECO_LOG_DEDUP = window.__KLASECO_LOG_DEDUP || new Set();

function autoLogOnce(role, event, detail) {
  const sig = `${role}::${event}::${detail}`;
  if (window.__KLASECO_LOG_DEDUP.has(sig)) return;
  window.__KLASECO_LOG_DEDUP.add(sig);

  if (typeof window.addSystemLog === "function") {
    window.addSystemLog(role, event, detail);
  } else {
    console.log(`[AUTO LOG][${role}] ${event} - ${detail}`);
  }
}

// ✅ Expose helper for other scripts if you want to call it
window.autoLogOnce = autoLogOnce;

// =====================================================
// ✅ 1) Listen to schedule changes (your schedule.js emits this)
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("schedule-changed", () => {
    autoLogOnce("Schedule", "Updated", "Class schedule list was refreshed/changed.");
  });
});

// =====================================================
// ✅ 2) Attendance export attempt logging (attendance.js does not log)
// =====================================================
document.addEventListener("click", (e) => {
  const btn = e.target.closest("#attendance .btn-export");
  if (!btn) return;

  // Log attempt only (export may fail; attendance.js shows toast for result)
  autoLogOnce("Attendance", "Export Attempt", "User attempted to export visible attendance rows to CSV.");
}, true);

// =====================================================
// ✅ 3) Fetch Interceptor: log key API actions automatically
//     - schedule_create.php
//     - schedule_delete.php
//     - schedule_list.php (optional)
//     - teachers_list.php (optional)
// =====================================================
(function wrapFetchForAutoLogs() {
  if (window.__KLASECO_FETCH_WRAPPED === true) return;
  if (typeof window.fetch !== "function") return;

  window.__KLASECO_FETCH_WRAPPED = true;
  window.__KLASECO_FETCH_ORIG = window.__KLASECO_FETCH_ORIG || window.fetch;

  function parseBodyToObject(body) {
    try {
      if (!body) return null;

      // URLSearchParams instance
      if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
        const obj = {};
        body.forEach((v, k) => obj[k] = v);
        return obj;
      }

      // x-www-form-urlencoded string
      if (typeof body === "string" && body.includes("=")) {
        const sp = new URLSearchParams(body);
        const obj = {};
        sp.forEach((v, k) => obj[k] = v);
        return obj;
      }

      // JSON string
      if (typeof body === "string" && (body.startsWith("{") || body.startsWith("["))) {
        return JSON.parse(body);
      }

      return null;
    } catch {
      return null;
    }
  }

  window.fetch = async function (input, init = {}) {
    const url = typeof input === "string" ? input : (input && input.url) ? input.url : "";
    const method = (init && init.method ? String(init.method) : "GET").toUpperCase();

    // Pass through first
    let res;
    try {
      res = await window.__KLASECO_FETCH_ORIG(input, init);
    } catch (err) {
      // Network-level failure
      if (url.includes("api/schedule_create.php")) {
        autoLogOnce("Schedule", "Create Failed", "Network error while creating schedule.");
      } else if (url.includes("api/schedule_delete.php")) {
        autoLogOnce("Schedule", "Delete Failed", "Network error while deleting schedule.");
      }
      throw err;
    }

    // Only log for our known endpoints
    const isCreate = url.includes("api/schedule_create.php");
    const isDelete = url.includes("api/schedule_delete.php");
    const isList   = url.includes("api/schedule_list.php");
    const isTeach  = url.includes("api/teachers_list.php");

    if (!isCreate && !isDelete && !isList && !isTeach) return res;

    // Try read JSON safely
    let data = null;
    try {
      const clone = res.clone();
      data = await clone.json().catch(() => null);
    } catch {
      data = null;
    }

    // Build details from body if possible
    const payload = parseBodyToObject(init && init.body);

    // Schedule CREATE
    if (isCreate && method === "POST") {
      if (res.ok && data && data.ok === true) {
        const teacher = payload?.teacher_name ? `Teacher: ${payload.teacher_name}` : "Teacher: (unknown)";
        const subject = payload?.subject_code ? `Subject: ${payload.subject_code}` : "Subject: (—)";
        const room    = payload?.room ? `Room: ${payload.room}` : "Room: (—)";
        autoLogOnce("Schedule", "Created", `${teacher} • ${subject} • ${room}`);
      } else {
        const msg = data?.msg || data?.error || "Unknown error";
        autoLogOnce("Schedule", "Create Failed", String(msg));
      }
      return res;
    }

    // Schedule DELETE
    if (isDelete && method === "POST") {
      if (res.ok && data && data.ok === true) {
        const id = payload?.id ? `ID: ${payload.id}` : "ID: (unknown)";
        autoLogOnce("Schedule", "Deleted", id);
      } else {
        const msg = data?.msg || data?.error || "Unknown error";
        autoLogOnce("Schedule", "Delete Failed", String(msg));
      }
      return res;
    }

    // Schedule LIST (optional — keep light, no spam)
    if (isList && method === "GET") {
      // Only log if the UI is open (prevents noise)
      const scheduleSection = document.querySelector("#schedule");
      if (scheduleSection) {
        if (res.ok && data && data.ok === true) {
          const count = Array.isArray(data.rows) ? data.rows.length : 0;
          autoLogOnce("Schedule", "Loaded", `Fetched ${count} schedule row(s).`);
        } else {
          const msg = data?.msg || data?.error || "Unable to load schedule list.";
          autoLogOnce("Schedule", "Load Failed", String(msg));
        }
      }
      return res;
    }

    // Teachers LIST (optional — keep light, no spam)
    if (isTeach && method === "GET") {
      const teacherSection =
        document.querySelector("#teachersaccounts") ||
        document.getElementById("teacherAccountNamesBody");

      if (teacherSection) {
        if (res.ok && data && data.ok === true) {
          const count = Array.isArray(data.rows) ? data.rows.length : 0;
          autoLogOnce("Teacher Accounts", "Loaded", `Fetched ${count} teacher account(s).`);
        } else {
          const msg = data?.msg || data?.error || "Unable to load teacher accounts.";
          autoLogOnce("Teacher Accounts", "Load Failed", String(msg));
        }
      }
      return res;
    }

    return res;
  };
})();
