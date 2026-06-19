// =============================================
// 🧑‍🏫 KLASECO - Teachers Panel (Supabase-backed)
// ✅ FIXED: Proper enrollment flow:
//           1. CLEAR_ALL_TEMPLATES  — wipe sensor
//           2. ENROLL               — 2-scan + createModel() → 1 merged ID
//           3. MATCH_MODE           — sent automatically after enrollment
// =============================================
let tempBioID = null;
let tempBioTemplate = "";

// ─── Enrollment session — now only 1 scan result (2 scans merged into 1 ID) ───
let enrollmentSession = {
  id1: null,  template1: "",
  scansDone: 0
};

function resetEnrollmentSession() {
  enrollmentSession = {
    id1: null,  template1: "",
    scansDone: 0
  };
}

function showToast(message, type = "error") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const existingToast = container.querySelector(".toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.4s";
      setTimeout(() => toast.remove(), 400);
    }
  }, 2500);
}

let teachersLoadingToast = null;

function showTeachersLoadingToast(message = "Loading...") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  if (teachersLoadingToast) {
    teachersLoadingToast.remove();
    teachersLoadingToast = null;
  }

  const toast = document.createElement("div");
  toast.className = "toast loading";
  toast.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>${message}</span>`;
  container.appendChild(toast);
  teachersLoadingToast = toast;
}

function hideTeachersLoadingToast() {
  if (!teachersLoadingToast) return;
  teachersLoadingToast.style.opacity = "0";
  teachersLoadingToast.style.transition = "opacity 0.3s";
  setTimeout(() => {
    teachersLoadingToast?.remove();
    teachersLoadingToast = null;
  }, 300);
}

function logTeacherEvent(event, detail) {
  if (typeof addSystemLog === "function") {
    addSystemLog("Teacher", event, detail);
  } else {
    console.log(`[Teacher][${event}] ${detail}`);
  }
}

function setActiveMenu(sectionName) {
  document.querySelectorAll(".menu-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.section === sectionName);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // ==============================
  // API ENDPOINTS
  // ==============================
  const API_TEACHERS_LIST   = "api/teachers_list.php";
  const API_TEACHERS_SAVE   = "api/teachers_save.php";
  const API_TEACHERS_DELETE = "api/teachers_delete.php";

  // ==============================
  // FORM + TABLE ELEMENTS
  // ==============================
  const formFields = {
    id:        document.querySelector("#t-id"),
    email:     document.querySelector("#t-email"),
    name:      document.querySelector("#t-name"),
    phone:     document.querySelector("#t-phone"),
    program:   document.querySelector("#t-program"),
    status:    document.querySelector("#t-status"),
    rfid:      document.querySelector("#t-rfid"),
    biometric: document.querySelector("#t-biometric"),
  };

  const addBtn            = document.querySelector(".tbtn-primary");
  const clearBtn          = document.querySelector(".tbtn-clear");
  const tableBody         = document.querySelector(".t-table tbody");
  const teachersCountEl   = document.getElementById("overview-teachers-count");
  const EMPTY_ROW_CLASS   = "t-empty-row";

  // ==============================
  // BIOMETRIC SECTION ELEMENTS
  // ==============================
  const sectionForm = document.getElementById("teachersaccounts");
  const sectionBio  = document.getElementById("biometric-registration");

  const bioStatusText = document.getElementById("device-status");
  const bioConnectBtn = document.getElementById("btn-connect");
  const bioEnrollBtn  = document.getElementById("btn-enroll");
  const bioScanIcon   = document.getElementById("scan-icon");
  const bioTitle      = document.getElementById("instruction-title");
  const bioText       = document.getElementById("instruction-text");
  const bioNameDisplay= document.getElementById("bio-teacher-name");

  const bioStep1    = document.getElementById("step-1");
  const bioStep2    = document.getElementById("step-2");
  const bioStep3    = document.getElementById("step-3");
  const bioProgress = document.querySelector(".scan-progress");
  const bioScanBtn  = document.getElementById("scan-btn");

  let currentBiometricTemplate = "";
  let socket = null;
  let enrollInitTimeout = null;   // guards against stuck "Initializing..." state

  // ──────────────────────────────────────────────────────
  // CANCEL ENROLLMENT — sends CANCEL_ENROLL to Arduino
  // ──────────────────────────────────────────────────────
  function cancelEnrollment() {
    if (enrollInitTimeout) { clearTimeout(enrollInitTimeout); enrollInitTimeout = null; }
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send("CANCEL_ENROLL");
      console.log("[Enroll] Sent CANCEL_ENROLL");
    }
    if (bioEnrollBtn) bioEnrollBtn.disabled = false;
    if (bioTitle) bioTitle.innerText = "Ready to Scan";
    if (bioText)  bioText.innerText  = "Click 'Start Enrollment' to capture 2 fingerprint scans.";
    if (bioScanIcon) {
      bioScanIcon.classList.remove("scanning-active", "error", "success");
    }
    if (bioProgress) bioProgress.classList.remove("active");
    resetEnrollmentSession();
  }

  // ──────────────────────────────────────────────────────
  // STATUS VISIBILITY HELPER
  // ──────────────────────────────────────────────────────
  function updateStatusVisibility(isEdit) {
    const statusSelect = document.querySelector("#t-status");
    if (!statusSelect) return;

    const inactiveOpt  = statusSelect.querySelector('option[value="Inactive"]');
    const suspendedOpt = statusSelect.querySelector('option[value="Suspended"]');

    if (isEdit) {
      if (inactiveOpt)  { inactiveOpt.hidden  = false; inactiveOpt.disabled  = false; }
      if (suspendedOpt) { suspendedOpt.hidden = false; suspendedOpt.disabled = false; }
    } else {
      if (inactiveOpt)  { inactiveOpt.hidden  = true;  inactiveOpt.disabled  = true;  }
      if (suspendedOpt) { suspendedOpt.hidden = true;  suspendedOpt.disabled = true;  }
      statusSelect.value = "Active";
    }
  }

  function ensureSectionsExist() {
    if (!sectionForm || !sectionBio) {
      console.error("❌ Missing sections:", { sectionForm, sectionBio });
      showToast("Missing section IDs.", "error");
      return false;
    }
    return true;
  }

  // ──────────────────────────────────────────────────────
  // BIO UI HELPERS
  // ──────────────────────────────────────────────────────
  function resetBioUI() {
    if (bioEnrollBtn) {
      bioEnrollBtn.disabled = !(socket && socket.readyState === WebSocket.OPEN);
    }

    if (bioScanIcon) {
      bioScanIcon.className = "fa-solid fa-fingerprint scan-placeholder";
      bioScanIcon.classList.remove("scanning-active", "error", "success");
    }

    if (bioProgress) bioProgress.classList.remove("active");

    // ✅ Only show 2 steps since Arduino now does 2-scan enrollment
    [bioStep1, bioStep2].forEach((step) => {
      if (!step) return;
      step.classList.remove("active-step", "completed");
      step.style.backgroundColor = "#ddd";
      step.style.color = "#666";
      step.innerHTML = step.id.split("-")[1];
    });

    // Hide step 3 — no longer needed
    if (bioStep3) bioStep3.style.display = "none";

    if (bioTitle) bioTitle.innerText = "Ready to Scan";
    if (bioText) {
      bioText.innerText =
        socket && socket.readyState === WebSocket.OPEN
          ? "Click 'Start Enrollment' to capture 2 fingerprint scans."
          : "Connect the sensor to begin enrollment.";
    }
  }

  function markStepDone(element) {
    if (!element) return;
    element.style.backgroundColor = "#4CAF50";
    element.style.color = "white";
    element.innerHTML = '<i class="fa-solid fa-check"></i>';
  }

  function updateScanStepUI(stepNumber, scanLabel) {
    [bioStep1, bioStep2].forEach((el) =>
      el && el.classList.remove("active-step")
    );

    if (bioProgress) bioProgress.classList.add("active");
    if (bioScanIcon) {
      bioScanIcon.classList.remove("scanning-active", "error", "success");
      void bioScanIcon.offsetWidth;
      bioScanIcon.classList.add("scanning-active");
    }

    [bioStep1, bioStep2].forEach(s => {
      if (s) s.style.opacity = "1";
    });

    const stepEl = [null, bioStep1, bioStep2][stepNumber];
    if (stepEl) {
      stepEl.classList.add("active-step");
      stepEl.style.backgroundColor = "";
      stepEl.style.color = "";
    }

    if (bioTitle) bioTitle.innerText = scanLabel || `Step ${stepNumber} of 2`;
    if (bioText)  bioText.innerHTML  = "Place your finger <b>FLAT</b> on the sensor.";
  }

  // ──────────────────────────────────────────────────────
  // OPEN / CLOSE BIOMETRIC
  // ──────────────────────────────────────────────────────
  function openBiometricInternal(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!ensureSectionsExist()) return;

    document.querySelectorAll(".page-section").forEach((sec) => {
      sec.classList.remove("active");
      sec.style.display = "none";
    });

    sectionBio.classList.add("active");
    sectionBio.style.display = "block";
    sectionForm.classList.remove("active");
    sectionForm.style.display = "none";

    setActiveMenu("teachersaccounts");

    const currentName = formFields.name ? formFields.name.value : "";
    if (bioNameDisplay)
      bioNameDisplay.value = currentName || "Registering New User...";

    resetBioUI();
    if (enrollmentSession.scansDone === 0) {
      resetEnrollmentSession();
    }
  }

  function closeBiometricInternal(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!ensureSectionsExist()) return;

    cancelEnrollment();   // ← stop any active scan on Arduino + reset UI

    document.querySelectorAll(".page-section").forEach((sec) => {
      sec.classList.remove("active");
      sec.style.display = "none";
    });

    sectionForm.classList.add("active");
    sectionForm.style.display = "block";
    sectionBio.classList.remove("active");
    sectionBio.style.display = "none";

    setActiveMenu("teachersaccounts");
    resetBioUI();
  }

  window.openBiometric   = openBiometricInternal;
  window.closeBiometric  = closeBiometricInternal;

  if (bioScanBtn)
    bioScanBtn.addEventListener("click", openBiometricInternal);

  window.connectSensor       = () => bioConnectBtn?.click();
  window.startMultiAngleScan = () => bioEnrollBtn?.click();

  // ──────────────────────────────────────────────────────
  // A. CONNECT TO BRIDGE
  // ──────────────────────────────────────────────────────
  if (bioConnectBtn) {
    bioConnectBtn.addEventListener("click", () => {
      bioConnectBtn.innerText = "Connecting...";

      try {
        socket = new WebSocket("wss://www.klaseco.com/bridge");

        socket.onopen = () => {
          bioConnectBtn.style.display = "none";
          if (bioStatusText) {
            bioStatusText.innerHTML = '<i class="fa-solid fa-link"></i> Bridge Online';
            bioStatusText.className = "status-badge status-connected";
          }
          if (bioEnrollBtn) bioEnrollBtn.disabled = false;
          showToast("Connected to Klaseco Bridge", "success");
        };

        socket.onerror = () => {
          if (bioStatusText) {
            bioStatusText.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Connection Failed';
          }
          bioConnectBtn.innerText = "Retry Connect";
          showToast("Bridge connection failed.", "error");
        };

        socket.onclose = () => {
          if (bioStatusText) {
            bioStatusText.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Bridge Offline';
            bioStatusText.className = "status-badge status-disconnected";
          }
          bioConnectBtn.style.display = "block";
          bioConnectBtn.innerText = "Connect";
        };

        socket.onmessage = (event) => {
          const incoming = String(event.data || "").trim();
          if (!incoming) return;
          console.log("📥 Incoming:", incoming);
          handleSocketMessage(incoming);
        };

      } catch (e) {
        console.error("WebSocket init error:", e);
        showToast("Could not initiate WebSocket.", "error");
      }
    });
  }

  // ──────────────────────────────────────────────────────
  // B. START ENROLL BUTTON
  // Just sends ENROLL — no clearing. Templates are kept
  // safe in the DB. Clearing is never done automatically.
  // ──────────────────────────────────────────────────────
  if (bioEnrollBtn) {
    bioEnrollBtn.addEventListener("click", () => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        showToast("Not connected to sensor.", "error");
        return;
      }

      resetEnrollmentSession();
      if (enrollInitTimeout) { clearTimeout(enrollInitTimeout); enrollInitTimeout = null; }

      bioEnrollBtn.disabled = true;
      if (bioProgress) bioProgress.classList.add("active");
      if (bioTitle)    bioTitle.innerText = "Initializing...";
      if (bioText)     bioText.innerText  = "Prepare your finger — 2 scans required.";

      console.log("[Enroll] Sending ENROLL");
      socket.send("ENROLL");

      // Safety net — if Arduino doesn't acknowledge within 5 s, reset UI
      enrollInitTimeout = setTimeout(() => {
        enrollInitTimeout = null;
        // Only reset if still stuck on Initializing (no step received yet)
        if (bioTitle && bioTitle.innerText === "Initializing...") {
          console.warn("[Enroll] No response from sensor — resetting UI");
          if (bioEnrollBtn) bioEnrollBtn.disabled = false;
          if (bioProgress)  bioProgress.classList.remove("active");
          if (bioTitle)     bioTitle.innerText = "Sensor Not Responding";
          if (bioText)      bioText.innerText  = "The sensor didn't respond. Try clicking Start Enrollment again.";
        }
      }, 5000);
    });
  }

  // ──────────────────────────────────────────────────────
  // C. HANDLE MESSAGES FROM ENROLLMENT ESP8266
  //
  //  Arduino sends (2-scan merged enrollment):
  //    [ENROLL]STEP:1_WAITING
  //    [ENROLL]STEP:LIFT_FINGER
  //    [ENROLL]STEP:SCAN2_WAITING
  //    [ENROLL]RESULT:SUCCESS:<id>:<hex>    ← merged template done
  //    [ENROLL]RESULT:ALL_DONE:<id>         ← single merged ID
  //    [ENROLL]RESULT:FAIL:<reason>
  // ──────────────────────────────────────────────────────
  function handleSocketMessage(message) {
    const raw = String(message || "").trim();

    if (raw.includes("SUCCESS")) {
      console.log("[WS RAW] Length:", raw.length, "| Preview:", raw.substring(0, 80));
    }

    if (!raw.startsWith("[ENROLL]")) return;

    const line = raw.slice("[ENROLL]".length);
    console.log("[Enroll] Message:", line);

    // ── Step indicators ──────────────────────────────────
    if (line === "STEP:1_WAITING") {
      if (enrollInitTimeout) { clearTimeout(enrollInitTimeout); enrollInitTimeout = null; }
      updateScanStepUI(1, "Scan 1 of 2 — Place Finger");
      return;
    }

    if (line === "STEP:LIFT_FINGER") {
      if (bioScanIcon) bioScanIcon.classList.remove("scanning-active");
      if (bioTitle) bioTitle.innerText = "Lift Your Finger";
      if (bioText)  bioText.innerText  = "Good! Lift your finger briefly...";
      return;
    }

    if (line === "STEP:SCAN2_WAITING") {
      markStepDone(bioStep1);
      updateScanStepUI(2, "Scan 2 of 2 — Place Finger");
      return;
    }

    // ── Enrollment success — merged template received ────
    if (line.startsWith("RESULT:SUCCESS:")) {
      const afterPrefix = line.slice("RESULT:SUCCESS:".length);
      const colonIdx    = afterPrefix.indexOf(":");
      const id1  = colonIdx >= 0 ? afterPrefix.slice(0, colonIdx)  : afterPrefix;
      const hex1 = colonIdx >= 0 ? afterPrefix.slice(colonIdx + 1) : "";

      enrollmentSession.id1       = id1;
      enrollmentSession.template1 = hex1;
      enrollmentSession.scansDone = 1;

      console.log(`✅ Merged enrollment → ID #${id1}, template length: ${hex1.length}`);

      markStepDone(bioStep1);
      markStepDone(bioStep2);
      if (bioTitle) bioTitle.innerText = `Enrollment Complete (ID #${id1})`;
      if (bioText)  bioText.innerText  = "Fingerprint merged and saved!";
      return;
    }

    // ── ALL DONE — update hidden field and switch to MATCH_MODE ──
    if (line.startsWith("RESULT:ALL_DONE:")) {
      // ✅ FIX: Arduino now sends RESULT:ALL_DONE:<id> (single ID)
      const parts = line.split(":");
      const id1   = parts[2] || enrollmentSession.id1 || "";

      if (formFields.biometric) formFields.biometric.value = id1;

      enrollmentSession.id1 = id1;

      tempBioID       = id1;
      tempBioTemplate = enrollmentSession.template1;

      updateBioButtonState(id1);

      if (bioScanIcon) {
        bioScanIcon.classList.remove("scanning-active", "error");
        bioScanIcon.classList.add("success");
      }

      if (bioTitle) bioTitle.innerText = "Enrollment Complete!";
      if (bioText)  bioText.innerHTML  =
        `Fingerprint stored as ID <strong>#${id1}</strong>.<br>Switching to attendance mode...`;

      // ✅ FIX: Send MATCH_MODE so the sensor starts scanning attendance
      setTimeout(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          console.log("[Enroll] Sending MATCH_MODE after enrollment");
          socket.send("MATCH_MODE");
        }
      }, 500);

      setTimeout(() => {
        closeBiometricInternal();
        showToast(`✅ Fingerprint enrolled as ID #${id1} — Click Save to confirm.`, "success");
      }, 1800);
      return;
    }

    // ── Fail ──────────────────────────────────────────────
    if (line.startsWith("RESULT:FAIL")) {
      if (bioScanIcon) {
        bioScanIcon.classList.remove("scanning-active");
        bioScanIcon.classList.add("error");
      }
      if (bioTitle) bioTitle.innerText = "Scan Failed";

      let errorMsg = "Image unclear or sensor error. Please try again.";
      if (line.includes("TIMEOUT"))     errorMsg = "No finger detected in time. Try again.";
      if (line.includes("MODEL_ERROR")) errorMsg = "Scans didn't match — press the same finger firmly both times.";
      if (line.includes("STORE_ERROR")) errorMsg = "Sensor storage failed. Try again.";
      if (line.includes("IMAGE_ERROR")) errorMsg = "Couldn't read fingerprint clearly. Try again.";
      if (line.includes("SENSOR_FULL")) errorMsg = "Sensor is full! Delete old entries first.";
      if (bioText) bioText.innerText = errorMsg;

      setTimeout(() => {
        if (bioScanIcon) {
          bioScanIcon.classList.remove("error");
          bioScanIcon.className = "fa-solid fa-fingerprint scan-placeholder";
        }
        if (bioEnrollBtn) bioEnrollBtn.disabled = false;
        if (bioTitle) bioTitle.innerText = "Retry Enrollment";
        if (bioText)  bioText.innerText  = "Press Start Enrollment to try again.";
        resetEnrollmentSession();
      }, 2500);
      return;
    }

    // ── Retry hint ───────────────────────────────────────
    if (line === "STEP:RETRY_IMAGE") {
      if (bioText) bioText.innerText = "Image unclear — place your finger flat and still.";
      return;
    }

    // ── Cancelled by user ────────────────────────────────
    if (line === "RESULT:CANCELLED") {
      console.log("[Enroll] Arduino confirmed cancellation");
      return;
    }
  }

  // ──────────────────────────────────────────────────────
  // D. BIO BUTTON STATE
  // ──────────────────────────────────────────────────────
  function updateBioButtonState(id) {
    if (!bioScanBtn) return;

    if (id && String(id).trim() !== "") {
      bioScanBtn.classList.add("is-registered");
      bioScanBtn.innerHTML =
        `<i class="fa-solid fa-fingerprint"></i> <span>ID: ${id} (Saved)</span>`;
    } else {
      bioScanBtn.classList.remove("is-registered");
      bioScanBtn.innerHTML =
        `<i class="fa-solid fa-wifi"></i> <span>Open Scanner</span>`;
    }
  }

  // ──────────────────────────────────────────────────────
  // EMPTY-STATE ROW
  // ──────────────────────────────────────────────────────
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
            <div class="t-empty-center">No teachers yet.</div>
          </td>
        `;
        tableBody.appendChild(emptyRow);
      }
    } else if (emptyRow) {
      emptyRow.remove();
    }
  }

  function updateRegisteredTeachersCount() {
    if (!teachersCountEl || !tableBody) return;
    const rows = tableBody.querySelectorAll(`tr:not(.${EMPTY_ROW_CLASS})`);
    teachersCountEl.textContent = rows.length > 0 ? rows.length : "—";
    refreshEmptyStateRow();
  }

  if (addBtn) addBtn.innerHTML = "<span>Add Teacher</span>";

  // ──────────────────────────────────────────────────────
  // FORM HELPERS
  // ──────────────────────────────────────────────────────
  let editMode = false;
  let editRow  = null;
  let isSavingTeacher = false;

  function isFormEmpty() {
    for (let key in formFields) {
      if (formFields[key] && formFields[key].value.trim() !== "") return false;
    }
    return true;
  }

  function clearForm() {
    for (let field in formFields) {
      if (formFields[field]) formFields[field].value = "";
    }
    currentBiometricTemplate = "";
    updateBioButtonState("");
    editMode = false;
    editRow  = null;
    resetEnrollmentSession();
    updateStatusVisibility(false);
    if (addBtn) addBtn.innerHTML = "<span>Add Teacher</span>";
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.preventDefault();
      cancelEnrollment();   // ← stop any active scan
      if (isFormEmpty()) return showToast("Form is already empty.", "error");
      clearForm();
      showToast("Form cleared.", "success");
    });
  }

  // ──────────────────────────────────────────────────────
  // CREATE TABLE ROW
  // ──────────────────────────────────────────────────────
  function createTableRow(data) {
    const tr = document.createElement("tr");
    tr.setAttribute("data-bio-id",       data.biometric         || "");
    tr.setAttribute("data-bio-template", data.biometricTemplate || "");

    tr.innerHTML = `
      <td><div class="cell-scroll cell-id">${data.id}</div></td>
      <td><div class="cell-scroll cell-rfid">${data.rfid}</div></td>
      <td><div class="cell-scroll cell-name">${data.name}</div></td>
      <td><div class="cell-scroll cell-email">${data.email}</div></td>
      <td><div class="cell-scroll cell-phone">${data.phone}</div></td>
      <td><div class="cell-scroll cell-program">${data.program}</div></td>
      <td><div class="cell-scroll cell-status">${data.status}</div></td>
      <td>
        <button class="action-btn btn-edit" type="button">
          <i class="fa-solid fa-pen"></i><span>Edit</span>
        </button>
        <button class="action-btn btn-delete" type="button">
          <i class="fa-solid fa-trash"></i><span>Delete</span>
        </button>
      </td>
    `;

    const statusText  = (data.status || "").trim().toLowerCase();
    const statusClass = statusText === "active"    ? "status-active"
                      : statusText === "inactive"  ? "status-inactive"
                      : statusText === "suspended" ? "status-suspended"
                      : "";

    const statusCellWrapper = tr.children[6].querySelector(".cell-status");
    if (statusCellWrapper) {
      statusCellWrapper.innerHTML =
        `<span class="status-pill ${statusClass}">${data.status}</span>`;
    }

    const editBtnRow = tr.querySelector(".btn-edit");
    if (editBtnRow) editBtnRow.addEventListener("click", () => loadRowToForm(tr));

    return tr;
  }

  // ──────────────────────────────────────────────────────
  // DUPLICATE CHECK
  // ──────────────────────────────────────────────────────
  function isDuplicate(field, value) {
    if (!tableBody) return false;
    const rows = tableBody.querySelectorAll("tr");
    const val  = value.trim();
    if (!val) return false;

    for (let row of rows) {
      if (row.classList.contains(EMPTY_ROW_CLASS)) continue;
      if (row === editRow) continue;

      const cells = row.querySelectorAll("td");
      if (cells.length < 7) continue;

      const idCell    = cells[0].querySelector(".cell-id")    || cells[0];
      const rfidCell  = cells[1].querySelector(".cell-rfid")  || cells[1];
      const emailCell = cells[3].querySelector(".cell-email") || cells[3];
      const phoneCell = cells[4].querySelector(".cell-phone") || cells[4];

      const rowData = {
        id:    idCell.textContent.trim(),
        rfid:  rfidCell.textContent.trim(),
        email: emailCell.textContent.trim(),
        phone: phoneCell.textContent.trim(),
      };

      let rowVal = rowData[field] || "";
      let cmpVal = val;

      if (field === "email") { rowVal = rowVal.toLowerCase(); cmpVal = cmpVal.toLowerCase(); }

      if (rowVal && cmpVal && rowVal === cmpVal) return true;
    }
    return false;
  }

  // ──────────────────────────────────────────────────────
  // DELETE CONFIRMATION MODAL
  // ──────────────────────────────────────────────────────
  const deleteConfirmOverlay = document.getElementById("teacher-delete-confirm");
  const confirmDeleteBtn     = document.getElementById("confirm-delete-btn");
  const confirmCancelBtn     = document.getElementById("confirm-cancel-btn");
  const confirmTeacherName   = document.getElementById("confirm-teacher-name");
  const confirmTeacherId     = document.getElementById("confirm-teacher-id");

  let pendingDeleteRow  = null;
  let pendingDeleteName = "";
  let pendingDeleteId   = "";

  if (tableBody) {
    tableBody.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest(".btn-delete");
      if (!deleteBtn) return;

      const row = deleteBtn.closest("tr");
      if (!row) return;

      pendingDeleteRow = row;

      const cells   = row.querySelectorAll("td");
      const idDiv   = cells[0].querySelector(".cell-id")   || cells[0];
      const nameDiv = cells[2].querySelector(".cell-name") || cells[2];

      pendingDeleteId   = idDiv.textContent.trim();
      pendingDeleteName = nameDiv.textContent.trim();

      if (confirmTeacherName) confirmTeacherName.textContent = pendingDeleteName;
      if (confirmTeacherId)   confirmTeacherId.textContent   = "ID: " + pendingDeleteId;

      if (deleteConfirmOverlay) deleteConfirmOverlay.classList.remove("hidden");
    });
  }

  if (confirmCancelBtn && deleteConfirmOverlay) {
    confirmCancelBtn.addEventListener("click", () => {
      deleteConfirmOverlay.classList.add("hidden");
      pendingDeleteRow = null;
    });
  }

  // ──────────────────────────────────────────────────────
  // DB HELPERS
  // ──────────────────────────────────────────────────────
  async function loadTeachersFromDB() {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    try {
      const res = await fetch(API_TEACHERS_LIST, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        showToast("Failed to load teachers.", "error");
        refreshEmptyStateRow();
        updateRegisteredTeachersCount();
        return;
      }

      const data = await res.json();
      if (!data.ok) {
        showToast(data.msg || "Failed to load teachers.", "error");
        refreshEmptyStateRow();
        updateRegisteredTeachersCount();
        return;
      }

      const rows = Array.isArray(data.rows) ? data.rows : [];
      if (rows.length === 0) {
        refreshEmptyStateRow();
        updateRegisteredTeachersCount();
        return;
      }

      rows.forEach((row) => {
        const rowData = {
          id:                row.teacher_id          || "",
          rfid:              row.rfid                || "",
          name:              row.name                || "",
          email:             row.email               || "",
          phone:             row.phone               || "",
          program:           row.program             || "",
          status:            row.status              || "Active",
          biometric:         row.fingerprint_id      || "",
          biometricTemplate: row.fingerprint_template || "",
        };
        tableBody.appendChild(createTableRow(rowData));
      });

      refreshEmptyStateRow();
      updateRegisteredTeachersCount();
    } catch (err) {
      console.error("loadTeachersFromDB error:", err);
      showToast("Failed to load teachers (network error).", "error");
      refreshEmptyStateRow();
      updateRegisteredTeachersCount();
    }
  }

  async function saveTeacherToDB(payload) {
    try {
      const baseUrl   = window.location.origin;
      const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      const actionUrl = `${cleanBase}/api/teachers_save`;

      const bodyStr = JSON.stringify(payload);
      console.log("[Save] POST body size:", bodyStr.length, "bytes");

      const res = await fetch(actionUrl, {
        method: "POST",
        headers: {
          "Content-Type":     "application/json",
          "Accept":           "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: bodyStr,
      });

      const rawText = await res.text();
      if (!res.ok) {
        let errData = null;
        try { errData = JSON.parse(rawText); } catch (_) {}
        showToast((errData && (errData.msg || errData.error)) || `HTTP ${res.status}`, "error");
        return false;
      }

      let data;
      try { data = JSON.parse(rawText); }
      catch (_) {
        showToast("Saved, but server returned invalid JSON.", "error");
        return false;
      }

      if (!data.ok) {
        showToast(data.msg || data.error || "Failed to save.", "error");
        return false;
      }
      return true;
    } catch (err) {
      console.error("saveTeacherToDB error:", err);
      showToast("Network request failed.", "error");
      return false;
    }
  }

  async function deleteTeacherFromDB(teacherId) {
    try {
      const baseUrl   = window.location.origin;
      const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      const actionUrl = `${cleanBase}/api/teachers_delete`;

      const res = await fetch(actionUrl, {
        method: "POST",
        headers: {
          "Content-Type":     "application/json",
          "Accept":           "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ teacher_id: teacherId }),
      });

      const rawText = await res.text();
      if (!res.ok) {
        let data = null;
        try { data = JSON.parse(rawText); } catch (_) {}
        showToast((data && (data.msg || data.error)) || `HTTP ${res.status}`, "error");
        return false;
      }

      let data;
      try { data = JSON.parse(rawText); }
      catch (_) {
        showToast("Might be deleted, but invalid JSON.", "error");
        return false;
      }

      if (!data.ok) {
        showToast(data.error || "Failed to delete.", "error");
        return false;
      }
      return true;
    } catch (err) {
      console.error("deleteTeacherFromDB error:", err);
      showToast("Delete request failed.", "error");
      return false;
    }
  }

  if (confirmDeleteBtn && deleteConfirmOverlay) {
    confirmDeleteBtn.addEventListener("click", async () => {
      if (!pendingDeleteRow || !pendingDeleteId) return;

      const ok = await deleteTeacherFromDB(pendingDeleteId);
      if (ok) {
        showToast("Teacher removed.", "success");
        logTeacherEvent("Deleted", `Teacher ${pendingDeleteName} (ID: ${pendingDeleteId}) removed`);
        await loadTeachersFromDB();
      }

      deleteConfirmOverlay.classList.add("hidden");
      pendingDeleteRow = null;
    });
  }

  // ──────────────────────────────────────────────────────
  // LOAD ROW TO FORM (Edit)
  // ──────────────────────────────────────────────────────
  function loadRowToForm(row) {
    const cells = row.querySelectorAll("td");

    const idDiv      = cells[0].querySelector(".cell-id")      || cells[0];
    const rfidDiv    = cells[1].querySelector(".cell-rfid")    || cells[1];
    const nameDiv    = cells[2].querySelector(".cell-name")    || cells[2];
    const emailDiv   = cells[3].querySelector(".cell-email")   || cells[3];
    const phoneDiv   = cells[4].querySelector(".cell-phone")   || cells[4];
    const programDiv = cells[5].querySelector(".cell-program") || cells[5];
    const statusDiv  =
      cells[6].querySelector(".cell-status .status-pill") ||
      cells[6].querySelector(".cell-status") ||
      cells[6];

    formFields.id.value      = idDiv.textContent.trim();
    formFields.rfid.value    = rfidDiv.textContent.trim();
    formFields.name.value    = nameDiv.textContent.trim();
    formFields.email.value   = emailDiv.textContent.trim();
    formFields.phone.value   = phoneDiv.textContent.trim();
    formFields.program.value = programDiv.textContent.trim();
    formFields.status.value  = statusDiv.textContent.trim();

    const storedBioId       = row.getAttribute("data-bio-id")       || "";
    const storedBioTemplate = row.getAttribute("data-bio-template")  || "";

    if (formFields.biometric) formFields.biometric.value = storedBioId;

    currentBiometricTemplate = storedBioTemplate;

    enrollmentSession.id1       = storedBioId;
    enrollmentSession.template1 = storedBioTemplate;

    updateBioButtonState(storedBioId);

    editMode = true;
    editRow  = row;

    updateStatusVisibility(true);
    if (addBtn) addBtn.innerHTML = "<span>Update Teacher</span>";
    showToast("Record loaded for editing.", "success");
  }

  // ──────────────────────────────────────────────────────
  // ADD / UPDATE HANDLER
  // ──────────────────────────────────────────────────────
  if (addBtn) {
    addBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      if (isSavingTeacher) return;
      isSavingTeacher = true;

      try {
        // Validate all fields except biometric
        for (let key in formFields) {
          if (!formFields[key]) continue;
          if (key === "biometric") continue;
          if (!formFields[key].checkValidity()) {
            formFields[key].reportValidity();
            return;
          }
        }

        // Biometric required — DISABLED (optional, not enforced)
        const bioVal = formFields.biometric ? formFields.biometric.value.trim() : "";

        showTeachersLoadingToast(editMode ? "Updating teacher..." : "Saving teacher...");

        const teacherData = {
          id:        formFields.id.value.trim(),
          rfid:      formFields.rfid.value.trim(),
          name:      formFields.name.value.trim(),
          email:     formFields.email.value.trim(),
          phone:     formFields.phone.value.trim(),
          program:   formFields.program.value.trim(),
          status:    formFields.status.value.trim(),
          biometric: bioVal,
        };

        if (!editMode) {
          if (isDuplicate("id",    teacherData.id))    return showToast("Teacher ID already exists.",    "error");
          if (isDuplicate("rfid",  teacherData.rfid))  return showToast("RFID already exists.",         "error");
          if (isDuplicate("email", teacherData.email)) return showToast("Email already exists.",        "error");
          if (isDuplicate("phone", teacherData.phone)) return showToast("Phone number already exists.", "error");
        }

        // ✅ Build payload — now only 1 fingerprint ID (merged 2-scan template)
        const payload = {
          teacher_id:           teacherData.id,
          email:                teacherData.email,
          name:                 teacherData.name,
          phone:                teacherData.phone,
          program:              teacherData.program,
          status:               teacherData.status,
          rfid:                 teacherData.rfid,
          fingerprint_id:       enrollmentSession.id1 || teacherData.biometric || null,
          fingerprint_template: enrollmentSession.template1 || currentBiometricTemplate || null,
        };

        console.log("[Save] fingerprint_id:", payload.fingerprint_id);
        console.log("[Save] fingerprint_template length:", (payload.fingerprint_template || "").length);

        if (!payload.fingerprint_template) {
          console.warn("[Save] ⚠️ fingerprint_template is EMPTY — template was not received from sensor!");
        }

        const ok = await saveTeacherToDB(payload);
        if (!ok) return;

        showToast(
          editMode ? "Teacher updated successfully." : "Teacher added successfully.",
          "success"
        );
        logTeacherEvent(
          editMode ? "Updated" : "Added",
          `Teacher ${teacherData.name} (ID: ${teacherData.id})`
        );

        clearForm();
        await loadTeachersFromDB();

      } catch (err) {
        console.error("[Save] Crashed:", err);
        showToast("Save error — check console.", "error");
      } finally {
        hideTeachersLoadingToast();
        isSavingTeacher = false;
      }
    });
  }

  // ──────────────────────────────────────────────────────
  // INPUT MASKS
  // ──────────────────────────────────────────────────────
  const teacherID    = document.getElementById("t-id");
  const teacherPhone = document.getElementById("t-phone");
  const teacherRFID  = document.getElementById("t-rfid");

  if (teacherID) {
    teacherID.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      let formatted = value.substring(0, 5);
      if (value.length > 5) formatted += "-" + value.substring(5, 9);
      e.target.value = formatted;
    });
  }

  if (teacherPhone) {
    teacherPhone.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "");
    });
  }

  if (teacherRFID) {
    teacherRFID.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "");
    });
  }

  // ──────────────────────────────────────────────────────
  // INITIAL LOAD
  // ──────────────────────────────────────────────────────
  if (tableBody) {
    loadTeachersFromDB();
    updateStatusVisibility(false);
  }

  // ──────────────────────────────────────────────────────
  // ANALYTICS EXPORT
  // ──────────────────────────────────────────────────────
  window.getTeachersAnalytics = function () {
    if (!tableBody) return { totalTeachers: 0, active: 0, inactive: 0, suspended: 0 };

    const rows  = tableBody.querySelectorAll(`tr:not(.${EMPTY_ROW_CLASS})`);
    const stats = { totalTeachers: rows.length, active: 0, inactive: 0, suspended: 0 };

    rows.forEach((row) => {
      const statusWrapper =
        row.querySelector(".cell-status .status-pill") ||
        row.querySelector(".cell-status");
      const statusText = statusWrapper ? statusWrapper.textContent.trim().toLowerCase() : "";
      if      (statusText === "active")    stats.active++;
      else if (statusText === "inactive")  stats.inactive++;
      else if (statusText === "suspended") stats.suspended++;
    });
    return stats;
  };

  // ──────────────────────────────────────────────────────
  // MENU FIX
  // ──────────────────────────────────────────────────────
  (function menuTeachersAccountsFix() {
    if (!sectionForm || !sectionBio) return;

    function showTeachersAccountsFromMenu(ev) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }

      document.querySelectorAll(".page-section").forEach((sec) => {
        sec.classList.remove("active");
        sec.style.display = "none";
      });

      sectionForm.classList.add("active");
      sectionForm.style.display = "block";
      sectionBio.classList.remove("active");
      sectionBio.style.display = "none";

      setActiveMenu("teachersaccounts");

      if (window.innerWidth <= 768) {
        const sidebar = document.querySelector(".sidebar, #sidebar, .nav-menu");
        if (sidebar) sidebar.classList.remove("active", "show", "open");

        document.querySelectorAll(".overlay, #sidebar-overlay, .sidebar-overlay, .sidebar-backdrop").forEach((o) => {
          o.classList.remove("active", "show");
          o.style.display = "none";
        });

        document.body.classList.remove("sidebar-open", "menu-open", "blur-active", "nav-active");

        document.querySelectorAll(".main-content, #main, .content-wrapper, main, #app").forEach((c) => {
          c.classList.remove("blur", "blur-active", "menu-open", "active");
          c.style.filter = "none";
          c.style.backdropFilter = "none";
        });
      }
    }

    document.addEventListener("click", (ev) => {
      const btn = ev.target.closest('.menu-item[data-section="teachersaccounts"]');
      if (!btn) return;
      showTeachersAccountsFromMenu(ev);
    }, true);

    document.addEventListener("click", (ev) => {
      const anyMenuBtn = ev.target.closest(".menu-item[data-section]");
      if (!anyMenuBtn) return;
      if (anyMenuBtn.getAttribute("data-section") !== "biometric-registration") {
        sectionBio.classList.remove("active");
        sectionBio.style.display = "none";
      }
    }, true);
  })();

  // ──────────────────────────────────────────────────────
  // BACK BUTTON (biometric header)
  // ──────────────────────────────────────────────────────
  (function bindBiometricBackButton() {
    document.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".teachers-head .tbtn-right");
      if (!btn) return;
      if (sectionBio && sectionBio.classList.contains("active")) {
        closeBiometricInternal(ev);
      }
    }, true);
  })();

});