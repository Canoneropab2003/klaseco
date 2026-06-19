//maintenance.js (maintenance head)
// ==============================
// 🧰 KLASECO - Maintenance Requests JS (DB VERSION + AUTO SYNC + ROLE LOCK)
// ✅ Maintenance Head: can select Assigned To
// ✅ Maintenance Staff: Assigned To is locked (cannot change)
// ✅ Still loads technicians list for display
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const maintenanceSection = document.getElementById("maintenance");
  if (!maintenanceSection) return;

  // ------------------------------
  // ROLE DETECTION
  // ------------------------------
  // Put on <body data-role="maint_head"> OR <body data-role="maint_staff"> etc.
  const BODY_ROLE = (document.body.getAttribute("data-role") || "").trim().toLowerCase();

  const isMaintHead =
    BODY_ROLE === "maint_head" ||
    BODY_ROLE === "maintenance_head" ||
    BODY_ROLE === "mainthead" ||
    BODY_ROLE === "head" ||
    BODY_ROLE === "supervisor" ||
    BODY_ROLE === "maintenance head";

  const isMaintStaff =
    BODY_ROLE === "maint_staff" ||
    BODY_ROLE === "maintenance_staff" ||
    BODY_ROLE === "maintstaff" ||
    BODY_ROLE === "staff" ||
    BODY_ROLE === "technician" ||
    BODY_ROLE === "maintenance staff";

  // Fallback: if role missing, default to head (so you can test)
  const canAssignTech = isMaintHead || (!isMaintStaff && !BODY_ROLE);

  // ---------------------------------
  // SIMPLE TOAST FOR FEEDBACK
  // ---------------------------------
