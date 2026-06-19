// ===============================
// 📚 CLASS SCHEDULE MANAGEMENT (DB version)
// ===============================
//
// ✅ NEW: ROW HIGHLIGHT FEATURE
// --------------------------------------------------
// 1. Click any table row → highlights it in teal.
//    Click again → deselects it.
//
// 2. Search box (id="sched-search-input") → highlights
//    all rows whose text matches the typed query in gold.
//
// ── HTML to add above your Existing Schedules table ──
//   <div class="sched-search-wrap">
//     <i class="fa-solid fa-magnifying-glass"></i>
//     <input type="text" id="sched-search-input"
//            placeholder="Search schedules…" autocomplete="off" />
//   </div>
//
// ── CSS to add to your stylesheet ──
//   #schedule-table-body tr:not(.sched-empty-row) { cursor: pointer; }
//   #schedule-table-body tr.sched-row-selected td {
//     background-color: #e0f5f2 !important;
//     border-left: 4px solid #0e8a7c;
//   }
//   #schedule-table-body tr.sched-row-match td {
//     background-color: #fff8e1 !important;
//     border-left: 4px solid #f0b429;
//   }
//   .sched-search-wrap {
//     display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
//   }
//   .sched-search-wrap input {
//     padding: 7px 12px; border: 1.5px solid #ccc; border-radius: 8px;
//     font-size: 0.9rem; width: 260px; outline: none;
//   }
//   .sched-search-wrap input:focus { border-color: #0e8a7c; }
// --------------------------------------------------

