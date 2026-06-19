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
      <tr class="t-empty-row logs-empty">
        <td colspan="3" class="t-empty-cell">
          <div class="logs-empty-content">
            <i class="fa-solid fa-circle-info"></i>
            <span>No logs yet.</span>
          </div>
        </td>
      </tr>
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
