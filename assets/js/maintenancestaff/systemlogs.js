// =============================================
// 🔹 SYSTEM LOGS (Global logger for all modules)
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

  saveLogToStorage(newLog);

  if (logsTableBody) {
    appendLogToTable(newLog, { prepend: true });
    refreshEmptyStateRow();
    scrollLogsToTop();
  }
}

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

  const roleCell = tr.querySelector(".col-role");
  if (roleCell && log.role) {
    const normalized = String(log.role)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
    roleCell.classList.add(`role-${normalized}`);
  }

  if (options.prepend) logsTableBody.prepend(tr);
  else logsTableBody.appendChild(tr);
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

  logs.slice().reverse().forEach((log) => appendLogToTable(log));
  refreshEmptyStateRow();
}

// =============================================
// OPTIONAL ANALYTICS
// =============================================
window.getSystemLogsAnalytics = function () {
  const logs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY)) || [];

  const stats = { total: logs.length, byRole: {}, byEvent: {} };

  logs.forEach((log) => {
    if (log.role)  stats.byRole[log.role] = (stats.byRole[log.role] || 0) + 1;
    if (log.event) stats.byEvent[log.event] = (stats.byEvent[log.event] || 0) + 1;
  });

  return stats;
};

// =============================================
// 🔹 HELPER: CURRENT ACTOR (reads from profile UI)
// =============================================
function getCurrentActor() {
  const role = document.getElementById("profileRole")?.textContent?.trim();
  const name = document.getElementById("profileName")?.textContent?.trim();

  // Prefer "Role - Name" if available
  if (role && name) return `${role} - ${name}`;
  if (role) return role;
  if (name) return name;

  // fallback (safe)
  return "User";
}

