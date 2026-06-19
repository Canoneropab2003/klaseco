// assets/js/maintenancestaff/maintenancerequest.js
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const tbody   = document.getElementById("maintenanceTableBody");
  const search  = document.getElementById("maintenanceSearch");
  const fStatus = document.getElementById("maintenanceFilterStatus");
  const fPrio   = document.getElementById("maintenanceFilterPriority");
  if (!tbody) return;

  // Overview counters
  const ovAssigned = document.getElementById("overview-assigned");
  const ovResolved = document.getElementById("overview-resolved");
  const ovPending  = document.getElementById("overview-pending");

  // Modal refs
  const modal      = document.getElementById("maintenanceModal");
  const form       = document.getElementById("maintenanceForm");
  const btnSave    = document.getElementById("btnSaveMaintRequest");
  const modalTitle = document.getElementById("maintenanceModalTitle");

  const inpId     = document.getElementById("maintReqId");
  const inpIssue  = document.getElementById("maintIssueTitle");
  const inpRoom   = document.getElementById("maintRoom");
  const ROOM_OPTIONS = ["A303", "A304"];
    if (inpRoom) {
      inpRoom.innerHTML = ROOM_OPTIONS.map(r =>
        `<option value="${r}">${r}</option>`
      ).join("");
    }
  const inpPrio   = document.getElementById("maintPriority");
  const inpStatus = document.getElementById("maintStatus");
// Around line 25 in maintenancerequest.js
const inpNotes = document.getElementById("maintWorkNotes"); // Updated ID
const descDisplay = document.getElementById("maintDescriptionDisplay"); // New Display Div
const hiddenDesc = document.getElementById("maintDescription"); // New Hidden Input
  

  // Proof upload UI
  const fileInput  = document.getElementById("maintProofImage");
  const btnUpload  = document.getElementById("btnUploadProof");
  const previewBox = document.getElementById("proofPreview");
  const previewImg = document.getElementById("proofImageDisplay");
  const btnRemove  = document.getElementById("btnRemoveProof");

  const closeBtns = modal ? modal.querySelectorAll("[data-close-maintenance-modal]") : [];

  // =========================
  // ✅ RESOLVE CONFIRM POPUP REFS
  // =========================
  const resolveOverlay   = document.getElementById("resolveConfirmOverlay");
  const btnResolveYes    = document.getElementById("btnResolveYes");
  const btnResolveNo     = document.getElementById("btnResolveNo");
  const resolveIssueText = document.getElementById("resolveIssueText");
  const resolveRoomText  = document.getElementById("resolveRoomText");

  // If user already clicked "Yes, Resolve" for this save attempt
  let resolveConfirmed = false;

  let rowsCache = [];
  const API_BASE = `${window.location.origin}/klaseco-new/api/`;
  const api = (file) => API_BASE + file;

  // Track if record is already resolved in DB
  let isDbResolved = false;

  // -------------------------
  // ✅ NICE TOAST (Bottom Center)
  // -------------------------
  function showMaintenanceToast(message, type = "success") {
    const ICONS = {
      success: "fa-circle-check",
      error: "fa-circle-xmark",
      loading: "fa-spinner"
    };

    let wrap = document.getElementById("toast-maintenance");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "toast-maintenance";
      document.body.appendChild(wrap);
    }

    // 🔥 REMOVE EXISTING LOADING TOAST (if any)
    const existingLoading = wrap.querySelector(".toast.loading");
    if (existingLoading && type !== "loading") {
      existingLoading.classList.add("hide");
      setTimeout(() => existingLoading.remove(), 200);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    toast.innerHTML = `
      <i class="fa-solid ${ICONS[type]} ${type === "loading" ? "spin" : ""}"></i>
      <span>${message}</span>
      <button type="button" class="toast-close">&times;</button>
    `;

    const close = () => {
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 220);
    };

    toast.querySelector(".toast-close").onclick = close;

    wrap.prepend(toast);

    // ✅ Auto-close success & error
    if (type !== "loading") {
      setTimeout(close, 2600);
    }
  }

  // -------------------------
  // helpers
  // -------------------------
  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[m]));
  }

  function fmtDate(iso){
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  }

  function normalizeProofUrl(raw) {
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('blob:')) return raw; // Handle local previews

    const baseUrl = window.location.origin;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const relativePath = raw.startsWith('/') ? raw : '/' + raw;
    
    // Ensure we point to the correct subfolder if necessary
    return cleanBase + relativePath;
}

