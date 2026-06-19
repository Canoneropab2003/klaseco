// ==========================================
// ðŸ”” TOAST + LOGGER FOR MAINTENANCE
// ==========================================
function showMaintenanceToast(message, type = "error") {
  const container = document.getElementById("toast-maintenance");
  if (!container) return;

  // ✅ PREVENT MULTIPLE DISPLAY: Check for and remove existing toast immediately
  const existingToast = container.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Auto-remove logic
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.4s ease";
      setTimeout(() => toast.remove(), 400);
    }
  }, 2500);
}

// âœ… ADDED: Loading toast (non-blocking, re-usable)
let maintenanceLoadingToast = null;

function showMaintenanceLoadingToast(message = "Loading...") {
  const container = document.getElementById("toast-maintenance");
  if (!container) return;

  // remove old loading toast (only one at a time)
  if (maintenanceLoadingToast) {
    maintenanceLoadingToast.remove();
    maintenanceLoadingToast = null;
  }

  const toast = document.createElement("div");
  toast.className = "toast loading";
  toast.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>${message}</span>`;

  container.appendChild(toast);
  maintenanceLoadingToast = toast;
}

function hideMaintenanceLoadingToast() {
  if (!maintenanceLoadingToast) return;

  maintenanceLoadingToast.style.opacity = "0";
  maintenanceLoadingToast.style.transition = "opacity 0.3s";

  setTimeout(() => {
    maintenanceLoadingToast?.remove();
    maintenanceLoadingToast = null;
  }, 300);
}

function logMaintenanceEvent(event, detail) {
  if (typeof addSystemLog === "function") {
    addSystemLog("Maintenance", event, detail);
  } else {
    console.log(`[Maintenance][${event}] ${detail}`);
  }
}

// ==========================================
// ðŸ§° KLASECO - Maintenance Accounts (Supabase)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const section = document.getElementById("maintenanceaccounts");
  if (!section) return;

  const form = section.querySelector("#maintenance-form");

  const mFields = {
    id:       section.querySelector("#m-id"),
    name:     section.querySelector("#m-name"),
    role:     section.querySelector("#m-role"),
    email:    section.querySelector("#m-email"),
    phone:    section.querySelector("#m-phone"),    // UI-only (not saved in DB schema)
    username: section.querySelector("#m-username"),
    password: section.querySelector("#m-password"),
  };

  // ðŸ”¹ Populate #m-role <select> with role options via JS
  (function initMaintenanceRoleOptions() {
    const roleEl = mFields.role;
    if (!roleEl) return;

    if (roleEl.tagName && roleEl.tagName.toLowerCase() === "select") {
      const existingOptions = Array.from(roleEl.options);
      if (existingOptions.length > 1) {
        for (let i = existingOptions.length - 1; i >= 1; i--) {
          roleEl.removeChild(existingOptions[i]);
        }
      }

      const roles = ["Maintenance Head", "Maintenance Staff"];

      roles.forEach((role) => {
        const opt = document.createElement("option");
        opt.value = role;
        opt.textContent = role;
        roleEl.appendChild(opt);
      });
    }
  })();

  const addBtnWrapper = section.querySelector(".mbtn-green");
  const addBtnLabel   = addBtnWrapper ? addBtnWrapper.querySelector("span") : null;
  const clearBtn      = section.querySelector(".mbtn-clear");
  const tableBody     = section.querySelector(".m-table tbody");
  const maintenanceCountEl = document.getElementById("overview-maintenance-count");

  const EMPTY_ROW_CLASS = "m-empty-row";

  // Password / strength / toggle
  const passwordInput   = mFields.password;
  const toggleBtn       = section.querySelector(".m-password-toggle");
  const strengthElement = section.querySelector(".m-password-strength");

  // Delete confirmation elements
  const deleteOverlay    = section.querySelector("#maintenance-delete-confirm");
  const confirmNameEl    = section.querySelector("#confirm-maintenance-name");
  const confirmIdEl      = section.querySelector("#confirm-maintenance-id");
  const confirmDeleteBtn = section.querySelector("#m-confirm-delete-btn");
  const confirmCancelBtn = section.querySelector("#m-confirm-cancel-btn");

  let editingRow  = null;
  let editingDbId = null;
  let rowPendingDelete = null;

  // âœ… ADDED: prevent double-save clicks while request is in-flight
  let isSavingMaintenance = false;

  // ===============================
  // Helpers
  // ===============================
  function refreshEmptyStateRow() {
    if (!tableBody) return;

    const realRows = tableBody.querySelectorAll(`tr:not(.${EMPTY_ROW_CLASS})`);
    let emptyRow   = tableBody.querySelector(`tr.${EMPTY_ROW_CLASS}`);

    if (realRows.length === 0) {
      if (!emptyRow) {
        emptyRow = document.createElement("tr");
        emptyRow.className = EMPTY_ROW_CLASS;
        emptyRow.innerHTML = `
          <td colspan="8" class="t-empty-cell">
            <div class="t-empty-center">No maintenance yet.</div>
          </td>
        `;
        tableBody.appendChild(emptyRow);
      }
    } else if (emptyRow) {
      emptyRow.remove();
    }
  }

  function updateRegisteredMaintenanceCount() {
    if (!maintenanceCountEl || !tableBody) return;
    const realRows = tableBody.querySelectorAll(`tr:not(.${EMPTY_ROW_CLASS})`);
    maintenanceCountEl.textContent = realRows.length > 0 ? realRows.length : "â€”";
  }

    function setAddModeLabel() {
    if (addBtnLabel) addBtnLabel.textContent = "Add Maintenance";
    
    // ✅ Ensure password is enabled and required for NEW entries
    if (mFields.password) {
      mFields.password.disabled = false;
      mFields.password.setAttribute("required", "required");
      mFields.password.placeholder = "Enter Password";
      mFields.password.value = "";
      mFields.password.style.opacity = "1";
      mFields.password.style.cursor = "text";
    }
  }

  function setEditModeLabel() {
    if (addBtnLabel) addBtnLabel.textContent = "Update Maintenance";
    
    // ✅ Disable and mask password for UPDATES
    if (mFields.password) {
      mFields.password.value = "********"; 
      mFields.password.disabled = true;
      mFields.password.removeAttribute("required");
      mFields.password.placeholder = "Password locked during edit";
      
      // Visual feedback for locked state
      mFields.password.style.opacity = "0.6";
      mFields.password.style.cursor = "not-allowed";

      // Clear strength meter UI
      if (strengthElement) {
        strengthElement.textContent = "";
        strengthElement.classList.remove("weak", "medium", "strong");
      }
    }
  }

  setAddModeLabel();

function updatePasswordStrength() {
  if (!passwordInput || !strengthElement) return;

  const value = passwordInput.value;
  const len = value.length;

  if (!value || value === "********") {
    strengthElement.textContent = "";
    strengthElement.classList.remove("weak", "medium", "strong");
    return;
  }

  // Real-World Security Criteria
  const hasUpper = /[A-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);

  let label = "";
  let levelClass = "";

  // Logic: Length is the base, but complexity boosts it
  if (len < 6) {
    label = "Very Weak — Too short";
    levelClass = "weak";
  } else if (len < 10 && (!hasUpper || !hasSpecial)) {
    label = "Weak — Add uppercase & symbols";
    levelClass = "weak";
  } else if (len >= 8 && hasUpper && hasNumber && hasSpecial) {
    label = "Strong password";
    levelClass = "strong";
  } else {
    label = "Medium strength password";
    levelClass = "medium";
  }

  strengthElement.textContent = `Length: ${len} — ${label}`;
  strengthElement.classList.remove("weak", "medium", "strong");
  strengthElement.classList.add(levelClass);
  
  strengthElement.dataset.strength = levelClass;
}

  if (passwordInput) {
    passwordInput.addEventListener("input", updatePasswordStrength);
  }

  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";

      const icon = toggleBtn.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-eye");
        icon.classList.toggle("fa-eye-slash");
      }
    });
  }

  function isFormEmpty() {
    return Object.values(mFields).every((field) => field && field.value.trim() === "");
  }

  function clearMaintenanceForm(showToastMsg = true) {
    Object.values(mFields).forEach((field) => {
      if (field) field.value = "";
    });
    editingRow = null;
    editingDbId = null;
    setAddModeLabel();
    updatePasswordStrength();

    if (showToastMsg) {
      showMaintenanceToast("Form cleared.", "success");
    }
  }

    function maskPasswordVisual(len) {
      // Use a standard bullet character or asterisk to avoid encoding glitches like â€¢
      const n = Math.max(0, Number(len) || 8);
      return "•".repeat(n); 
    }

  // Simple duplicate check within loaded table (optional; DB still enforces unique email/username)
  function isMaintenanceDuplicate(field, value) {
    if (!tableBody) return false;

    const val = value.trim();
    if (!val) return false;

    const rows = tableBody.querySelectorAll(`tr:not(.${EMPTY_ROW_CLASS})`);

    for (let row of rows) {
      if (row === editingRow) continue;

      const idCell    = row.querySelector(".col-mid");
      const emailCell = row.querySelector(".col-email .cell-scroll") || row.querySelector(".col-email");
      const userCell  = row.querySelector(".col-user .cell-scroll")  || row.querySelector(".col-user");

      const rowData = {
        id:       idCell    ? idCell.textContent.trim()    : "",
        email:    emailCell ? emailCell.textContent.trim() : "",
        username: userCell  ? userCell.textContent.trim()  : "",
      };

      let rowVal = rowData[field] || "";
      let cmpVal = val;

      if (field === "email" || field === "username") {
        rowVal = rowVal.toLowerCase();
        cmpVal = cmpVal.toLowerCase();
      }

      if (rowVal && cmpVal && rowVal === cmpVal) {
        return true;
      }
    }

    return false;
  }

  // ===============================
  // DB Load: maintenance_list.php
  // ===============================
  function buildRow(row) {
  const tr = document.createElement("tr");
  tr.dataset.dbid = row.id;

  tr.innerHTML = `
    <td class="col-mid">${row.maint_id}</td>
    <td class="col-name"><div class="cell-scroll">${row.name}</div></td>
    <td class="col-email"><div class="cell-scroll">${row.email}</div></td>
    <td class="col-role"><div class="cell-scroll">${row.role}</div></td>
    <td class="col-phone">${row.phone ? row.phone : "â€”"}</td>   <!-- âœ… HERE -->
    <td class="col-user"><div class="cell-scroll">${row.username}</div></td>
    <td class="col-pass">
      <div class="cell-scroll">${maskPasswordVisual(10)}</div>
    </td>
    <td class="col-actions">
      <div class="m-actions">
        <button class="mtag mtag-edit">
          <i class="fa-solid fa-pen"></i><span>Edit</span>
        </button>
        <button class="mtag mtag-delete">
          <i class="fa-solid fa-trash"></i><span>Delete</span>
        </button>
      </div>
    </td>
  `;
  return tr;
}


  async function loadMaintenance() {
    if (!tableBody) return;

    try {
      const res = await fetch(`api/maintenance_list.php?_=${Date.now()}`);
      const data = await res.json();

      tableBody.innerHTML = "";

      if (!data.ok) {
        showMaintenanceToast(data.msg || "Failed to load maintenance accounts.", "error");
        refreshEmptyStateRow();
        updateRegisteredMaintenanceCount();
        return;
      }

      const rows = Array.isArray(data.rows) ? data.rows : [];

      if (rows.length === 0) {
        refreshEmptyStateRow();
        updateRegisteredMaintenanceCount();
        logMaintenanceEvent("DB Load", "No maintenance accounts found.");
        return;
      }

      rows.forEach((r) => {
        tableBody.prepend(buildRow(r));
      });

      refreshEmptyStateRow();
      updateRegisteredMaintenanceCount();
      logMaintenanceEvent("DB Load", `Loaded ${rows.length} maintenance accounts.`);
    } catch (err) {
      console.error(err);
      showMaintenanceToast("Failed to load maintenance accounts.", "error");
      refreshEmptyStateRow();
      updateRegisteredMaintenanceCount();
    }
  }

  // Initial load
  loadMaintenance();

  // ===============================
  // Clear button
  // ===============================
  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.preventDefault();

      if (isFormEmpty()) {
        showMaintenanceToast("Form is already empty.", "error");
        return;
      }

      clearMaintenanceForm(true);
    });
  }

  // ===============================
  // Maintenance ID / name / phone input masks
  // ===============================
  if (mFields.id) {
    mFields.id.addEventListener("input", (e) => {
      let v = e.target.value.replace(/[^0-9]/g, "");
      v = v.slice(0, 9);

      if (v.length > 2 && v.length <= 6) {
        v = v.slice(0, 2) + "-" + v.slice(2);
      } else if (v.length > 6) {
        v = v.slice(0, 2) + "-" + v.slice(2, 6) + "-" + v.slice(6);
      }

      e.target.value = v;
    });
  }

  if (mFields.name) {
    mFields.name.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^A-Za-z\s.'-]/g, "");
    });
  }

  if (mFields.phone) {
    mFields.phone.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, "");
    });
  }

  // ===============================
  // Add / Update (DB save)
  // ===============================
  if (addBtnWrapper) {
    addBtnWrapper.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!form) return;

      // âœ… ADDED: prevent double click while saving
      if (isSavingMaintenance) return;
      isSavingMaintenance = true;

      // On UPDATE, allow empty password (optional)
      const isUpdate = !!editingDbId;
      if (passwordInput) {
        passwordInput.required = !isUpdate;
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        if (passwordInput) passwordInput.required = true;

        // âœ… ADDED: release lock if validation fails
        isSavingMaintenance = false;
        return;
      }
      
      const currentStrength = strengthElement.classList.contains("strong");
      if (!isUpdate && !currentStrength) {
        showMaintenanceToast("Security Requirement: Please use a Strong password.", "error");
        isSavingMaintenance = false;
        passwordInput.focus();
        return;
      }
      
      if (passwordInput) passwordInput.required = true;

      const data = {
        maint_id: mFields.id.value.trim(),
        name:     mFields.name.value.trim(),
        role:     mFields.role.value.trim(),
        email:    mFields.email.value.trim(),
        phone:    mFields.phone.value.trim(), // UI only
        username: mFields.username.value.trim(),
        password: mFields.password.value,
      };

      // Simple client-side duplicate check against current table
      if (!isUpdate) {
        if (isMaintenanceDuplicate("id", data.maint_id)) {
          showMaintenanceToast("Maintenance ID already exists.", "error");
          isSavingMaintenance = false; // âœ… ADDED
          return;
        }
        if (isMaintenanceDuplicate("email", data.email)) {
          showMaintenanceToast("Maintenance email already exists.", "error");
          isSavingMaintenance = false; // âœ… ADDED
          return;
        }
        if (isMaintenanceDuplicate("username", data.username)) {
          showMaintenanceToast("Maintenance username already exists.", "error");
          isSavingMaintenance = false; // âœ… ADDED
          return;
        }
      }

      const fd = new FormData();
      fd.append("id",        editingDbId || "");
      fd.append("maint_id",  data.maint_id);
      fd.append("name",      data.name);
      fd.append("role",      data.role);
      fd.append("email",     data.email);
      fd.append("phone",     data.phone);      
      fd.append("username",  data.username);
      fd.append("password",  data.password || "");

      // âœ… ADDED: loading toast while saving
      showMaintenanceLoadingToast(isUpdate ? "Updating maintenance..." : "Saving maintenance...");

      /* ======================================================
         ðŸš€ FIX FOR LIVE HOSTING: Use absolute clean URL
      ====================================================== */
      const baseUrl = window.location.origin;
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      
      // Target the clean URL to match your .htaccess rules
      const actionUrl = `${cleanBase}/api/maintenance_save`; 

      showMaintenanceLoadingToast(isUpdate ? "Updating maintenance..." : "Saving maintenance...");

      try {
        const res  = await fetch(actionUrl, {
          method: "POST",
          body: fd,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        const json = await res.json();

        if (!json.ok) {
          showMaintenanceToast(json.msg || "Failed to save maintenance account.", "error");
          return;
        }

        showMaintenanceToast(json.msg || (isUpdate ? "Maintenance updated." : "Maintenance added."), "success");
        logMaintenanceEvent(isUpdate ? "Updated" : "Added",
          `${data.name} (ID: ${data.maint_id}) ${isUpdate ? "updated" : "added"}`
        );

        clearMaintenanceForm(false);
        await loadMaintenance();
      } catch (err) {
        console.error(err);
        showMaintenanceToast("Failed to save maintenance account.", "error");
      } finally {
        hideMaintenanceLoadingToast();
        isSavingMaintenance = false;
      }
    });
  }

  // ===============================
  // Edit / Delete (open modal)
  // ===============================
  if (tableBody) {
    tableBody.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const row = btn.closest("tr");
      if (!row || row.classList.contains(EMPTY_ROW_CLASS)) return;

    // EDIT
      if (btn.classList.contains("mtag-edit")) {
        editingRow  = row;
        editingDbId = row.dataset.dbid || null;

        // Scoped selectors for cells
        const nameCellEl  = row.querySelector(".col-name .cell-scroll")  || row.querySelector(".col-name");
        const emailCellEl = row.querySelector(".col-email .cell-scroll") || row.querySelector(".col-email");
        const roleCellEl  = row.querySelector(".col-role .cell-scroll")  || row.querySelector(".col-role");
        const userCellEl  = row.querySelector(".col-user .cell-scroll")  || row.querySelector(".col-user");
        const phoneCellEl = row.querySelector(".col-phone");

        // Map table data to form fields
        mFields.id.value       = row.querySelector(".col-mid").textContent.trim();
        mFields.name.value     = nameCellEl  ? nameCellEl.textContent.trim()  : "";
        mFields.email.value    = emailCellEl ? emailCellEl.textContent.trim() : "";
        mFields.role.value     = roleCellEl  ? roleCellEl.textContent.trim()  : "";
        mFields.username.value = userCellEl  ? userCellEl.textContent.trim()  : "";
        
        // Clean phone number (removes dash placeholders)
        mFields.phone.value    = phoneCellEl ? phoneCellEl.textContent.trim().replace(/[—â€”]/g, "").trim() : "";

        // ✅ PASSWORD LOGIC: Set UI to Edit Mode
        // This disables the input and removes the 'required' attribute
        setEditModeLabel();

        // Clear password value and reset strength meter
        if (mFields.password) {
          mFields.password.value = "********"; 
        }
        updatePasswordStrength();

        // Single toast notification (prevents stacking)
        showMaintenanceToast("Record loaded. Password changes are disabled during edit.", "success");
        
        // Optional: Scroll to top of form for better mobile UX
        section.querySelector(".m-form-container")?.scrollIntoView({ behavior: 'smooth' });
      }

      if (btn.classList.contains("mtag-delete")) {
        if (!deleteOverlay) return;

        rowPendingDelete = row;

        const idCell   = row.querySelector(".col-mid");
        const nameCell = row.querySelector(".col-name .cell-scroll") || row.querySelector(".col-name");

        const deletedId   = idCell   ? idCell.textContent.trim()   : "";
        const deletedName = nameCell ? nameCell.textContent.trim() : "";

        if (confirmNameEl) confirmNameEl.textContent = deletedName || "(No name)";
        if (confirmIdEl)   confirmIdEl.textContent   = deletedId ? `ID: ${deletedId}` : "";

        deleteOverlay.classList.remove("hidden");
      }
    });
  }

  function closeDeleteConfirm() {
    if (!deleteOverlay) return;
    deleteOverlay.classList.add("hidden");
    rowPendingDelete = null;
  }

  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeDeleteConfirm();
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!rowPendingDelete || !tableBody) {
        closeDeleteConfirm();
        return;
      }

      const dbId = rowPendingDelete.dataset.dbid;
      if (!dbId) {
        closeDeleteConfirm();
        return;
      }

      const idCell   = rowPendingDelete.querySelector(".col-mid");
      const nameCell = rowPendingDelete.querySelector(".col-name .cell-scroll") || rowPendingDelete.querySelector(".col-name");

      const deletedId   = idCell   ? idCell.textContent.trim()   : "";
      const deletedName = nameCell ? nameCell.textContent.trim() : "";

      const fd = new FormData();
      fd.append("id", dbId);

      /* ======================================================
         ðŸš€ FIX: Use Absolute Clean URL
      ====================================================== */
      const baseUrl = window.location.origin;
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      
      // Target the "clean" URL without .php
      const actionUrl = `${cleanBase}/api/maintenance_delete`;

      try {
        const res  = await fetch(actionUrl, {
          method: "POST",
          body: fd,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        const json = await res.json();

        if (!json.ok) {
          showMaintenanceToast(json.msg || "Failed to delete maintenance account.", "error");
          return;
        }

        showMaintenanceToast(json.msg || "Maintenance record deleted.", "success");
        logMaintenanceEvent("Deleted",
          `Maintenance ${deletedName} (ID: ${deletedId}) deleted`
        );

        // If this row was being edited, reset form mode
        if (editingRow === rowPendingDelete) {
          clearMaintenanceForm(false);
        }

        await loadMaintenance();
      } catch (err) {
        console.error(err);
        showMaintenanceToast("Failed to delete maintenance account.", "error");
      } finally {
        closeDeleteConfirm();
      }
    });
  }

  if (deleteOverlay) {
    deleteOverlay.addEventListener("click", (e) => {
      if (e.target === deleteOverlay) {
        closeDeleteConfirm();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && deleteOverlay && !deleteOverlay.classList.contains("hidden")) {
      closeDeleteConfirm();
    }
  });

  // ===============================
  // Initial sync for analytics
  // ===============================
  updateRegisteredMaintenanceCount();
  refreshEmptyStateRow();

  // ðŸ“Š MAINTENANCE ANALYTICS EXPORT
  window.getMaintenanceAnalytics = function () {
    if (!tableBody) {
      return { totalMaintenance: 0 };
    }
    const realRows = tableBody.querySelectorAll(`tr:not(.${EMPTY_ROW_CLASS})`);
    return { totalMaintenance: realRows.length };
  };
});