// 🔔 Simple toast for schedule status (UPDATED: auto color by message)
// 🔔 Simple toast for schedule status (UPDATED: Prevents duplicates)
function showScheduleToast(message, tone = "info") {
  const container = document.getElementById("toast-schedule");

  if (!container) {
    alert(message);
    return;
  }

  // ✅ PREVENT DUPLICATES: Check if the last toast added has the same text
  const existingToasts = container.querySelectorAll(".toast-msg");
  if (existingToasts.length > 0) {
    const lastToast = existingToasts[existingToasts.length - 1];
    if (lastToast.textContent === message) {
      return; // Exit function if the message is already showing
    }
  }

  const toast = document.createElement("div");
  toast.className = "toast-msg";

  // tone classes
  if (tone === "success") toast.classList.add("toast-success");
  if (tone === "error")   toast.classList.add("toast-error");
  if (tone === "warn")    toast.classList.add("toast-warn");

  const msg = String(message || "").toLowerCase();
  if (msg.includes("created")) toast.classList.add("toast-created");
  if (msg.includes("deleted")) toast.classList.add("toast-deleted");
  if (msg.includes("create error") || msg.includes("creating")) toast.classList.add("toast-create-error");
  if (msg.includes("delete error") || msg.includes("deleting")) toast.classList.add("toast-delete-error");

  toast.textContent = message;
  container.appendChild(toast);

  // Remove toast after animation
  setTimeout(() => {
    toast.style.opacity = "0"; // Optional: trigger fade out before removal
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

document.addEventListener("DOMContentLoaded", () => {
  const form      = document.getElementById("schedule-form");
  const tableBody = document.getElementById("schedule-table-body");

  const startEl   = document.getElementById("class-start");
  const endEl     = document.getElementById("class-end");
  const teacherEl = document.getElementById("teacher");
  const subjectEl = document.getElementById("subject");
  const roomEl    = document.getElementById("room");

  // We keep the latest rows here so delete handler can read them
  let scheduleRows    = [];
  let pendingDeleteId = null;

  // ===============================
  // 🔤 DAY MAPPING  (DB value: M, T, W, Th, F, S)
  // ===============================
  const DAY_MAP = {
    Monday:    "M",
    Tuesday:   "T",
    Wednesday: "W",
    Thursday:  "Th",
    Friday:    "F",
    Saturday:  "S",
  };

  function getSelectedDayCodes() {
    const checked = document.querySelectorAll('input[name="days"]:checked');
    const codes = Array.from(checked)
      .map(cb => DAY_MAP[cb.value] || "")
      .filter(Boolean);
    return codes.join(""); // e.g. "MWF"
  }

  function getSelectedDaysFull() {
    const checked = document.querySelectorAll('input[name="days"]:checked');
    return Array.from(checked).map(cb => cb.value);
  }

  // ===============================
  // ⏰ TIME HELPERS (12H)
  // ===============================
  function formatTime12h(t) {
    if (!t) return "—";
    if (t.includes("AM") || t.includes("PM")) return t;

    const [hStr, mStr = "00"] = t.split(":");
    const hour   = parseInt(hStr, 10);
    const suffix = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    const minute = String(mStr).padStart(2, "0");
    return `${hour12}:${minute} ${suffix}`;
  }

  function parse12ToMinutes(t) {
    if (!t) return null;

    if (t.includes("AM") || t.includes("PM")) {
      let [hm, suffix] = t.split(" ");
      let [hStr, mStr] = hm.split(":");
      let h = parseInt(hStr, 10);
      let m = parseInt(mStr, 10);

      if (suffix === "PM" && h !== 12) h += 12;
      if (suffix === "AM" && h === 12) h = 0;

      return h * 60 + m;
    }

    const [hStr, mStr] = t.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    return h * 60 + m;
  }

  function minutesTo12h(totalMinutes) {
    let h = Math.floor(totalMinutes / 60);
    let m = totalMinutes % 60;
    const suffix = h >= 12 ? "PM" : "AM";
    let displayHour = h % 12;
    if (displayHour === 0) displayHour = 12;
    const mm = String(m).padStart(2, "0");
    return `${displayHour}:${mm} ${suffix}`;
  }

  function generateSlots(startMinutes, endMinutes) {
    const slots = [];
    for (let t = startMinutes; t <= endMinutes; t += 30) {
      slots.push(minutesTo12h(t));
    }
    return slots;
  }

  const startTimes = generateSlots(7 * 60 + 30, 20 * 60);       // 7:30 AM → 8:00 PM
  const endTimes   = generateSlots(8 * 60 + 30, 20 * 60 + 30);  // 8:30 AM → 8:30 PM

  function createGroup(label) {
    const group = document.createElement("optgroup");
    group.label = label;
    return group;
  }

  function populateSelectWithGroups(selectEl, timeList, placeholderText) {
    selectEl.innerHTML = `<option value="" disabled selected>${placeholderText}</option>`;

    const grouped = { Morning: [], Afternoon: [], Evening: [] };

    timeList.forEach(time => {
      const mins = parse12ToMinutes(time);
      if (mins < parse12ToMinutes("12:00 PM")) {
        grouped.Morning.push(time);
      } else if (mins < parse12ToMinutes("6:00 PM")) {
        grouped.Afternoon.push(time);
      } else {
        grouped.Evening.push(time);
      }
    });

    Object.keys(grouped).forEach(label => {
      if (!grouped[label].length) return;
      const optgroup = createGroup(label);
      grouped[label].forEach(time => {
        const opt = document.createElement("option");
        opt.value = time;
        opt.textContent = time;
        optgroup.appendChild(opt);
      });
      selectEl.appendChild(optgroup);
    });
  }

  // Build time selects
  if (startEl && endEl) {
    populateSelectWithGroups(startEl, startTimes, "Select Start Time");
    populateSelectWithGroups(endEl,   endTimes,   "Select End Time");

    startEl.addEventListener("change", () => {
      const startMinutes = parse12ToMinutes(startEl.value);
      const filteredEndTimes = endTimes.filter(t => parse12ToMinutes(t) > startMinutes);
      populateSelectWithGroups(endEl, filteredEndTimes, "Select End Time");
    });
  }

  // ===============================
  // 🏫 ROOM OPTIONS (fixed)
  // ===============================
  if (roomEl) {
    const rooms = ["A303", "A304"];
    rooms.forEach(room => {
      const opt = document.createElement("option");
      opt.value = room;
      opt.textContent = room;
      roomEl.appendChild(opt);
    });
  }

  // ===============================
  // 👩‍🏫 LOAD TEACHERS FOR DROPDOWN
  // ===============================
  async function loadTeachers() {
    if (!teacherEl) return;

    teacherEl.innerHTML = `<option value="" disabled selected>Select Teacher</option>`;

    try {
      const res = await fetch("api/teachers_list.php?_=" + Date.now(), {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.ok !== true) {
        console.error("Teacher load error:", data?.error || data?.msg);
        return;
      }

      const rows = Array.isArray(data.rows) ? data.rows : [];

      rows.forEach(t => {
        if (!t.name) return;
        const opt = document.createElement("option");
        opt.value = t.name;
        opt.textContent = t.name;
        teacherEl.appendChild(opt);
      });
    } catch (err) {
      console.error("Teacher dropdown error:", err);
    }
  }

  // ===============================
  // 🖨 RENDER TABLE (DB rows)
  // ===============================
  function renderSchedules(rows) {
    tableBody.innerHTML = "";

    if (!Array.isArray(rows) || rows.length === 0) {
      tableBody.innerHTML = `
        <tr class="sched-empty-row">
          <td colspan="7" style="text-align:center; color:#777;">
            No schedules yet.
          </td>
        </tr>
      `;
      return;
    }

    rows.forEach(sched => {
      const tr = document.createElement("tr");

      const dayText = sched.days_compact
        ? sched.days_compact
        : sched.days
          ? sched.days
          : "—";

      tr.innerHTML = `
        <td class="col-days">${dayText}</td>
        <td class="col-start">${formatTime12h(sched.start_time)}</td>
        <td class="col-end">${formatTime12h(sched.end_time)}</td>
        <td class="col-teacher">${sched.teacher_name || "—"}</td>
        <td class="col-subject">${sched.subject_code || "—"}</td>
        <td class="col-room">${sched.room || "—"}</td>
        <td class="s-actions">
          <button class="action-btn delete sched-delete-btn" data-id="${sched.id}">
            <i class="fa-solid fa-trash"></i>
            <span>Delete</span>
          </button>
        </td>
      `;

      // Wrap teacher / subject / room text to be horizontally scrollable
      const scrollCells = tr.querySelectorAll(".col-teacher, .col-subject, .col-room");
      scrollCells.forEach(td => {
        const text = td.textContent;
        td.textContent = "";
        const wrap = document.createElement("div");
        wrap.className = "sched-scroll-cell";
        wrap.textContent = text;
        td.appendChild(wrap);
      });

      // ✅ HIGHLIGHT: Click row to highlight/deselect
      tr.addEventListener("click", e => {
        // Don't highlight when clicking the delete button
        if (e.target.closest(".sched-delete-btn")) return;

        const isAlreadySelected = tr.classList.contains("sched-row-selected");

        // Deselect all rows first
        tableBody.querySelectorAll("tr.sched-row-selected").forEach(r => {
          r.classList.remove("sched-row-selected");
        });

        // Toggle: select only if it wasn't already selected
        if (!isAlreadySelected) {
          tr.classList.add("sched-row-selected");
        }
      });

      tableBody.appendChild(tr);
    });

    // ✅ HIGHLIGHT SEARCH: Re-apply search highlight after re-render
    const searchInput = document.getElementById("sched-search-input");
    if (searchInput && searchInput.value.trim() !== "") {
      applySearchHighlight(searchInput.value.trim().toLowerCase());
    }
  }

  // ===============================
  // 🔍 SEARCH/HIGHLIGHT HELPER
  // ===============================
  function applySearchHighlight(query) {
    const rows = tableBody.querySelectorAll("tr:not(.sched-empty-row)");
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (query && text.includes(query)) {
        row.classList.add("sched-row-match");
      } else {
        row.classList.remove("sched-row-match");
      }
    });
  }

  // ✅ SEARCH INPUT: Wire up the search box
  const searchInput = document.getElementById("sched-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();

      // Clear click-selected highlight when searching
      tableBody.querySelectorAll("tr.sched-row-selected").forEach(r => {
        r.classList.remove("sched-row-selected");
      });

      applySearchHighlight(query);
    });
  }

  // ===============================
  // 🔁 LOAD SCHEDULES FROM API
  // ===============================
  async function loadSchedules() {
    try {
      const res = await fetch("api/schedule_list.php?_=" + Date.now(), {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.ok !== true) {
        console.error("Schedule load error:", data?.error || data?.msg);
        scheduleRows = [];
        renderSchedules([]);
        return;
      }

      // ✅ Safe: We only reverse the local copy for display
      const rawRows = Array.isArray(data.rows) ? data.rows : [];
      scheduleRows = rawRows.reverse(); 
      
      renderSchedules(scheduleRows);
    } catch (err) {
      console.error("Schedule fetch error:", err);
      scheduleRows = [];
      renderSchedules([]);
    }
  }

  // Initial loads
  loadTeachers();
  loadSchedules();

  // ===============================
  // 📝 SUBMIT FORM → CREATE SCHEDULE
  // ===============================
  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();

      // 🕒 START: LOADING & CLICK PREVENTION
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn.disabled) return; // Prevent multiple clicks

      const originalBtnText = submitBtn.innerHTML;
      
      const setLoader = (isLoading) => {
        if (isLoading) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;
        } else {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      };

      const dayCodes = getSelectedDayCodes();
      const fullDays = getSelectedDaysFull();
      const start    = startEl.value;
      const end      = endEl.value;
      const teacher  = teacherEl.value.trim();
      const subject  = subjectEl.value.trim();
      const room     = roomEl ? roomEl.value.trim() : "";

      if (!dayCodes || fullDays.length === 0 || !start || !end || !teacher || !room) {
        showScheduleToast("Please complete all required fields.", "warn");
        return;
      }

      const startMinTotal = parse12ToMinutes(start);
      const endMinTotal   = parse12ToMinutes(end);
      const minStart      = parse12ToMinutes("7:30 AM");
      const maxEnd        = parse12ToMinutes("8:30 PM");

      if (startMinTotal < minStart) {
        showScheduleToast("Start time must be 7:30 AM or later.", "warn");
        return;
      }
      if (endMinTotal > maxEnd) {
        showScheduleToast("End time must be 8:30 PM or earlier.", "warn");
        return;
      }
      if (endMinTotal <= startMinTotal) {
        showScheduleToast("End time must be greater than Start time.", "warn");
        return;
      }

      const isDuplicateSubject = scheduleRows.some(s => 
        s.teacher_name === teacher && 
        s.subject_code === subject
      );

      if (isDuplicateSubject) {
        showScheduleToast(`Error: ${teacher} already has ${subject} registered.`, "error");
        return;
      }

      // ==========================================
      // 🛡️ ENHANCED CONFLICT CHECK (Teacher & Room)
      // ==========================================

      // Helper: checks day + time overlap for a given schedule row
      function hasOverlap(s) {
        const inputDays    = dayCodes.split('');
        const existingDays = (s.days_compact || s.days || "").split('');
        if (!inputDays.some(d => existingDays.includes(d))) return false;
        const eStart = parse12ToMinutes(s.start_time);
        const eEnd   = parse12ToMinutes(s.end_time);
        return (startMinTotal < eEnd) && (endMinTotal > eStart);
      }

      // 1️⃣ RULE: Strict Time Conflict for the Teacher OR the Room
      // Build a proper { type, name } result by iterating (not .find which returns the row, not our object)
      let conflict = null;
      for (const s of scheduleRows) {
        if (!hasOverlap(s)) continue;
        if (s.teacher_name === teacher) { conflict = { type: 'teacher', name: s.teacher_name }; break; }
        if (s.room === room)            { conflict = { type: 'room',    name: s.room          }; break; }
      }

      if (conflict) {
        // ✅ Toast with correct name (no more "undefined")
        if (conflict.type === 'teacher') {
          showScheduleToast(`Error: Time conflict! ${conflict.name} is busy during this period.`, "error");
        } else {
          showScheduleToast(`Error: Room conflict! ${conflict.name} is already occupied during this time.`, "error");
        }

        // 🔴 HIGHLIGHT ALL CONFLICTING ROWS IN THE TABLE
        tableBody.querySelectorAll("tr.sched-row-conflict").forEach(r => r.classList.remove("sched-row-conflict"));

        // Collect every row ID that clashes (same teacher or same room, same time window)
        const conflictingIds = scheduleRows
          .filter(s => {
            if (!hasOverlap(s)) return false;
            return conflict.type === 'teacher' ? s.teacher_name === teacher : s.room === room;
          })
          .map(s => String(s.id));

        // Apply red class to matching <tr> elements
        let firstConflictRow = null;
        tableBody.querySelectorAll("tr:not(.sched-empty-row)").forEach(tr => {
          const btn = tr.querySelector(".sched-delete-btn");
          if (btn && conflictingIds.includes(String(btn.dataset.id))) {
            tr.classList.add("sched-row-conflict");
            if (!firstConflictRow) firstConflictRow = tr;
          }
        });

        // Scroll the first conflicting row into view smoothly
        if (firstConflictRow) {
          firstConflictRow.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // Auto-remove the red highlight after 4 s
        setTimeout(() => {
          tableBody.querySelectorAll("tr.sched-row-conflict").forEach(r => r.classList.remove("sched-row-conflict"));
        }, 4000);

        return;
      }

      // Set button to loading state before fetching
      setLoader(true);

      const fd = new URLSearchParams();
      fd.append("days",         dayCodes);
      fd.append("start_time",   start);
      fd.append("end_time",     end);
      fd.append("teacher_name", teacher);
      fd.append("subject_code", subject);
      fd.append("room",         room);

      const baseUrl = window.location.origin;
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const actionUrl = `${cleanBase}/api/schedule_create`; 

      try {
        const res = await fetch(actionUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest"
          },
          body: fd.toString(),
          credentials: "same-origin",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data || data.ok !== true) {
          const msg = data?.msg || "Failed to create class schedule.";
          showScheduleToast(msg, "error");
          setLoader(false);
          return;
        }

        showScheduleToast("Schedule created successfully.", "success");
        form.reset();
        document.querySelectorAll('input[name="days"]').forEach(cb => cb.checked = false);
        await loadSchedules();

        if (window.KLASECO_REFRESH && typeof window.KLASECO_REFRESH.emit === "function") {
          window.KLASECO_REFRESH.emit("schedule-changed");
        } else {
          window.dispatchEvent(new CustomEvent("schedule-changed"));
        }

      } catch (err) {
        console.error("Schedule create error:", err);
        showScheduleToast("Schedule create error: Server error while creating schedule.", "error");
      } finally {
        // 🕒 STOP: RE-ENABLE BUTTON
        setLoader(false);
      }
    });
  }

  // ===============================
  // 🧼 CLEAR BUTTON
  // ===============================
  const clearBtn = document.querySelector(".form-row-reset .btn-clear");
  if (clearBtn && form) {
    clearBtn.addEventListener("click", e => {
      e.preventDefault();

      // Check if any text/select inputs have values
      const hasInputValues = Array.from(form.querySelectorAll("input:not([type='checkbox']), select"))
        .some(el => el.value.trim() !== "");

      // Check if any day checkboxes are checked
      const hasCheckedDays = document.querySelectorAll('input[name="days"]:checked').length > 0;

      // Only reset and show toast if the form is NOT empty
      if (hasInputValues || hasCheckedDays) {
        form.reset();
        document.querySelectorAll('input[name="days"]').forEach(cb => cb.checked = false);
        showScheduleToast("Form cleared.", "info");
      }
    });
  }

  // ===============================
  // 🗑 DELETE HANDLER + CONFIRM MODAL
  // ===============================
  const scheduleConfirmOverlay   = document.getElementById("schedule-delete-confirm");
  const scheduleConfirmText      = document.getElementById("confirm-schedule-text");
  const scheduleConfirmDeleteBtn = document.getElementById("s-confirm-delete-btn");
  const scheduleConfirmCancelBtn = document.getElementById("s-confirm-cancel-btn");

  function openDeleteModal(row) {
    if (!scheduleConfirmOverlay || !scheduleConfirmText) return;

    const dayText  = row.days_compact || row.days || "—";
    const timeText = `${formatTime12h(row.start_time)} – ${formatTime12h(row.end_time)}`;

    scheduleConfirmText.innerHTML = `
      <strong>${row.teacher_name || "Unknown teacher"}</strong><br>
      ${row.subject_code || ""} • Room ${row.room || "—"}<br>
      ${dayText} • ${timeText}
    `;

    scheduleConfirmOverlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeDeleteModal() {
    if (!scheduleConfirmOverlay) return;
    scheduleConfirmOverlay.classList.add("hidden");
    document.body.style.overflow = "";
    pendingDeleteId = null;
  }

  tableBody.addEventListener("click", e => {
    const btn = e.target.closest(".sched-delete-btn");
    if (!btn) return;

    const id  = btn.dataset.id;
    const row = scheduleRows.find(r => String(r.id) === String(id));
    if (!row) return;

    pendingDeleteId = id;
    openDeleteModal(row);
  });

  if (scheduleConfirmCancelBtn) {
    scheduleConfirmCancelBtn.addEventListener("click", () => closeDeleteModal());
  }

  if (scheduleConfirmDeleteBtn) {
    scheduleConfirmDeleteBtn.addEventListener("click", async () => {
      if (!pendingDeleteId) {
        closeDeleteModal();
        return;
      }

      try {
        const fd = new URLSearchParams();
        fd.append("id", String(pendingDeleteId));

        // ✅ FIX: Use absolute clean URL for Delete
        const baseUrl = window.location.origin;
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const deleteUrl = `${cleanBase}/api/schedule_delete`; 

        const resDelete = await fetch(deleteUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest"
          },
          body: fd.toString(),
          credentials: "same-origin",
        });

        const data = await resDelete.json().catch(() => null);

        if (!resDelete.ok || !data || data.ok !== true) {
          const msg = data?.msg || "Failed to delete schedule.";
          showScheduleToast(`Schedule delete error: ${msg}`, "error");
          closeDeleteModal();
          return;
        }

        showScheduleToast("Schedule deleted.", "success");
        closeDeleteModal();
        await loadSchedules();

        if (window.KLASECO_REFRESH && typeof window.KLASECO_REFRESH.emit === "function") {
          window.KLASECO_REFRESH.emit("schedule-changed");
        } else {
          window.dispatchEvent(new CustomEvent("schedule-changed"));
        }

      } catch (err) {
        console.error("Schedule delete error:", err);
        showScheduleToast("Schedule delete error: Server error while deleting schedule.", "error");
        closeDeleteModal();
      }
    });
  }

  // ===============================
  // 🕒 AUTO-REFRESH EVERY 30 SECONDS
  // ===============================
  setInterval(async () => {
    // This refreshes the table data automatically in the background
    await loadSchedules();
    console.log("Schedules auto-refreshed.");
  }, 30000);
});