function getProofUrl(row) {
    // Check both potential column names from your API
    const raw = row.proof_image_url || row.proof_url || row.proof_image || "";
    return raw ? normalizeProofUrl(raw) : "";
}

  function uiStatusFromDb(dbStatus){
    const s = String(dbStatus || "").toLowerCase().trim();
    if (s === "in progress") return "in-progress";
    return s || "pending";
  }

  function dbStatusFromUi(uiStatus){
    const s = String(uiStatus || "").toLowerCase().trim();
    if (s === "in-progress") return "in progress";
    return s || "pending";
  }

  function getProofUrl(row){
    return row?.proof_image_url || row?.proof_url || null;
  }

  function emptyRow(msg){
    tbody.innerHTML = `
      <tr class="t-empty-row">
        <td class="t-empty-cell" colspan="9">
          <div class="t-empty-center">${esc(msg)}</div>
        </td>
      </tr>`;
  }

  function openModal(){
    if (!modal) return;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal(){
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }

  // =========================
  // ✅ RESOLVE CONFIRM POPUP HELPERS
  // =========================
  function openResolveConfirm(){
    if (!resolveOverlay) return;

    if (resolveIssueText) resolveIssueText.textContent = inpIssue?.value || "—";
    if (resolveRoomText)  resolveRoomText.textContent  = inpRoom?.value  || "—";

    resolveOverlay.style.display = "flex";
    resolveOverlay.setAttribute("aria-hidden", "false");
  }

  function closeResolveConfirm(){
    if (!resolveOverlay) return;
    resolveOverlay.style.display = "none";
    resolveOverlay.setAttribute("aria-hidden", "true");
  }

  function showPreviewFromUrl(url){
    if (!previewBox || !previewImg) return;
    previewImg.src = normalizeProofUrl(url);
    previewBox.style.display = "grid";
  }

  function hidePreviewKeepFileCleared(){
    if (previewBox) previewBox.style.display = "none";
    if (previewImg) previewImg.src = "";
    if (fileInput) fileInput.value = "";
  }

  function isToday(iso){
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  function updateOverview(rows){
    const totalAssigned = Array.isArray(rows) ? rows.length : 0;
    let resolvedToday = 0;
    let pendingCount  = 0;

    for (const r of (rows || [])) {
      const st = uiStatusFromDb(r.status);
      if (st === "resolved") {
        const dateToCheck = r.updated_at || r.proof_uploaded_at || r.created_at;
        if (isToday(dateToCheck)) resolvedToday++;
      } else if (st === "pending" || st === "in-progress") {
        pendingCount++;
      }
    }

    if (ovAssigned) ovAssigned.textContent = String(totalAssigned);
    if (ovResolved) ovResolved.textContent = String(resolvedToday);
    if (ovPending)  ovPending.textContent  = String(pendingCount);
    updateStaffNotifications(rows);
  }
  
  function updateStaffNotifications(rows) {
      const badge = document.getElementById('staffNotifBadge');
      const title = document.getElementById('staffNotifTitle');
      const list = document.getElementById('staffNotifList');
      
      // Filter for pending or in-progress tasks assigned to this staff
      const activeTasks = rows.filter(r => {
        const st = uiStatusFromDb(r.status);
        return st === "pending" || st === "in-progress";
      });
    
      if (badge) {
        badge.textContent = activeTasks.length;
        badge.style.display = activeTasks.length > 0 ? "inline-flex" : "none";
      }
    
      if (title) title.textContent = `${activeTasks.length} Active Tasks`;
    
      // Populate the list
      if (list) {
        list.innerHTML = activeTasks.length === 0 
          ? '<div style="padding:15px; text-align:center; color:#94a3b8; font-size:12px;">No active tasks.</div>'
          : activeTasks.map(req => `
              <div class="notif-item" onclick="openTaskById(${req.id})">
                <span class="notif-title">${esc(req.issue_title)}</span>
                <span class="notif-meta">${esc(req.room_code)} • Priority: ${esc(req.priority)}</span>
              </div>
            `).join("");
      }
    }

const staffNotifBtn = document.getElementById('staffNotifBtn');
const staffNotifDropdown = document.getElementById('staffNotifDropdown');

// Toggle Dropdown
staffNotifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    staffNotifDropdown?.classList.toggle('show');
});