// ✅ Nice Maintenance Toast (Top-right, auto-hide)
function showMaintenanceToast(message, type = "success") {
  const ICONS = {
    success: "fa-circle-check",
    error: "fa-circle-xmark",
    loading: "fa-spinner"
  };

  // Create container once
  let wrap = document.getElementById("toast-maintenance");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toast-maintenance";
    document.body.appendChild(wrap);
  }

  // --- PREVENT MULTIPLE TOASTS ---
  // This removes ALL existing toasts regardless of the message
  wrap.innerHTML = ""; 

  // Toast element creation
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const iconClass = ICONS[type] || ICONS.success;

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${String(message || "").trim()}</span>
    <button type="button" class="toast-close" aria-label="Close">&times;</button>
  `;

  // Loading icon spin logic
  if (type === "loading") {
    toast.querySelector("i")?.classList.add("spin");
  }

  // Close logic (handles animation and removal)
  const close = () => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 220);
  };

  // Manual close button listener
  toast.querySelector(".toast-close").addEventListener("click", close);

  // Show newest on top in the container
  wrap.prepend(toast);

  // --- AUTOMATIC CLOSE ---
  // Now triggers for ALL types (success, error, AND loading)
  setTimeout(close, 3200);
}


  // ---------------------------------
  // PROOF IMAGE LIGHTBOX (VIEW PROOF)
  // ---------------------------------
  let proofLightbox, proofLightboxImg, proofLightboxCaption, proofLightboxCloseBtn;

  function createProofLightbox() {
    if (proofLightbox) return;

    proofLightbox = document.createElement("div");
    proofLightbox.className = "proof-lightbox-overlay";

    const inner = document.createElement("div");
    inner.className = "proof-lightbox-inner";

    proofLightboxImg = document.createElement("img");
    proofLightboxImg.alt = "Proof of work";
    proofLightboxImg.className = "proof-lightbox-img";

    const meta = document.createElement("div");
    meta.className = "proof-lightbox-meta";

    proofLightboxCaption = document.createElement("div");
    proofLightboxCaption.className = "proof-lightbox-caption";

    proofLightboxCloseBtn = document.createElement("button");
    proofLightboxCloseBtn.type = "button";
    proofLightboxCloseBtn.className = "proof-lightbox-close";
    proofLightboxCloseBtn.innerHTML = `<i class="fa-solid fa-xmark"></i><span>Close</span>`;

    proofLightboxCloseBtn.addEventListener("click", hideProofLightbox);
    proofLightbox.addEventListener("click", (e) => {
      if (e.target === proofLightbox) hideProofLightbox();
    });

    meta.appendChild(proofLightboxCaption);
    meta.appendChild(proofLightboxCloseBtn);
    inner.appendChild(proofLightboxImg);
    inner.appendChild(meta);
    proofLightbox.appendChild(inner);
    document.body.appendChild(proofLightbox);
  }

  function showProofLightbox(src, captionIssue, captionRoom) {
    if (!src) return;
    if (!proofLightbox) createProofLightbox();

    proofLightboxImg.src = src;

    const safeIssue = captionIssue || "Proof of Work";
    const safeRoom = captionRoom || "";

    proofLightboxCaption.innerHTML = `
      <span class="issue">${safeIssue}</span>
      ${safeRoom ? '<span class="dot">•</span>' : ""}
      ${safeRoom ? `<span class="room">${safeRoom}</span>` : ""}
    `;

    proofLightbox.style.display = "flex";
  }

  function hideProofLightbox() {
    if (!proofLightbox) return;
    proofLightbox.style.display = "none";
    proofLightboxImg.src = "";
  }

  // ------------------------------
  // DOM REFERENCES
  // ------------------------------
  const openModalBtn          = document.getElementById("btnOpenMaintModal");
  const maintenanceModal      = document.getElementById("maintenanceModal");
  const maintenanceForm       = document.getElementById("maintenanceForm");
  const maintenanceModalTitle = document.getElementById("maintenanceModalTitle");
  const saveBtn               = document.getElementById("btnSaveMaintRequest");
  const tableBody             = document.getElementById("maintenanceTableBody");

  const searchInput           = document.getElementById("maintenanceSearch");
  const statusFilterSelect    = document.getElementById("maintenanceFilterStatus");
  const priorityFilterSelect  = document.getElementById("maintenanceFilterPriority");

  const resolvedTodayEl       = document.getElementById("overview-maint-resolved-today");
  const pendingRequestsEl     = document.getElementById("overview-maint-pending");

  // Form fields
  const hiddenIdInput         = document.getElementById("maintReqId");
  const issueTitleInput       = document.getElementById("maintIssueTitle");
  const roomSelect            = document.getElementById("maintRoom");
  const prioritySelect        = document.getElementById("maintPriority");
  const statusSelect          = document.getElementById("maintStatus");
  const assignedToSelect      = document.getElementById("maintAssignedTo");
  const descriptionInput      = document.getElementById("maintDescription");

  // Optional hint span from HTML:
  const assignLockHint        = document.getElementById("assignLockHint");

  const closeModalButtons = maintenanceModal
    ? maintenanceModal.querySelectorAll("[data-close-maintenance-modal]")
    : [];

  const ROOM_OPTIONS = ["A303", "A304"];
  if (roomSelect) {
    roomSelect.innerHTML = ROOM_OPTIONS.map(r => `<option value="${r}">${r}</option>`).join("");
  }

  // ------------------------------
  // CUSTOM DELETE CONFIRM MODAL DOM
  // ------------------------------
  const confirmDeleteModal   = document.getElementById("maintConfirmDeleteModal");
  const confirmDeleteDetails = document.getElementById("maintConfirmDetails");
  const btnConfirmDelete     = document.getElementById("btnConfirmDeleteMaint");
  const btnCancelDelete      = document.getElementById("btnCancelDeleteMaint");
  let deleteTargetId         = null;

  // ------------------------------
  // STATE (DATA FROM DB)
  // ------------------------------
  let maintenanceRequests = [];
  const EMPTY_ROW_CLASS   = "maint-empty-row";

  // For staff: remember assignment at openModal and block changes
  let lockedAssignedToId = null;
  let lockedAssignedToName = "";

  // Prevent stacking multiple "change" listeners each time modal opens
  let assignedChangeLockBound = false;

  // ------------------------------
  // ROLE UI LOCK FOR ASSIGNED TO
  // ------------------------------
  function applyAssignedToRoleLock() {
    if (!assignedToSelect) return;

    if (canAssignTech) {
      assignedToSelect.disabled = false;
      assignedToSelect.classList.remove("is-locked");
      assignedToSelect.removeAttribute("data-locked");
      if (assignLockHint) assignLockHint.style.display = "none";
      // keep required as-is for head
      assignedToSelect.setAttribute("required", "required");
    } else {
      // staff: lock UI
      assignedToSelect.disabled = true;
      assignedToSelect.classList.add("is-locked");
      assignedToSelect.setAttribute("data-locked", "1");
      if (assignLockHint) assignLockHint.style.display = "inline";
      // staff: do NOT block submit
      assignedToSelect.removeAttribute("required");
    }
  }

  // ------------------------------
  // LOAD TECHNICIANS FROM DB
  // ------------------------------
  async function populateAssignedToSelect() {
    if (!assignedToSelect) return;

    const currentVal = assignedToSelect.value || "";
    assignedToSelect.innerHTML = `<option value="">Select Technician</option>`;

    try {
      const baseUrl = window.location.origin;
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const res = await fetch(`${cleanBase}/api/get_maintenance_technicians?ts=` + Date.now(), {
      cache: "no-store",
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      const data = await res.json();

      if (!data.ok) {
        console.error("[TECH] Failed to load technicians:", data.msg);
        return;
      }

      (data.rows || []).forEach((tech) => {
        const opt = document.createElement("option");
        opt.value = String(tech.id);
        opt.textContent = tech.name;
        assignedToSelect.appendChild(opt);
      });

      // Restore selection if possible
      if (currentVal) assignedToSelect.value = currentVal;
    } catch (err) {
      console.error("[TECH] Error loading technicians:", err);
    } finally {
      applyAssignedToRoleLock();
    }
  }

  // ------------------------------
  // LOAD TODAY'S REQUESTS FROM DB
  // ------------------------------
  async function fetchTodayRequests(silent = false) {
    try {
      const params = new URLSearchParams();
      const statusFilter   = (statusFilterSelect?.value || "").trim();
      const priorityFilter = (priorityFilterSelect?.value || "").trim();
      const searchText     = (searchInput?.value || "").trim();

      if (statusFilter)   params.append("status", statusFilter);
      if (priorityFilter) params.append("priority", priorityFilter);
      if (searchText)     params.append("search", searchText);

      // ✅ FIX: Remove .php
      const baseUrl = window.location.origin;
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const url = `${cleanBase}/api/maintenance_requests_list` + 
            (params.toString() ? "?" + params.toString() : "");

      const res = await fetch(url, { 
      cache: "no-store",
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
      const data = await res.json();

      if (!data.ok) {
        console.error("[MAINT] Failed to load requests:", data.msg);
        if (!silent) showMaintenanceToast("Failed to load maintenance requests.", "error");
        return;
      }

      maintenanceRequests = (data.rows || []).map(row => ({
        id:            Number(row.id),
        issueTitle:    row.issue_title,
        room:          row.room_code,
        priority:      row.priority,
        status:        row.status,
        reportedBy:    row.reported_by || "KLASECO Facilities Supervisor",
        assignedTo:    row.assigned_to_name || "\u2014",
        assignedToId:  row.assigned_to_id ? Number(row.assigned_to_id) : null,
        description:   row.description || "",
        workNotes:     row.work_notes || row.staff_notes || "",
        proofImage:    row.proof_image_url || row.proof_image || null,
        createdAt:     row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt:     row.updated_at ? new Date(row.updated_at) : new Date()
      }));

      applyFiltersAndRender();
      updateOverviewCounters(); // ✅ ADD THIS LINE
    } catch (err) {
      console.error("[MAINT] Error fetching requests:", err);
      if (!silent) showMaintenanceToast("Network error loading maintenance requests.", "error");
    }
  }

  // ------------------------------
  // SAVE (CREATE / UPDATE) INTO DB
  // ------------------------------
  async function saveRequestToServer() {
    const idVal = hiddenIdInput.value ? Number(hiddenIdInput.value) : 0;

    let assignedId = assignedToSelect?.value ? Number(assignedToSelect.value) : 0;
    let assignedName = assignedToSelect?.selectedOptions?.[0]
      ? assignedToSelect.selectedOptions[0].textContent
      : "";

    if (!canAssignTech) {
      assignedId = lockedAssignedToId ? Number(lockedAssignedToId) : 0;
      assignedName = lockedAssignedToName || assignedName || "";
    }

    const payload = {
      id:               idVal,
      issue_title:      issueTitleInput.value.trim(),
      room_code:        roomSelect.value,
      priority:         prioritySelect.value,
      status:           statusSelect.value,
      assigned_to_id:   assignedId || null,
      assigned_to_name: assignedName || null,
      description:      descriptionInput.value.trim(),
      reported_by:      "KLASECO Facilities Supervisor"
    };

    try {
      /* ======================================================
         🚀 FIX: Define absolute clean URL within function scope
      ====================================================== */
      const baseUrl = window.location.origin;
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const actionUrl = `${cleanBase}/api/maintenance_requests_save`;

      const res = await fetch(actionUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest" 
        },
        body: JSON.stringify(payload)
      });

      // Check if response is valid JSON
      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        console.error("[MAINT] Invalid JSON response:", rawText);
        throw new Error("Server returned an invalid response format.");
      }

      if (!res.ok || !data.ok) {
        const msg = data?.msg || "Failed to save maintenance request.";
        showMaintenanceToast(msg, "error");
        return;
      }

      showMaintenanceToast(
        idVal > 0 ? "Maintenance request updated." : "New maintenance request created.",
        "success"
      );

      closeModal();
      fetchTodayRequests(true);
    } catch (err) {
      console.error("[MAINT] Save error details:", err);
      showMaintenanceToast("Network error saving maintenance request.", "error");
    }
  }

  // ------------------------------
  // DELETE REQUEST
  // ------------------------------
  async function deleteRequestByIdFromServer(id) {
    try {
      /* ======================================================
         🚀 FIX FOR LIVE HOSTING: Use absolute clean URL
      ====================================================== */
      const baseUrl = window.location.origin;
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      
      // Target the clean URL (no .php) to prevent data-stripping redirects
      const actionUrl = `${cleanBase}/api/maintenance_requests_delete`;

      const res = await fetch(actionUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest" 
        },
        body: JSON.stringify({ id: Number(id) })
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        const msg = (data && data.msg) || "Failed to delete request.";
        console.error("[MAINT] Delete error:", msg);
        showMaintenanceToast(msg, "error");
        return;
      }

      showMaintenanceToast("Maintenance request deleted.", "success");
      fetchTodayRequests(true);
    } catch (err) {
      console.error("[MAINT] Network error deleting request:", err);
      showMaintenanceToast("Network error deleting maintenance request.", "error");
    }
  }

  // ------------------------------
  // UI HELPERS
  // ------------------------------
  async function openModal(mode = "create", req = null) {
    // ✅ Reset view-only locks when opening normally
    if (issueTitleInput)   issueTitleInput.readOnly          = false;
    if (roomSelect)        roomSelect.disabled               = false;
    if (prioritySelect)    prioritySelect.disabled           = false;
    if (statusSelect)      statusSelect.disabled             = false;
    if (descriptionInput)  descriptionInput.readOnly         = false;
    if (saveBtn)           saveBtn.style.display             = "";
    // ✅ Remove any previously injected proof section
    const prevProof = document.getElementById("viewProofSection");
    if (prevProof) prevProof.remove();

    await populateAssignedToSelect();

    if (mode === "edit" && req) {
      maintenanceModalTitle.textContent = "Edit Maintenance Request";
      hiddenIdInput.value    = req.id;
      issueTitleInput.value  = req.issueTitle;
      prioritySelect.value   = req.priority;
      statusSelect.value     = req.status;
      descriptionInput.value = req.description || "";
      roomSelect.value       = ROOM_OPTIONS.includes(req.room) ? req.room : ROOM_OPTIONS[0];

      assignedToSelect.value = req.assignedToId ? String(req.assignedToId) : "";

      // Lock values for staff
      lockedAssignedToId = req.assignedToId ? String(req.assignedToId) : "";
      lockedAssignedToName = req.assignedTo && req.assignedTo !== "\u2014" ? req.assignedTo : "";
    } else {
      maintenanceModalTitle.textContent = "New Maintenance Request";
      maintenanceForm.reset();
      hiddenIdInput.value  = "";
      prioritySelect.value = "medium";
      statusSelect.value   = "pending";
      roomSelect.value     = ROOM_OPTIONS[0];

      // New request: staff must not assign (lock to blank)
      assignedToSelect.value = "";
      lockedAssignedToId = "";
      lockedAssignedToName = "";
    }

    applyAssignedToRoleLock();

    // One-time binding: if staff ever changes via devtools, revert
    if (assignedToSelect && !canAssignTech && !assignedChangeLockBound) {
      assignedChangeLockBound = true;
      assignedToSelect.addEventListener("change", () => {
        assignedToSelect.value = lockedAssignedToId || "";
      });
    }

    maintenanceModal.classList.add("show");
  }

  function closeModal() {
    maintenanceModal.classList.remove("show");
    // ✅ Clean up view-only proof section if it was injected
    const proofSection = document.getElementById("viewProofSection");
    if (proofSection) proofSection.remove();
    // Reset scroll
    const modalBody = maintenanceForm?.closest(".modal-body") || maintenanceForm;
    if (modalBody) { modalBody.style.overflowY = ""; modalBody.style.maxHeight = ""; }
  }

  function formatDateTime(dt) {
    const d = dt instanceof Date ? dt : new Date(dt);
    return d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  }

  function createBadge(cls, txt) {
    const span = document.createElement("span");
    span.className = `badge badge-${cls}`;
    span.textContent = txt;
    return span;
  }

  function clearTableBody() {
    if (!tableBody) return;
    while (tableBody.firstChild) tableBody.removeChild(tableBody.firstChild);
  }

  function addEmptyRowIfNeeded(rows) {
    if (!tableBody) return;
    if (rows.length > 0) return;
    const tr = document.createElement("tr");
    tr.className = EMPTY_ROW_CLASS;
    tr.innerHTML = `
      <td colspan="9" class="t-empty-cell">
        <div class="t-empty-center">No maintenance requests yet for today.</div>
      </td>`;
    tableBody.appendChild(tr);
  }

  function renderTable(list) {
    if (!tableBody) return;

    clearTableBody();

    list.forEach((req, i) => {
      const tr = document.createElement("tr");
      tr.dataset.id = req.id;

      const proofBtnHtml = req.proofImage
        ? `
          <button class="btn ghost btn-view-proof" data-id="${req.id}" title="View Proof">
            <i class="fa-solid fa-image"></i>
          </button>
        `
        : "";

      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${req.issueTitle}</td>
        <td>${req.room}</td>
        <td></td>
        <td></td>
        <td>${req.reportedBy}</td>
        <td>${req.assignedTo || "\u2014"}</td>
        <td>${formatDateTime(req.createdAt)}</td>
        <td>
          ${proofBtnHtml}
          <button class="btn ghost btn-edit-maint" data-id="${req.id}">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn ghost btn-delete-maint" data-id="${req.id}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>`;

      tr.children[3].appendChild(createBadge(`priority-${req.priority}`, req.priority));
      tr.children[4].appendChild(createBadge(`status-${req.status}`, req.status));
      tableBody.appendChild(tr);
    });

    addEmptyRowIfNeeded(list);
    updateOverviewCounters();
  }

  function applyFiltersAndRender() {
    let filtered = [...maintenanceRequests];

    const text = (searchInput?.value || "").toLowerCase().trim();
    const s = (statusFilterSelect?.value || "").trim();
    const p = (priorityFilterSelect?.value || "").trim();

    if (text) filtered = filtered.filter(r => (r.issueTitle || "").toLowerCase().includes(text));
    if (s) filtered = filtered.filter(r => r.status === s);
    if (p) filtered = filtered.filter(r => r.priority === p);

    renderTable(filtered);
  }

  // ðŸ”„ OVERVIEW COUNTERS
  function updateOverviewCounters() {
      if (!resolvedTodayEl || !pendingRequestsEl) return;
    
      let resolved = 0;
      let pending  = 0;  // only status === "pending"
      let active   = 0;  // all non-resolved (pending + in-progress)
    
      maintenanceRequests.forEach(r => {
        const status = (r.status || "").toLowerCase();
        if (status === "resolved") {
          resolved++;
        } else {
          active++;
          if (status === "pending") pending++;
        }
      });
    
      resolvedTodayEl.textContent   = resolved || "\u2014";
      pendingRequestsEl.textContent = pending  || "\u2014";
    
      // NOTE: overview-schedule-count is controlled by maintenanceaccounts.js
      // (shows number of active maintenance staff, not task count)
    
      updateNotificationBell();
    }

  // ------------------------------
  // EVENTS
  // ------------------------------
  if (openModalBtn) openModalBtn.addEventListener("click", () => openModal("create"));

  closeModalButtons.forEach(btn => btn.addEventListener("click", () => closeModal()));

  if (maintenanceModal) {
    maintenanceModal.addEventListener("click", e => {
      if (e.target === maintenanceModal) closeModal();
    });
  }

  // SAVE BUTTON
  if (saveBtn) {
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();

      // staff: ensure we don't block submit
      if (!canAssignTech && assignedToSelect) {
        assignedToSelect.removeAttribute("required");
      }

      if (!maintenanceForm.checkValidity()) {
        maintenanceForm.reportValidity();
        return;
      }

      saveRequestToServer();
    });
  }

  // TABLE ACTION BUTTONS
  if (tableBody) {
    tableBody.addEventListener("click", e => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.id;
      if (!id) return;

      if (btn.classList.contains("btn-edit-maint")) {
        const req = maintenanceRequests.find(r => r.id === Number(id));
        if (!req) return;
        openModal("edit", req);
      }

      if (btn.classList.contains("btn-delete-maint")) {
        const req = maintenanceRequests.find(r => r.id === Number(id));
        if (!req) return;

        if (!confirmDeleteModal || !btnConfirmDelete || !btnCancelDelete || !confirmDeleteDetails) {
          if (window.confirm("Delete this maintenance request?")) {
            deleteRequestByIdFromServer(id);
          }
          return;
        }

        deleteTargetId = Number(id);

        const detailsHtml = `
          Issue: <strong>${req.issueTitle}</strong><br>
          Room: <strong>${req.room}</strong><br>
          Priority: <strong>${req.priority}</strong><br>
          Assigned To: <strong>${req.assignedTo || "Unassigned"}</strong>
        `;

        confirmDeleteDetails.innerHTML = detailsHtml;
        confirmDeleteModal.classList.add("show");
      }

      if (btn.classList.contains("btn-view-proof")) {
        const req = maintenanceRequests.find(r => r.id === Number(id));
        if (!req) return;

        // ✅ Open full view-only modal instead of just the image
        openModal("edit", req);

        // Lock all fields as view-only
        if (issueTitleInput)   issueTitleInput.readOnly          = true;
        if (roomSelect)        roomSelect.disabled               = true;
        if (prioritySelect)    prioritySelect.disabled           = true;
        if (statusSelect)      statusSelect.disabled             = true;
        if (assignedToSelect)  assignedToSelect.disabled         = true;
        if (descriptionInput)  descriptionInput.readOnly         = true;
        if (saveBtn)           saveBtn.style.display             = "none";
        if (maintenanceModalTitle) maintenanceModalTitle.innerHTML =
          `<i class="fa-solid fa-eye"></i> View Task (Resolved)`;

        // ✅ Inject Work Notes + Proof of Work Preview (view-only)
        const existingProofSection = document.getElementById("viewProofSection");
        if (existingProofSection) existingProofSection.remove();

        // Make modal body scrollable
        const modalBody = maintenanceForm?.closest(".modal-body") || maintenanceForm;
        if (modalBody) {
          modalBody.style.overflowY  = "auto";
          modalBody.style.maxHeight  = "70vh";
        }

        const proofSection = document.createElement("div");
        proofSection.id = "viewProofSection";
        proofSection.style.cssText = "margin-top:18px; padding-top:14px; border-top:1px solid #e2e8f0;";

        const workNotes = req.workNotes || "";
        const proofSrc  = req.proofImage  || "";

        proofSection.innerHTML = `
          ${workNotes ? `
            <div style="margin-bottom:14px;">
              <p style="font-size:11px; font-weight:600; letter-spacing:.06em; color:#64748b; text-transform:uppercase; margin-bottom:6px;">
                <i class="fa-solid fa-pen-to-square" style="margin-right:4px;"></i> Your Work Notes / Updates
              </p>
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; font-size:14px; color:#334155; white-space:pre-wrap;">${workNotes}</div>
            </div>
          ` : `
            <div style="margin-bottom:14px;">
              <p style="font-size:11px; font-weight:600; letter-spacing:.06em; color:#64748b; text-transform:uppercase; margin-bottom:6px;">
                <i class="fa-solid fa-pen-to-square" style="margin-right:4px;"></i> Your Work Notes / Updates
              </p>
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; font-size:13px; color:#94a3b8; font-style:italic;">No work notes submitted.</div>
            </div>
          `}
          ${proofSrc ? `
            <div>
              <p style="font-size:11px; font-weight:600; letter-spacing:.06em; color:#64748b; text-transform:uppercase; margin-bottom:8px; text-align:center;">
                Proof of Work Preview
              </p>
              <div style="text-align:center;">
                <img src="${proofSrc}" alt="Proof of Work"
                  style="max-width:100%; max-height:260px; border-radius:10px; border:1px solid #e2e8f0; object-fit:contain; cursor:pointer;"
                  title="Click to enlarge"
                  onclick="window.open('${proofSrc}','_blank')"
                />
              </div>
            </div>
          ` : ""}
        `;

        if (maintenanceForm) maintenanceForm.appendChild(proofSection);
      }
    });
  }

  [searchInput, statusFilterSelect, priorityFilterSelect].forEach(el =>
    el && el.addEventListener("input", () => fetchTodayRequests(true))
  );

  // DELETE CONFIRM MODAL EVENTS
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener("click", () => {
      if (deleteTargetId !== null) {
        deleteRequestByIdFromServer(deleteTargetId);
        deleteTargetId = null;
      }
      if (confirmDeleteModal) confirmDeleteModal.classList.remove("show");
    });
  }

  if (btnCancelDelete) {
    btnCancelDelete.addEventListener("click", () => {
      deleteTargetId = null;
      if (confirmDeleteModal) confirmDeleteModal.classList.remove("show");
    });
  }

  if (confirmDeleteModal) {
    confirmDeleteModal.addEventListener("click", e => {
      if (e.target === confirmDeleteModal) {
        deleteTargetId = null;
        confirmDeleteModal.classList.remove("show");
      }
    });
  }

  // ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (proofLightbox && proofLightbox.style.display === "flex") {
        hideProofLightbox();
      } else if (confirmDeleteModal && confirmDeleteModal.classList.contains("show")) {
        deleteTargetId = null;
        confirmDeleteModal.classList.remove("show");
      } else if (maintenanceModal && maintenanceModal.classList.contains("show")) {
        closeModal();
      }
    }
  });

  // ------------------------------
  // ðŸ”„ SILENT AUTO-REFRESH EVERY 15s
  // ------------------------------
  setInterval(() => {
    fetchTodayRequests(true);
  }, 15000);

  // ------------------------------
  // INITIAL LOAD
  // ------------------------------
  (async function init() {
    applyAssignedToRoleLock();
    await populateAssignedToSelect();
    await fetchTodayRequests(false);
  })();

  // =========================================================
  // 📱 MOBILE MENU TOGGLE LOGIC (WITH OVERLAY SUPPORT)
  // =========================================================
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay'); // 👈 Grabs the dark background

  if (menuToggle && sidebar) {
    // 1. Toggle the menu AND the overlay when the hamburger is clicked
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation(); 
      sidebar.classList.toggle('active');
      if (overlay) overlay.classList.toggle('active');
    });

    // 2. Automatically close if the user clicks outside (like tapping the dark overlay)
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
          sidebar.classList.remove('active');
          if (overlay) overlay.classList.remove('active');
        }
      }
    });

    // 3. Automatically close the menu when a link inside it is clicked
    const menuItems = sidebar.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('active');
          if (overlay) overlay.classList.remove('active');
        }
      });
    });
  }
  
  // --- NEW NOTIFICATION FUNCTIONS ---
    function updateNotificationBell() {
      const notifBadge = document.getElementById("notifBadge");
      if (!notifBadge) return;
    
      // Filter requests that are still 'pending'
      const pendingCount = maintenanceRequests.filter(r => r.status === "pending").length;
    
      if (pendingCount > 0) {
        notifBadge.textContent = pendingCount;
        notifBadge.style.display = "inline-flex";
      } else {
        notifBadge.style.display = "none";
      }
    }
    
    const bellBtn = document.querySelector(".bell-btn");
    if (bellBtn) {
      bellBtn.addEventListener("click", () => {
        const pending = maintenanceRequests.filter(r => r.status === "pending");
        
        if (pending.length === 0) {
          showMaintenanceToast("No pending notifications.", "success");
        } else {
          showMaintenanceToast(`You have ${pending.length} pending maintenance tasks.`, "loading");
        }
      });
    }
    
    const notificationBtn = document.getElementById('notificationBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifList = document.getElementById('notifList');
    const notifCountTitle = document.getElementById('notifCountTitle');
    
    // Toggle Dropdown visibility
    notificationBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('show');
      renderNotifList();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      notifDropdown.classList.remove('show');
    });
    
    function renderNotifList() {
      // Filter for pending requests from your existing maintenanceRequests array
      const pending = maintenanceRequests.filter(r => r.status === "pending");
      
      notifCountTitle.textContent = `${pending.length} New Notifications`;
      notifList.innerHTML = "";
    
      if (pending.length === 0) {
        notifList.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">No new tasks.</div>';
        return;
      }
    
      pending.forEach(req => {
        const item = document.createElement('div');
        item.className = 'notif-item';
        item.innerHTML = `
          <span class="notif-title">New Task: ${req.issueTitle}</span>
          <span class="notif-meta">Room ${req.room} • ${formatDateTime(req.createdAt)}</span>
        `;
        notifList.appendChild(item);
      });
    }
    
    // --- NOTIFICATION ACTIONS ---

    // 1. SET ALL AS READ
    document.getElementById('markAllRead')?.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Hide the badge and reset the count
      const badge = document.getElementById('notifBadge');
      if (badge) {
        badge.style.display = 'none';
        badge.textContent = '0';
      }
      
      // Clear the list and update the title
      const notifList = document.getElementById('notifList');
      const notifCountTitle = document.getElementById('notifCountTitle');
      if (notifList) notifList.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">No new tasks.</div>';
      if (notifCountTitle) notifCountTitle.textContent = '0 New Notifications';
      
      showMaintenanceToast("All notifications marked as read.", "success");
    });
    
    // 2. SEE ALL NOTIFICATIONS
    document.querySelector('.btn-see-all')?.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Redirect the user to the Maintenance Task section
      // Since you are on the Dashboard, this simulates clicking the sidebar link
      const maintenanceTaskLink = document.querySelector('.menu-item[href*="maintenance"]');
      if (maintenanceTaskLink) {
        maintenanceTaskLink.click();
      } else {
        // Fallback: Show the Maintenance Task panel if you use a SPA-style toggle
        const taskSection = document.getElementById('maintenance');
        if (taskSection) {
          document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
          taskSection.style.display = 'block';
        }
      }
      
      // Close the dropdown
      document.getElementById('notifDropdown')?.classList.remove('show');
    });
});