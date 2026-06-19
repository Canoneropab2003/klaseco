/* ==========================================================
   🧰 KLASECO — Admin Staff Accounts JS (DB-backed + UI like your 1st code)
   - Works ONLY inside: <section id="adminstaffaccounts">
   - Uses your 1st-code table classes: .col-mid/.col-name/.cell-scroll/.m-actions/.mtag-*
   - Behaves like your 2nd code: loads/saves/deletes via PHP API endpoints
   ========================================================== */

(function () {
  "use strict";

  // ==============================
  // 🔔 TOAST (Admin Staff)
  // ==============================
function showAdminStaffToast(message, type = "error") {
  const container = document.getElementById("toast-adminstaff");
  if (!container) return;

  // Removes existing toast to prevent stacking
  const existingToast = container.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }
  }, 2500);
}

function maskPassword(passLen) {
  const n = Math.max(0, Number(passLen) || 0);
  // Standard '*' prevents the encoding symbols seen in your screenshots
  return "*".repeat(n || 8); 
}
  
  // ✅ ADDED: Loading toast (non-blocking, re-usable) — like mmaintenance.js
  let adminStaffLoadingToast = null;

  function showAdminStaffLoadingToast(message = "Loading...") {
    const container = document.getElementById("toast-adminstaff");
    if (!container) return;

    // remove old loading toast (only one at a time)
    if (adminStaffLoadingToast) {
      adminStaffLoadingToast.remove();
      adminStaffLoadingToast = null;
    }

    const toast = document.createElement("div");
    toast.className = "toast loading";
    toast.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>${message}</span>`;

    container.appendChild(toast);
    adminStaffLoadingToast = toast;
  }

  function hideAdminStaffLoadingToast() {
    if (!adminStaffLoadingToast) return;

    adminStaffLoadingToast.style.opacity = "0";
    adminStaffLoadingToast.style.transition = "opacity 0.3s";

    setTimeout(() => {
      adminStaffLoadingToast?.remove();
      adminStaffLoadingToast = null;
    }, 300);
  }

  // ==============================
  // 🧾 OPTIONAL LOGGER HOOK
  // ==============================
  function asLog(event, detail) {
    // If you have global addSystemLog() or logAdminStaffEvent(), it will use it.
    if (typeof logAdminStaffEvent === "function") {
      // Your original signature: logAdminStaffEvent(event, detail)
      logAdminStaffEvent(event, detail);
    } else if (typeof addSystemLog === "function") {
      addSystemLog("Admin Staff", event, detail);
    } else {
      console.log(`[AdminStaff][${event}] ${detail}`);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const section = document.getElementById("adminstaffaccounts");
    if (!section) return;

    asLog("Module Init", "Admin Staff Accounts module initialized");

    // ------------------------------
    // DOM refs (scoped to section)
    // ------------------------------
    const form = section.querySelector("#adminstaff-form");
    if (!form) return;

    const tableBody = section.querySelector(".m-table tbody");
    const countEl = document.getElementById("overview-adminstaff-count");

    const fields = {
      db_id: section.querySelector("#as-db-id"),
      staff_id: section.querySelector("#as-id"),
      name: section.querySelector("#as-name"),
      position: section.querySelector("#as-position"),
      email: section.querySelector("#as-email"),
      phone: section.querySelector("#as-phone"),
      username: section.querySelector("#as-username"),
      password: section.querySelector("#as-password"),
    };

    const addBtn = section.querySelector(".mbtn-green");
    const addBtnLabel = addBtn ? addBtn.querySelector("span") : null;
    const clearBtn = section.querySelector(".mbtn-clear");

    // Password strength + toggle (keep your 1st code UI behavior)
    const toggleBtn = section.querySelector(".m-password-toggle");
    const strengthEl = section.querySelector(".m-password-strength");

    // Delete confirm modal
    const deleteOverlay = section.querySelector("#as-delete-confirm");
    const confirmNameEl = section.querySelector("#confirm-as-name");
    const confirmIdEl = section.querySelector("#confirm-as-id");
    const confirmDeleteBtn = section.querySelector("#as-confirm-delete-btn");
    const confirmCancelBtn = section.querySelector("#as-confirm-cancel-btn");

    // ------------------------------
    // Config
    // ------------------------------
    const EMPTY_ROW_CLASS = "as-empty-row";
    let pendingDeleteDbId = null;

    // ✅ ADDED: prevent double-save clicks while request is in-flight (like mmaintenance.js)
    let isSavingAdminStaff = false;

// --- Helpers ---
function setAddModeLabel() {
  if (addBtnLabel) addBtnLabel.textContent = "Add Admin Staff";
  
  if (fields.password) {
    fields.password.disabled = false;           // ENABLE for new accounts
    fields.password.setAttribute("required", "required");
    fields.password.placeholder = "Enter Password";
    fields.password.style.opacity = "1";        // Reset appearance
    fields.password.style.cursor = "text";
  }
}

function setEditModeLabel() {
  if (addBtnLabel) addBtnLabel.textContent = "Update Admin Staff";
  
  if (fields.password) {
    fields.password.value = "********";         // Visual mask
    fields.password.disabled = true;            // DISABLE input entirely
    fields.password.removeAttribute("required"); 
    fields.password.placeholder = "Password cannot be changed here";
    
    // Optional: Add visual feedback that it's disabled
    fields.password.style.opacity = "0.6";
    fields.password.style.cursor = "not-allowed";

    // Clean up UI strength meter
    if (strengthEl) {
      strengthEl.textContent = ""; 
      strengthEl.classList.remove("weak", "medium", "strong");
    }
  }
}

    function updateCount(n) {
      if (!countEl) return;
      countEl.textContent = n > 0 ? String(n) : "—";
    }

    function maskPassword(passLen) {
      const n = Math.max(0, Number(passLen) || 0);
      return "•".repeat(n || 8);
    }

    function wrapScroll(text) {
      const safe = text == null ? "" : String(text);
      return `<div class="cell-scroll">${safe}</div>`;
    }

    function refreshEmptyStateRow() {
      if (!tableBody) return;

      const realRows = tableBody.querySelectorAll(`tr:not(.${EMPTY_ROW_CLASS})`);
      let emptyRow = tableBody.querySelector(`tr.${EMPTY_ROW_CLASS}`);

      if (realRows.length === 0) {
        if (!emptyRow) {
          emptyRow = document.createElement("tr");
          emptyRow.className = EMPTY_ROW_CLASS;
          emptyRow.innerHTML = `
            <td colspan="8" class="t-empty-cell">
              <div class="t-empty-center">No admin staff yet.</div>
            </td>
          `;
          tableBody.appendChild(emptyRow);
        }
      } else if (emptyRow) {
        emptyRow.remove();
      }
    }

function updatePasswordStrength() {
  if (!fields.password || !strengthEl) return;

  const value = fields.password.value || "";
  const len = value.length;

  // 1. Reset state if empty or if it contains the placeholder asterisks
  if (!value || value === "********") {
    strengthEl.textContent = "";
    strengthEl.classList.remove("weak", "medium", "strong");
    return;
  }

  // 2. Real-World Security Criteria
  const hasUpper = /[A-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);

  // Using the Unicode escape \u2014 for the long dash (�)
  const dash = " \u2014 "; 
  let label = "";
  let levelClass = "";

  // 3. Logic: Length is the base, but complexity boosts it
  if (len < 6) {
    label = "Very Weak" + dash + "Too short";
    levelClass = "weak";
  } else if (len < 10 && (!hasUpper || !hasSpecial)) {
    label = "Weak" + dash + "Add uppercase & symbols";
    levelClass = "weak";
  } else if (len >= 8 && hasUpper && hasNumber && hasSpecial) {
    label = "Strong password";
    levelClass = "strong";
  } else {
    label = "Medium strength password";
    levelClass = "medium";
  }

  // 4. Update UI - Also using \u2014 here for the first dash
  strengthEl.textContent = `Length: ${len}${dash}${label}`;
  strengthEl.classList.remove("weak", "medium", "strong");
  strengthEl.classList.add(levelClass);
}

    function isFormEmpty() {
      return (
        (!fields.staff_id?.value || !fields.staff_id.value.trim()) &&
        (!fields.name?.value || !fields.name.value.trim()) &&
        (!fields.position?.value || !fields.position.value.trim()) &&
        (!fields.email?.value || !fields.email.value.trim()) &&
        (!fields.phone?.value || !fields.phone.value.trim()) &&
        (!fields.username?.value || !fields.username.value.trim()) &&
        (!fields.password?.value || !fields.password.value.trim())
      );
    }

function clearForm(showToast = true) {
  form.reset();
  if (fields.db_id) fields.db_id.value = "";
  
  // This resets the password to 'required' and fixes the placeholder
  setAddModeLabel(); 
  
  updatePasswordStrength();
  if (showToast) showAdminStaffToast("Form cleared.", "success");
}

    // ------------------------------
    // Delete modal helpers
    // ------------------------------
    function openDeleteConfirm(name, staffId, dbId) {
      pendingDeleteDbId = dbId;

      if (confirmNameEl) confirmNameEl.textContent = name || "(No name)";
      if (confirmIdEl) confirmIdEl.textContent = staffId ? `ID: ${staffId}` : "";

      if (deleteOverlay) deleteOverlay.classList.remove("hidden");
      document.body.style.overflow = "hidden";

      asLog(
        "Delete Prompt",
        `Delete confirmation opened for ${name || "(Unknown)"} (DB ID: ${dbId || "N/A"})`
      );
    }

    function closeDeleteConfirm() {
      pendingDeleteDbId = null;
      if (deleteOverlay) deleteOverlay.classList.add("hidden");
      document.body.style.overflow = "";
    }

    // ------------------------------
    // Row builder (keeps your 1st code UI/classes + cell-scroll)
    // ------------------------------
    function buildRow(row) {
      // Expected fields from API:
      // id, staff_id, name, position, email, phone, username
      // (password usually not returned; we mask)
      const tr = document.createElement("tr");
      tr.dataset.dbid = row.id;

      tr.innerHTML = `
        <td class="col-mid">${row.staff_id ?? ""}</td>
        <td class="col-name">${wrapScroll(row.name ?? "")}</td>
        <td class="col-email">${wrapScroll(row.email ?? "")}</td>
        <td class="col-role">${wrapScroll(row.position ?? "")}</td>
        <td class="col-phone">${row.phone ?? ""}</td>
        <td class="col-user">${wrapScroll(row.username ?? "")}</td>
        <td class="col-pass">${wrapScroll(maskPassword(8))}</td>
        <td class="col-actions">
          <div class="m-actions">
            <button class="mtag mtag-edit" type="button" data-id="${row.id}">
              <i class="fa-solid fa-pen"></i><span>Edit</span>
            </button>
            <button class="mtag mtag-delete" type="button" data-id="${row.id}">
              <i class="fa-solid fa-trash"></i><span>Delete</span>
            </button>
          </div>
        </td>
      `;

      return tr;
    }

    // ------------------------------
    // DB: Load all
    // ------------------------------
    async function loadAdmins() {
      if (!tableBody) return;

      try {
        const res = await fetch(`api/admin_staff_list.php?_=${Date.now()}`);
        const data = await res.json();

        tableBody.innerHTML = "";

        if (!data.ok) {
          showAdminStaffToast(data.msg || "Failed to load admin staff.", "error");
          refreshEmptyStateRow();
          updateCount(0);
          return;
        }

        const rows = Array.isArray(data.rows) ? data.rows : [];
        if (rows.length === 0) {
          refreshEmptyStateRow();
          updateCount(0);
          asLog("DB Load", "No admin staff records found");
          return;
        }

        rows.forEach((r) => tableBody.appendChild(buildRow(r)));
        refreshEmptyStateRow();
        updateCount(rows.length);
        asLog("DB Load", `Loaded ${rows.length} admin staff records`);
      } catch (err) {
        console.error(err);
        showAdminStaffToast("Failed to load admin staff.", "error");
        if (tableBody) tableBody.innerHTML = "";
        refreshEmptyStateRow();
        updateCount(0);
      }
    }

    // ------------------------------
    // DB: Save (Insert/Update)
    // ------------------------------
    async function saveAdminStaff() {
      const fd = new FormData();
      fd.append("id", fields.db_id?.value?.trim() || "");
      fd.append("staff_id", fields.staff_id?.value?.trim() || "");
      fd.append("name", fields.name?.value?.trim() || "");
      fd.append("position", fields.position?.value?.trim() || "");
      fd.append("email", fields.email?.value?.trim() || "");
      fd.append("phone", fields.phone?.value?.trim() || "");
      fd.append("username", fields.username?.value?.trim() || "");
      fd.append("password", fields.password?.value?.trim() || "");

      const isUpdate = !!(fields.db_id && fields.db_id.value);
      const baseUrl = window.location.origin;
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      // 2. Target the "clean" URL without .php to match your .htaccess rules
      // This prevents the 301 redirect that strips your POST data.
      const actionUrl = `${cleanBase}/api/admin_staff_save`;

      try {
        const res = await fetch(actionUrl, { 
          method: "POST", 
          body: fd,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        // Check if the response is actually JSON
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const rawText = await res.text();
            console.error("Non-JSON response received:", rawText);
            throw new Error("Server returned an invalid response format.");
        }

        const data = await res.json();

        if (!data.ok) {
          showAdminStaffToast(data.error || data.msg || "Failed to save admin staff.", "error");
          asLog("Save Failed", data.error || data.msg || "Unknown save error");
          return false;
        }

        showAdminStaffToast(data.msg || (isUpdate ? "Admin staff updated." : "Admin staff added."), "success");
        asLog("Save", data.msg || (isUpdate ? "Updated admin staff" : "Added admin staff"));
        return true;

      } catch (err) {
        console.error("Fetch Error:", err);
        showAdminStaffToast("Connection error: " + err.message, "error");
        return false;
      }
    }

    // ------------------------------
    // DB: Delete
    // ------------------------------
    async function deleteAdminStaff(dbId) {
      const fd = new FormData();
      fd.append("id", dbId);

      /* ======================================================
         🚀 FIX FOR LIVE HOSTING: Use absolute clean URL
      ====================================================== */
      const baseUrl = window.location.origin;
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      
      // Target the clean URL (no .php) to avoid data-stripping redirects
      const actionUrl = `${cleanBase}/api/admin_staff_delete`;

      try {
        const res = await fetch(actionUrl, { 
            method: "POST", 
            body: fd,
            headers: {
                'X-Requested-With': 'XMLHttpRequest' // Standard for AJAX identification
            }
        });
        
        const data = await res.json();

        if (!data.ok) {
          showAdminStaffToast(data.msg || "Failed to delete admin staff.", "error");
          asLog("Delete Failed", data.msg || "Unknown delete error");
          return false;
        }

        showAdminStaffToast("Admin staff deleted successfully.", "success");
        asLog("Deleted", `Deleted DB ID ${dbId}`);
        return true;
      } catch (err) {
        console.error("Delete Fetch Error:", err);
        showAdminStaffToast("Connection error during delete.", "error");
        return false;
      }
    }

    // ------------------------------
    // Input formatting (same style as your 2nd code)
    // Staff ID: digits only → XX-XXXX-XXX
    // ------------------------------
    if (fields.staff_id) {
      fields.staff_id.addEventListener("input", (e) => {
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

    if (fields.name) {
      fields.name.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^A-Za-z\s.'-]/g, "");
      });
    }

    if (fields.phone) {
      fields.phone.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
      });
    }

    if (fields.password) {
      fields.password.addEventListener("input", updatePasswordStrength);
    }

    if (toggleBtn && fields.password) {
      toggleBtn.addEventListener("click", () => {
        const isPass = fields.password.type === "password";
        fields.password.type = isPass ? "text" : "password";

        const icon = toggleBtn.querySelector("i");
        if (icon) {
          icon.classList.toggle("fa-eye");
          icon.classList.toggle("fa-eye-slash");
        }

        asLog("Password Visibility", `Password field type: ${fields.password.type}`);
      });
    }

    // ------------------------------
    // EVENTS
    // ------------------------------
    setAddModeLabel();
    loadAdmins();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (isSavingAdminStaff) return;
      
      // --- START OF ADDED STRONG PASSWORD VALIDATION ---
      const isUpdate = !!(fields.db_id && fields.db_id.value);
      const passwordValue = fields.password?.value || "";

      // Only validate strength if it's a NEW account (not in Edit Mode)
      if (!isUpdate) {
        const hasUpper = /[A-Z]/.test(passwordValue);
        const hasNumber = /[0-9]/.test(passwordValue);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(passwordValue);
        const isLongEnough = passwordValue.length >= 8;

        if (!(isLongEnough && hasUpper && hasNumber && hasSpecial)) {
          showAdminStaffToast("Password must be at least 8 characters and include uppercase, numbers, and symbols.", "error");
          asLog("Validation Failed", "Password does not meet 'Strong' criteria");
          return;
        }
      }
      // --- END OF ADDED STRONG PASSWORD VALIDATION ---

      isSavingAdminStaff = true;

      if (!form.checkValidity()) {
        form.reportValidity();
        asLog("Validation Failed", "Form HTML5 validation failed");
        isSavingAdminStaff = false;
        return;
      }

      showAdminStaffLoadingToast(isUpdate ? "Updating admin staff..." : "Saving admin staff...");

      try {
        const ok = await saveAdminStaff();
        if (!ok) return;

        clearForm(false);
        await loadAdmins();
      } catch (err) {
        console.error(err);
        showAdminStaffToast("Failed to save admin staff.", "error");
      } finally {
        hideAdminStaffLoadingToast();
        isSavingAdminStaff = false;
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (isFormEmpty()) {
          showAdminStaffToast("Form is already empty.", "error");
          asLog("Clear Form Attempt", "Clear clicked but form was already empty");
          return;
        }
        clearForm(true);
      });
    }

    // Table edit/delete (keeps your 1st code feel but DB-backed)
    if (tableBody) {
      tableBody.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;

        const tr = btn.closest("tr");
        if (!tr || tr.classList.contains(EMPTY_ROW_CLASS)) return;

        const dbId = btn.dataset.id || tr.dataset.dbid || "";

        // EDIT
        if (btn.classList.contains("mtag-edit")) {
          const idCell = tr.querySelector(".col-mid");
          const nameCell = tr.querySelector(".col-name .cell-scroll") || tr.querySelector(".col-name");
          const emailCell = tr.querySelector(".col-email .cell-scroll") || tr.querySelector(".col-email");
          const posCell = tr.querySelector(".col-role .cell-scroll") || tr.querySelector(".col-role");
          const phoneCell = tr.querySelector(".col-phone");
          const userCell = tr.querySelector(".col-user .cell-scroll") || tr.querySelector(".col-user");

          // Fill hidden ID and text fields
          if (fields.db_id) fields.db_id.value = dbId;
          if (fields.staff_id) fields.staff_id.value = idCell ? idCell.textContent.trim() : "";
          if (fields.name) fields.name.value = nameCell ? nameCell.textContent.trim() : "";
          if (fields.email) fields.email.value = emailCell ? emailCell.textContent.trim() : "";
          if (fields.position) fields.position.value = posCell ? posCell.textContent.trim() : "";
          if (fields.phone) fields.phone.value = phoneCell ? phoneCell.textContent.trim() : "";
          if (fields.username) fields.username.value = userCell ? userCell.textContent.trim() : "";

          // --- PASSWORD LOGIC FOR EDIT MODE: FULLY DISABLED ---
          if (fields.password) {
            fields.password.value = "********"; // Visual mask only
            fields.password.disabled = true;    // Prevents any typing/input
            fields.password.removeAttribute("required"); 
            fields.password.placeholder = "Password cannot be changed during edit";
            
            // Visual style to show it's locked
            fields.password.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
            fields.password.style.cursor = "not-allowed";
          }
          
          // Reset the strength meter
          if (strengthEl) {
            strengthEl.textContent = ""; 
            strengthEl.classList.remove("weak", "medium", "strong");
          }

          // Update Button UI (Add -> Update)
          setEditModeLabel();
          
          showAdminStaffToast("Editing record. Password field is locked.", "success");
          asLog("Load For Edit", `Loaded DB ID ${dbId} for editing (Password Disabled)`);
          
          // Scroll to top of form
          section.querySelector(".m-form-container")?.scrollIntoView({ behavior: 'smooth' });
          
          return;
        }

        // DELETE
        if (btn.classList.contains("mtag-delete")) {
          const idCell = tr.querySelector(".col-mid");
          const nameCell = tr.querySelector(".col-name .cell-scroll") || tr.querySelector(".col-name");

          const staffId = idCell ? idCell.textContent.trim() : "";
          const name = nameCell ? nameCell.textContent.trim() : "";

          openDeleteConfirm(name, staffId, dbId);
        }
      });
    }

    // Delete modal buttons
    if (confirmCancelBtn) {
      confirmCancelBtn.addEventListener("click", (e) => {
        e.preventDefault();
        closeDeleteConfirm();
        asLog("Delete Cancelled", "Delete cancelled by button");
      });
    }

    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (!pendingDeleteDbId) return;

        try {
          const ok = await deleteAdminStaff(pendingDeleteDbId);
          if (!ok) return;

          await loadAdmins();
        } catch (err) {
          console.error(err);
          showAdminStaffToast("Failed to delete admin staff.", "error");
        } finally {
          closeDeleteConfirm();
        }
      });
    }

    // Close modal by clicking overlay
    if (deleteOverlay) {
      deleteOverlay.addEventListener("click", (e) => {
        if (e.target === deleteOverlay) {
          closeDeleteConfirm();
          asLog("Delete Cancelled (Overlay)", "Delete cancelled by clicking overlay");
        }
      });
    }

    // ESC closes modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && deleteOverlay && !deleteOverlay.classList.contains("hidden")) {
        closeDeleteConfirm();
        asLog("Delete Cancelled (Escape)", "Delete cancelled with ESC");
      }
    });

    // Analytics export (optional)
    window.getAdminStaffAnalytics = function () {
      const realRows = tableBody ? tableBody.querySelectorAll(`tr:not(.${EMPTY_ROW_CLASS})`) : [];
      return { totalAdminStaff: realRows.length || 0 };
    };
  });
})();