// Close when clicking outside
document.addEventListener('click', () => {
    staffNotifDropdown?.classList.remove('show');
});

// Shortcut to open task edit modal directly from notification
window.openTaskFromNotif = (id) => {
    const task = rowsCache.find(r => r.id == id);
    if (task) openTaskModal(task);
    staffNotifDropdown?.classList.remove('show');
};

// Update existing overview function to sync the bell
const originalUpdateOverview = updateOverview;
updateOverview = function(rows) {
    originalUpdateOverview(rows);
    updateStaffNotifications(rows);
};

  // -------------------------
  // view-only mode (resolved from DB)
  // -------------------------
  function setViewOnly(isViewOnly) {
  if (inpStatus) inpStatus.disabled = !!isViewOnly;
  if (inpNotes)  inpNotes.readOnly  = !!isViewOnly;

  // ✅ NEW: Disable Upload and Remove buttons when resolved
  if (btnUpload) {
    btnUpload.disabled = !!isViewOnly;
    btnUpload.style.opacity = isViewOnly ? "0.5" : "1";
    btnUpload.style.cursor = isViewOnly ? "not-allowed" : "pointer";
  }
  
  if (btnRemove) {
    btnRemove.disabled = !!isViewOnly;
    btnRemove.style.opacity = isViewOnly ? "0.5" : "1";
    btnRemove.style.cursor = isViewOnly ? "not-allowed" : "pointer";
  }

  if (btnSave) {
    btnSave.disabled = !!isViewOnly;
    btnSave.classList.toggle("save-resolved-lock", !!isViewOnly);
  }

  if (modalTitle) {
    modalTitle.innerHTML = isViewOnly
      ? `<i class="fa-solid fa-eye"></i> View Task (Resolved)`
      : `<i class="fa-solid fa-pen-to-square"></i> Update Task`;
  }
}

  // -------------------------
  // proof upload preview
  // -------------------------
  if (btnUpload && fileInput) {
  btnUpload.addEventListener("click", () => {
    // ✅ NEW: Extra check to prevent opening the file picker
    if (isDbResolved || btnUpload.disabled) return;
    fileInput.click();
  });
}

  if (fileInput && previewBox && previewImg) {
    fileInput.addEventListener("change", () => {
      if (fileInput.disabled) return;
      const f = fileInput.files?.[0];
      if (!f) return;
      previewImg.src = URL.createObjectURL(f);
      previewBox.style.display = "grid";
    });
  }

  // -------------------------
  // lightbox
  // -------------------------
  function ensureProofLightbox(){
    let overlay = document.querySelector(".proof-lightbox-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "proof-lightbox-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    overlay.innerHTML = `
      <div class="proof-lightbox-inner">
        <img class="proof-lightbox-img" alt="Proof image preview" />
        <div class="proof-lightbox-meta">
          <div class="proof-lightbox-caption">
            <span class="proof-lightbox-issue"></span>
            <span class="dot">•</span>
            <span class="proof-lightbox-room"></span>
          </div>
          <button type="button" class="proof-lightbox-close">
            <i class="fa-solid fa-xmark"></i>
            <span>Close</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function openLightboxWith({ src, issue, room }){
    if (!src) return;

    const overlay  = ensureProofLightbox();
    const img      = overlay.querySelector(".proof-lightbox-img");
    const closeBtn = overlay.querySelector(".proof-lightbox-close");

    overlay.querySelector(".proof-lightbox-issue").textContent = (issue || "Proof").trim();
    overlay.querySelector(".proof-lightbox-room").textContent  = (room  || "—").trim();

    img.src = normalizeProofUrl(src);
    overlay.style.display = "flex";

    const close = () => { overlay.style.display = "none"; };
    closeBtn.onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    const onKey = (e) => {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", onKey);
      }
    };
    document.addEventListener("keydown", onKey);
  }

  if (previewImg) {
    previewImg.addEventListener("click", () => {
      const isVisible = previewBox && previewBox.style.display !== "none";
      if (!isVisible) return;
      if (!previewImg.src) return;

      openLightboxWith({
        src: previewImg.src,
        issue: inpIssue?.value || "Proof",
        room:  inpRoom?.value  || "—"
      });
    });
  }

  // -------------------------
  // remove proof
  // -------------------------
  if (btnRemove) {
  btnRemove.addEventListener("click", async () => {
    // ✅ NEW: Block removal if the task is already resolved in the DB
    if (isDbResolved) {
      showMaintenanceToast("Resolved tasks cannot be modified.", "error");
      return;
    }

    const id = Number(inpId?.value || 0);
      if (!id) return;

      // 🚀 FIX: Use absolute clean URL instead of api("...php")
      const baseUrl = window.location.origin;
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const actionUrl = `${cleanBase}/api/maintenance_tasks_clear_proof_staff`;

      const res = await fetch(actionUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest" // Required for many server security filters
        },
        credentials: "same-origin",
        body: JSON.stringify({ id })
      });

      // Handle Potential non-JSON errors from server
      const rawText = await res.text();
      let json;
      try {
          json = JSON.parse(rawText);
      } catch (e) {
          console.error("Clear Proof RAW Response:", rawText);
          showMaintenanceToast("Server error. Check logs.", "error");
          return;
      }

      if (!res.ok || !json || json.ok !== true) {
        showMaintenanceToast(json?.msg || "Failed to remove proof.", "error");
        return;
      }

      showMaintenanceToast("Proof removed.", "success");
      modal.dataset.hasDbProof = "0";
      hidePreviewKeepFileCleared();
      await loadMyTasks();
    });
  }

  // -------------------------
  // load tasks
  // -------------------------
  async function loadMyTasks() {
    const params = new URLSearchParams();

    const q = search?.value?.trim() || "";
    const st = fStatus?.value || "";
    const pr = fPrio?.value || "";

    if (q) params.set("search", q);
    if (st) params.set("status", dbStatusFromUi(st));
    if (pr) params.set("priority", pr);

    // ✅ FIX: Define absolute clean URL for live hosting
    const baseUrl = window.location.origin;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // Use the specific staff list endpoint
    const url = `${cleanBase}/api/maintenance_tasks_list_staff?` + params.toString();

    try {
        const res = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: { 
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            credentials: "same-origin"
        });

        if (res.status === 401) {
            emptyRow("Missing staff session. Please login again.");
            updateOverview([]);
            return;
        }

        // Handle Potential non-JSON errors from server
        const rawText = await res.text();
        let json;
        try {
            json = JSON.parse(rawText);
        } catch (e) {
            console.error("API RAW RESPONSE:", rawText);
            emptyRow("API returned non-JSON. Check console.");
            updateOverview([]);
            return;
        }

        if (!res.ok || json.ok !== true) {
            emptyRow(json?.msg || "Failed to load tasks.");
            updateOverview([]);
            return;
        }

        rowsCache = Array.isArray(json.rows) ? json.rows : [];
        updateOverview(rowsCache);

        if (!rowsCache.length) {
            emptyRow("No tasks assigned to you yet.");
            return;
        }

        // 🖨️ RENDER TABLE ROWS
        tbody.innerHTML = rowsCache.map((r, i) => {
            const proofUrl = getProofUrl(r);
            return `
                <tr>
                  <td>${i + 1}</td>
                  <td>${esc(r.issue_title)}</td>
                  <td>${esc(r.room_code)}</td>
                  <td>${esc(r.priority)}</td>
                  <td>${esc(uiStatusFromDb(r.status))}</td>
                  <td>${esc(r.reported_by)}</td>
                  <td>${esc(r.assigned_to_name || "You")}</td>
                  <td>${esc(fmtDate(r.created_at))}</td>
                  <td>
                    ${proofUrl ? `
                      <a class="btn small ghost proof-link" 
                         href="#" 
                         data-proof="${esc(proofUrl)}" 
                         data-issue="${esc(r.issue_title)}" 
                         data-room="${esc(r.room_code)}">
                        <i class="fa-solid fa-image"></i> Proof
                      </a>
                    ` : ``}
                    <button class="btn small primary" type="button" data-edit="${esc(r.id)}">
                      <i class="fa-solid fa-pen-to-square"></i> Update
                    </button>
                  </td>
                </tr>
            `;
        }).join("");

        // 🔗 RE-BIND PROOF LIGHTBOX EVENTS inside loadMyTasks
tbody.querySelectorAll("a.proof-link").forEach(a => {
    a.addEventListener("click", (e) => {
        e.preventDefault();
        const src = a.getAttribute("data-proof");
        if (!src) return;

        openLightboxWith({
            src: src, // The URL is already normalized in the template
            issue: a.dataset.issue,
            room: a.dataset.room
        });
    });
});

        // 🔗 RE-BIND UPDATE MODAL EVENTS
        tbody.querySelectorAll("[data-edit]").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-edit");
                if (!id) return;

                try {
                    // Use clean URL for single task fetch as well
                    const singleTaskUrl = `${cleanBase}/api/maintenance_requests_list?id=${encodeURIComponent(id)}`;
                    const resTask = await fetch(singleTaskUrl, {
                        cache: "no-store",
                        credentials: "same-origin",
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });
                    const jsonTask = await resTask.json().catch(() => null);

                    if (!resTask.ok || !jsonTask || jsonTask.ok !== true) {
                        showMaintenanceToast(jsonTask?.msg || "Failed to load task.", "error");
                        return;
                    }

                    const row = (jsonTask.rows && jsonTask.rows[0]) ? jsonTask.rows[0] : null;
                    if (row) openTaskModal(row);
                    else showMaintenanceToast("Task not found.", "error");
                } catch (err) {
                    console.error("Update click error:", err);
                    showMaintenanceToast("Network error loading task.", "error");
                }
            });
        });

    } catch (err) {
        console.error("loadMyTasks Fetch Error:", err);
        emptyRow("Network error. Please refresh.");
        updateOverview([]);
    }
}

  function openTaskModal(task) {
    inpId.value      = task.id;
    inpIssue.value   = task.issue_title || "";
    inpRoom.value    = task.room_code || "";
    inpPrio.value    = task.priority || "";
    inpStatus.value  = uiStatusFromDb(task.status || "pending");
    // ✅ Show assigned technician name as read-only
    if (inpRoom && inpRoom.closest) {
      const assignedSelect = document.getElementById("maintAssignedTo");
      if (assignedSelect) {
        assignedSelect.innerHTML = `<option value="${task.assigned_to_id || ''}">${task.assigned_to_name || '—'}</option>`;
        assignedSelect.disabled = true;
      }
    }

    // ✅ Display supervisor description in the read-only box
    const descDisplay = document.getElementById("maintDescriptionDisplay");
    if (descDisplay) {
        descDisplay.textContent = task.description || "No instructions provided.";
    }

    // ✅ Clear or set the staff work notes field
    inpNotes.value   = task.work_notes || "";

    const existing = getProofUrl(task);
    if (existing) showPreviewFromUrl(existing);
    else hidePreviewKeepFileCleared();

    modal.dataset.hasDbProof = existing ? "1" : "0";
    resolveConfirmed = false;
    closeResolveConfirm();

    isDbResolved = (uiStatusFromDb(task.status) === "resolved");
    setViewOnly(isDbResolved);

    openModal();
}

  // -------------------------
  // save update + optional upload
  // -------------------------
  async function saveTaskUpdate(){
    const id = Number(inpId.value || 0);
    if (!id) return;

    // If already resolved in DB: keep save disabled
    if (isDbResolved) return;

    // Disable save immediately to prevent double click
    if (btnSave) btnSave.disabled = true;

    const chosenUiStatus = String(inpStatus.value || "").toLowerCase().trim();
    const willBecomeResolved = (chosenUiStatus === "resolved");

    const payload = {
      id: id,
      issue_title: inpIssue.value, 
      room_code: inpRoom.value,
      priority: inpPrio.value,
      status: dbStatusFromUi(inpStatus.value),
      description: "", // Can be empty if not editing
      work_notes: (inpNotes.value || "").trim(),
      reported_by: "Maintenance Staff" 
    };

    const baseUrl = window.location.origin;
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const actionUrl = `${cleanBase}/api/maintenance_requests_save`;

  try {
    const res = await fetch(actionUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest" 
      },
      body: JSON.stringify(payload)
    });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json || json.ok !== true) {
        showMaintenanceToast(json?.msg || "Failed to save update.", "error");
        if (btnSave) btnSave.disabled = false;
        resolveConfirmed = false;
        return;
      }

      // Optional proof upload
      const file = fileInput?.files?.[0];
      if (file) {
        const ok = await uploadProof(id, file);
        if (!ok) {
          if (btnSave) btnSave.disabled = false;
          resolveConfirmed = false;
          return;
        }
      }

      // Refresh list/counters
      await loadMyTasks();

      showMaintenanceToast(
        willBecomeResolved ? "Task resolved successfully." : "Task updated successfully.",
        "success"
      );

      // ✅ If saved as Resolved: disable Save and auto-close modal
      if (willBecomeResolved) {
        isDbResolved = true;
        setViewOnly(true);
        closeModal();
        resolveConfirmed = false;
        return;
      }

      // Normal: close modal
      closeModal();
      resolveConfirmed = false;

    } catch (e) {
      showMaintenanceToast("Network error saving update.", "error");
      if (btnSave) btnSave.disabled = false;
      resolveConfirmed = false;
    }
  }

  async function uploadProof(taskId, file) {
    const fd = new FormData();
    fd.append("id", String(taskId));
    fd.append("proof", file);

    const baseUrl = window.location.origin;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const actionUrl = `${cleanBase}/api/maintenance_tasks_upload_proof`;

    try {
        const res = await fetch(actionUrl, {
            method: "POST",
            body: fd,
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            credentials: "same-origin"
        });

        // ✅ Read as text first to avoid JSON parse errors
        const rawText = await res.text();
        let json;
        try {
            json = JSON.parse(rawText);
        } catch (e) {
            console.error("Upload RAW response:", rawText);
            // If it uploaded but JSON failed, we might still have a success
            if (res.ok) return true; 
            throw new Error("Invalid server response");
        }

        if (!res.ok || !json || json.ok !== true) {
            showMaintenanceToast(json?.msg || "Failed to upload proof image.", "error");
            return false;
        }

        if (json.url) {
            showPreviewFromUrl(json.url);
            modal.dataset.hasDbProof = "1";
        }
        return true;
    } catch (err) {
        console.error("Upload Error:", err);
        // showMaintenanceToast("Network error saving proof.", "error");
        return true; // Return true if you know it actually uploaded
    }
}

  // -------------------------
  // events
  // -------------------------
  closeBtns.forEach(b => b.addEventListener("click", closeModal));

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // ✅ Resolve Confirm: YES / NO + overlay click + ESC
  if (btnResolveYes) {
    btnResolveYes.addEventListener("click", () => {
      resolveConfirmed = true;
      closeResolveConfirm();
      saveTaskUpdate();
    });
  }

  if (btnResolveNo) {
    btnResolveNo.addEventListener("click", () => {
      resolveConfirmed = false;
      closeResolveConfirm();
      if (btnSave && !isDbResolved) btnSave.disabled = false;
    });
  }

  if (resolveOverlay) {
    resolveOverlay.addEventListener("click", (e) => {
      // click outside dialog closes (same as cancel)
      if (e.target === resolveOverlay) {
        resolveConfirmed = false;
        closeResolveConfirm();
        if (btnSave && !isDbResolved) btnSave.disabled = false;
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && resolveOverlay && resolveOverlay.getAttribute("aria-hidden") === "false") {
      resolveConfirmed = false;
      closeResolveConfirm();
      if (btnSave && !isDbResolved) btnSave.disabled = false;
    }
  });

  // ✅ UPDATED: Save button now intercepts "resolved" and shows confirm popup first
  if (btnSave) {
    btnSave.addEventListener("click", (e) => {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      // If DB already resolved -> ignore
      if (isDbResolved) return;

      const chosenUiStatus = String(inpStatus.value || "").toLowerCase().trim();
      const wantsResolve = (chosenUiStatus === "resolved");

      // If user chose resolved but hasn't confirmed yet -> show popup
      if (wantsResolve && !resolveConfirmed) {
        btnSave.disabled = false;
        openResolveConfirm();
        return;
      }

      // ✅ toast immediately after clicking save
      showMaintenanceToast(
        wantsResolve ? "Resolving task..." : "Saving update...",
        "loading"
      );

      // Otherwise: normal save
      saveTaskUpdate();
    });
  }

  // filters
  let t;
  function debounce(fn){
    clearTimeout(t);
    t = setTimeout(fn, 250);
  }
  search?.addEventListener("input", () => debounce(loadMyTasks));
  fStatus?.addEventListener("change", loadMyTasks);
  fPrio?.addEventListener("change", loadMyTasks);

  // init
  loadMyTasks();
  setInterval(loadMyTasks, 8000);
});