// =============================================
// 🔹 PROFILE ACTIVITY LOGGING (Profile Updated + Password Changed)
// =============================================
let lastProfileLogSignature = null;
function logProfileChange(actor, action, details) {
  const sig = `${actor}::${action}::${details}`;
  if (sig === lastProfileLogSignature) return;
  lastProfileLogSignature = sig;

  if (typeof addSystemLog === "function") addSystemLog(actor, action, details);
  else console.log(`[SYSTEM LOG][${actor}] ${action} - ${details}`);
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

  const changePasswordForm = document.getElementById("changePasswordForm");
  const newPasswordInput   = document.getElementById("newPassword");

  // 🔒 prevent multiple bindings
  if (editForm && editForm.dataset.logsBound !== "1") {
    editForm.dataset.logsBound = "1";

    let lastSavedName     = profileNameEl?.textContent.trim() || "";
    let lastSavedEmail    = profileEmailEl?.textContent.trim() || "";
    let lastSavedUsername = profileUsernameEl?.textContent.trim() || "";
    let lastAvatarSrc     = mainAvatar?.src || "";

    editForm.addEventListener("submit", () => {
      const actor = getCurrentActor();

      const newName     = nameInput?.value.trim()     || "";
      const newEmail    = emailInput?.value.trim()    || "";
      const newUsername = usernameInput?.value.trim() || "";

      let nameUpdated = false, emailUpdated = false, usernameUpdated = false;
      let nameDetail = "", emailDetail = "", usernameDetail = "";

      if (newName && newName !== lastSavedName) {
        nameUpdated = true;
        nameDetail = `Name: "${lastSavedName || '(empty)'}" → "${newName}"`;
        lastSavedName = newName;
      }

      if (newEmail && newEmail !== lastSavedEmail) {
        emailUpdated = true;
        emailDetail = `Email: "${lastSavedEmail || '(empty)'}" → "${newEmail}"`;
        lastSavedEmail = newEmail;
      }

      if (newUsername && newUsername !== lastSavedUsername) {
        usernameUpdated = true;
        usernameDetail = `Username: "${lastSavedUsername || '(empty)'}" → "${newUsername}"`;
        lastSavedUsername = newUsername;
      }

      const prevAvatarSrc = lastAvatarSrc;

      // wait for DOM update from profile.js
      setTimeout(() => {
        let avatarUpdated = false;
        if (mainAvatar && mainAvatar.src && mainAvatar.src !== prevAvatarSrc) {
          avatarUpdated = true;
          lastAvatarSrc = mainAvatar.src;
        }

        let detailText = "";
        if (nameUpdated) detailText = nameDetail;
        else if (emailUpdated) detailText = emailDetail;
        else if (usernameUpdated) detailText = usernameDetail;
        else if (avatarUpdated) detailText = "Avatar: updated";
        else return;

        addSystemLog(actor, "Profile Updated", detailText);
      }, 0);
    });
  }

  // Password change logging (client-side only)
  if (changePasswordForm && changePasswordForm.dataset.logsBound !== "1") {
    changePasswordForm.dataset.logsBound = "1";

    changePasswordForm.addEventListener("submit", () => {
      const actor = getCurrentActor();

      // Only log if user actually tried to set a new password
      const np = newPasswordInput?.value || "";
      if (np.trim()) {
        addSystemLog(actor, "Password Change محاولة", "Password change submitted");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", initProfileActivityLogging);

// =============================================
// 🔹 MAINTENANCE STAFF ACTIVITY LOGGING (AUTO via fetch interceptor)
//    Tracks maintenancerequest.js endpoints WITHOUT editing that file
// =============================================
(function interceptFetchForMaintenanceLogs(){
  // Avoid patching twice
  if (window.__systemLogsFetchPatched === true) return;
  window.__systemLogsFetchPatched = true;

  const originalFetch = window.fetch.bind(window);

  // Safely attempt JSON parse
  const tryParseJson = (x) => {
    try { return JSON.parse(x); } catch { return null; }
  };

  // Try read request body (json string) into object
  const tryReadBodyObject = async (options) => {
    if (!options) return null;
    const body = options.body;

    if (!body) return null;

    // JSON string body
    if (typeof body === "string") {
      const obj = tryParseJson(body);
      return obj || null;
    }

    // FormData (proof upload)
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      const out = {};
      for (const [k, v] of body.entries()) {
        // file is object; keep marker
        out[k] = (v && typeof v === "object") ? "[file]" : String(v);
      }
      return out;
    }

    return null;
  };

  // Pull details from open maintenance modal inputs (if present)
  const getMaintenanceModalDetails = () => {
    const issue = document.getElementById("maintIssueTitle")?.value
               || document.getElementById("maintIssueTitle")?.textContent
               || "";
    const room  = document.getElementById("maintRoom")?.value
               || document.getElementById("maintRoom")?.textContent
               || "";
    const id    = document.getElementById("maintReqId")?.value || "";
    const status= document.getElementById("maintStatus")?.value || "";

    const parts = [];
    if (id) parts.push(`ID: ${id}`);
    if (issue) parts.push(`Issue: ${issue}`);
    if (room) parts.push(`Room: ${room}`);
    if (status) parts.push(`Status: ${status}`);

    return parts.join(" | ") || "Maintenance task updated";
  };

  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input?.url || "");
    const method = (init?.method || "GET").toUpperCase();

    // Let the request happen first
    const res = await originalFetch(input, init);

    // Only log when request is relevant and successful JSON {ok:true}
    const isMaintenanceEndpoint =
      /maintenance_tasks_update_staff\.php/i.test(url) ||
      /maintenance_tasks_upload_proof\.php/i.test(url) ||
      /maintenance_tasks_clear_proof_staff\.php/i.test(url);

    if (!isMaintenanceEndpoint) return res;

    // Clone response so we don't consume it
    let json = null;
    try {
      const clone = res.clone();
      json = await clone.json();
    } catch {
      // non-json response; ignore
    }

    if (!json || json.ok !== true) return res;

    const actor = getCurrentActor();
    const bodyObj = await tryReadBodyObject(init);

    // Decide event type
    if (/maintenance_tasks_clear_proof_staff\.php/i.test(url) && method === "POST") {
      addSystemLog(actor, "Proof Removed", getMaintenanceModalDetails());
      return res;
    }

    if (/maintenance_tasks_upload_proof\.php/i.test(url) && method === "POST") {
      addSystemLog(actor, "Proof Uploaded", getMaintenanceModalDetails());
      return res;
    }

    if (/maintenance_tasks_update_staff\.php/i.test(url) && method === "POST") {
      const status = String(bodyObj?.status || "").toLowerCase();
      const isResolved = status.includes("resolved");

      if (isResolved) {
        addSystemLog(actor, "Task Resolved", getMaintenanceModalDetails());
      } else {
        addSystemLog(actor, "Task Updated", getMaintenanceModalDetails());
      }
      return res;
    }

    return res;
  };
})();

// =============================================
// 🔹 SMALL HELPER TO KEEP LOG LIST ON TOP
// =============================================
function scrollLogsToTop() {
  if (!logsTableBody) return;

  const wrapper =
    logsTableBody.closest(".logs-table-wrapper") ||
    logsTableBody.parentElement;

  if (wrapper && typeof wrapper.scrollTop === "number") {
    wrapper.scrollTop = 0;
  }
}
