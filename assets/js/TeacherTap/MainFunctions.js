// =============================================
// 🧠 KLASECO - Teacher Tap Screen (RFID + BIOMETRIC + ROOM)
//  -> Supabase teachers + PHP API + ESP8266
// ✅ FIXED: verifyBiometric() now matches on any of the 3 stored IDs
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // -------------------------------------------------
  // 🔗 DOM REFERENCES
  // -------------------------------------------------
  const roomSelectScreen   = document.getElementById("room-select-screen");
  const attendanceWrapper  = document.querySelector(".attendance-wrapper");
  const roomLabelEl        = document.getElementById("selected-room-label");

  const clockTopEl         = document.getElementById("top-clock");
  const clockBottomEl      = document.getElementById("current-time-bottom");
  const lastTapTimeEl      = document.getElementById("last-tap-time");
  const lastUpdatedEl      = document.getElementById("last-updated");

  const teacherNameEl      = document.getElementById("teacher-name");
  const teacherIdEl        = document.getElementById("teacher-id");
  const teacherRfidEl      = document.getElementById("teacher-rfid");
  const teacherStatusEl    = document.getElementById("teacher-status");

  const displayRfidEl      = document.getElementById("display-rfid") || teacherRfidEl;
  const displayBioEl       = document.getElementById("display-bio");

  const todayInCountEl     = document.getElementById("today-in-count");
  const todayOutCountEl    = document.getElementById("today-out-count");
  const logListEl          = document.getElementById("log-list");

  const focusChipSpan      = document.querySelector(".chip-focus span");
  const btnBackToRoom      = document.getElementById("btn-back-to-room");

  const cardStep1El        = document.getElementById("card-step-1") || document.querySelector(".tap-card-outer");
  const cardStep2El        = document.getElementById("card-step-2") || document.querySelector(".bio-card-outer");
  const rfidStatusEl       = document.getElementById("rfid-status-text");
  const bioStatusEl        = document.getElementById("bio-status-text");

  const sensorDotEl        = document.getElementById("sensor-dot");
  const sensorTextEl       = document.getElementById("sensor-text");

  // -------------------------------------------------
  // 🌍 CONFIG & STATE
  // -------------------------------------------------
  let registeredTeachers   = [];
  let classSchedules       = [];
  let currentStep          = 1;       // 1 = RFID, 2 = BIOMETRIC
  let tempTeacherCandidate = null;
  let socket               = null;

  let rfidBuffer = "";
  let rfidTimer  = null;

  let attendanceBusy    = false;
  let lastAttendanceKey = "";
  let lastAttendanceAt  = 0;
  const ATTENDANCE_COOLDOWN_MS = 6000;

  // -------------------------------------------------
  // 🕒 CLOCK HELPERS
  // -------------------------------------------------
  function formatFullTime(date) {
    return date.toLocaleTimeString("en-PH", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
    });
  }

  function formatShortTime(date) {
    return date.toLocaleTimeString("en-PH", {
      hour: "2-digit", minute: "2-digit", hour12: true
    });
  }

  function parseServerTs(ts) {
    if (!ts) return new Date();
    const s = String(ts).trim();

    if (/\dT\d/.test(s) && /Z|[+\-]\d\d:\d\d/.test(s)) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    if (/\dT\d/.test(s) && !/Z|[+\-]\d\d:\d\d/.test(s)) {
      const d = new Date(s + "+08:00");
      return isNaN(d.getTime()) ? new Date() : d;
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
      const d = new Date(s.replace(" ", "T") + "+08:00");
      return isNaN(d.getTime()) ? new Date() : d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  function startClock() {
    const updateClock = () => {
      const now  = new Date();
      const full = formatFullTime(now);
      if (clockTopEl)    clockTopEl.textContent    = full;
      if (clockBottomEl) clockBottomEl.textContent = full;
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  // -------------------------------------------------
  // 🧑‍🏫 TEACHER INFO / STATUS UI
  // -------------------------------------------------
  function clearTeacherInfo() {
    if (teacherNameEl) teacherNameEl.textContent = "---";
    if (teacherIdEl)   teacherIdEl.textContent   = "---";
    if (displayRfidEl) displayRfidEl.textContent = "---";
    if (displayBioEl)  displayBioEl.textContent  = "---";
  }

  function setSystemStatus(text, mode = "standby") {
    if (!teacherStatusEl) return;
    teacherStatusEl.textContent = text;
    teacherStatusEl.classList.remove("status-in", "status-out", "status-error", "status-scan");
    switch (mode) {
      case "in":    teacherStatusEl.classList.add("status-in");    break;
      case "out":   teacherStatusEl.classList.add("status-out");   break;
      case "scan":  teacherStatusEl.classList.add("status-scan");  break;
      case "error": teacherStatusEl.classList.add("status-error"); break;
    }
  }

  function setFocusLabel(label) {
    if (focusChipSpan) focusChipSpan.textContent = `Focus: ${label}`;
  }

  function updateLastTapInfo(dateObj) {
    if (lastTapTimeEl) lastTapTimeEl.textContent = formatShortTime(dateObj);
    if (lastUpdatedEl) lastUpdatedEl.innerHTML   = `<small>Last update: ${formatFullTime(dateObj)}</small>`;
  }

  // -------------------------------------------------
  // 1️⃣ LOAD TEACHER DATABASE FROM SUPABASE
  // -------------------------------------------------
  async function loadSupabaseTeachers() {
    try {
      const res  = await fetch("api/get_teachers.php?ts=" + Date.now(), { cache: "no-store" });
      const data = await res.json();

      if (!data.ok) {
        console.error("[DB] Error loading teachers:", data.msg);
        if (rfidStatusEl) rfidStatusEl.textContent = "Database error.";
        return;
      }

      registeredTeachers = (data.rows || []).map(t => ({
        id:           t.id,
        teacherCode:  t.teacher_id,
        name:         t.name,
        program:      t.program,
        rfid:         (t.rfid ?? "").toString().trim(),

        // ✅ All 3 fingerprint IDs mapped from DB
        biometricId:  (t.fingerprint_id   ?? "").toString().trim(),
        biometricId2: (t.fingerprint_id_2 ?? "").toString().trim(),
        biometricId3: (t.fingerprint_id_3 ?? "").toString().trim(),
      }));

      console.log("[DB] Loaded teachers:", registeredTeachers.length);
    } catch (err) {
      console.error("[DB] Failed to fetch teachers:", err);
      if (rfidStatusEl) rfidStatusEl.textContent = "Database connection error.";
    }
  }

  // -------------------------------------------------
  // 2️⃣ RFID READER (keyboard emulation)
  // -------------------------------------------------
  function handleRfidKeydown(e) {
    if (attendanceWrapper && attendanceWrapper.classList.contains("hidden-attendance")) return;
    if (currentStep !== 1) return;

    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (e.key === "Enter") {
      const code = rfidBuffer.trim();
      rfidBuffer = "";
      if (code) processRFID(code);
      return;
    }

    if (e.key.length === 1) rfidBuffer += e.key;

    clearTimeout(rfidTimer);
    rfidTimer = setTimeout(() => { rfidBuffer = ""; }, 100);
  }

  function processRFID(scannedCode) {
    if (!scannedCode) return;
    const codeNorm = scannedCode.toString().trim();
    const teacher  = registeredTeachers.find(t => t.rfid === codeNorm);

    if (!teacher) {
      handleRFIDError("Access Denied. Card not registered.");
      return;
    }

    const activeSched = getActiveSchedule(teacher.name);

    if (activeSched) {
      tempTeacherCandidate = {
        ...teacher,
        assignedRoom:   activeSched.room.trim(),
        currentSubject: activeSched.subject_code
      };

      if (roomLabelEl) roomLabelEl.textContent = activeSched.room;

      handleRFIDSuccess(tempTeacherCandidate);
      setSystemStatus(`Room ${activeSched.room}: ${activeSched.subject_code}`, "scan");
    } else {
      handleRFIDError("No active class scheduled for you right now.");
    }
  }

  function handleRFIDSuccess(teacher) {
    tempTeacherCandidate = teacher;

    if (rfidStatusEl) {
      rfidStatusEl.innerHTML =
        `<span style="color:#2ecc71"><i class="fa-solid fa-check"></i> Card Accepted!</span>`;
    }
    if (cardStep1El) cardStep1El.classList.add("active");

    if (teacherNameEl) teacherNameEl.textContent = "Verifying...";
    if (teacherIdEl)   teacherIdEl.textContent   = teacher.teacherCode || teacher.id || "---";
    if (displayRfidEl) displayRfidEl.textContent = teacher.rfid || "---";

    setSystemStatus("RFID Accepted", "scan");

    setTimeout(() => {
      currentStep = 2;
      activateBioStep();
    }, 800);
  }

  function handleRFIDError(msg) {
    if (rfidStatusEl) {
      rfidStatusEl.innerHTML = `<span style="color:#e74c3c">${msg}</span>`;
    }
    if (cardStep1El) {
      cardStep1El.classList.add("shake-anim");
      setTimeout(() => cardStep1El.classList.remove("shake-anim"), 600);
    }
    setTimeout(() => {
      if (rfidStatusEl) {
        rfidStatusEl.innerHTML = `Place card near reader.<br><strong>Waiting for scan...</strong>`;
      }
    }, 2000);

    clearTeacherInfo();
    setSystemStatus("RFID not accepted", "error");
  }

  // -------------------------------------------------
  // 3️⃣ WEBSOCKET TO BRIDGE
  // -------------------------------------------------
  function initWebSocket() {
    if (!("WebSocket" in window)) return;

    function connect() {
      socket = new WebSocket("wss://www.klaseco.com/bridge");

      socket.onopen = () => {
        console.log("✅ Connected to Klaseco Bridge");
        if (sensorDotEl)  sensorDotEl.className    = "status-dot online";
        if (sensorTextEl) sensorTextEl.textContent = "Sensor Online";
      };

      socket.onmessage = (event) => {
        const raw = String(event.data).trim();
        console.log("📥 Bridge Data:", raw);

        // Only process messages from the Attendance sensor
        if (!raw.startsWith("[ATTEND]")) return;

        const message = raw.slice("[ATTEND]".length).toUpperCase();
        handleSensorMessage(message);
      };

      socket.onclose = () => {
        console.warn("❌ Bridge Disconnected. Retrying...");
        if (sensorDotEl)  sensorDotEl.className    = "status-dot offline";
        if (sensorTextEl) sensorTextEl.textContent = "Sensor Offline";
        setTimeout(connect, 5000);
      };

      socket.onerror = (err) => {
        console.error("WebSocket Error:", err);
      };
    }
    connect();
  }

  function handleSensorMessage(line) {
    if (currentStep !== 2) return;

    if (line.startsWith("FOUND_ID:")) {
      const parts      = line.split(":");
      const scannedBioId = (parts[1] || "").trim();
      verifyBiometric(scannedBioId);
    } else if (line.includes("FAIL") || line.includes("MISMATCH")) {
      if (bioStatusEl) {
        bioStatusEl.innerHTML = `<span style="color:#e74c3c">Fingerprint not recognized.</span>`;
      }
      if (cardStep2El) {
        cardStep2El.classList.add("shake-anim");
        setTimeout(() => cardStep2El.classList.remove("shake-anim"), 1000);
      }
    }
  }

  function activateBioStep() {
    if (!tempTeacherCandidate) return;

    if (cardStep1El) {
      cardStep1El.style.opacity = "0.5";
      cardStep1El.classList.add("active");
    }
    if (cardStep2El) {
      cardStep2El.classList.remove("disabled");
      cardStep2El.classList.add("active");
    }

    if (bioStatusEl) {
      bioStatusEl.innerHTML = `Scan finger for <strong>${tempTeacherCandidate.name}</strong>`;
    }
    setSystemStatus("Waiting for fingerprint...", "scan");

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send("MATCH_MODE");
      console.log("📡 Sent: MATCH_MODE");
    } else {
      console.error("❌ Cannot send MATCH_MODE: Bridge not connected.");
    }
  }

  // -------------------------------------------------
  // ✅ FIXED: verifyBiometric
  //
  //  The sensor's fingerFastSearch() returns the slot ID of whichever
  //  stored template matched. Since we enrolled the same finger into
  //  THREE separate slots, the returned ID could be any of:
  //    teacher.biometricId   (fingerprint_id)
  //    teacher.biometricId2  (fingerprint_id_2)
  //    teacher.biometricId3  (fingerprint_id_3)
  //
  //  We accept the match if scannedID equals ANY of the three.
  // -------------------------------------------------
  function verifyBiometric(scannedId) {
    if (!tempTeacherCandidate) return;

    const sensorID = parseInt(scannedId, 10);

    // Collect all stored IDs for this teacher (skip empty/NaN)
    const storedIDs = [
      parseInt(tempTeacherCandidate.biometricId,  10),
      parseInt(tempTeacherCandidate.biometricId2, 10),
      parseInt(tempTeacherCandidate.biometricId3, 10),
    ].filter(n => !isNaN(n) && n > 0);

    console.log(`[BIO] Sensor ID: ${sensorID}  |  DB IDs: [${storedIDs.join(", ")}]`);

    if (storedIDs.length === 0) {
      if (bioStatusEl) {
        bioStatusEl.innerHTML =
          `<span style="color:#e67e22; font-weight:bold">
             No fingerprint IDs in database for this teacher.
           </span>`;
      }
      setSystemStatus("Missing fingerprint in DB", "error");
      return;
    }

    // ✅ Accept if sensor ID matches ANY of the teacher's stored slot IDs
    if (!isNaN(sensorID) && storedIDs.includes(sensorID)) {
      console.log("✅ Biometric confirmed! Matched on ID #" + sensorID);
      postAttendanceToServer(tempTeacherCandidate, sensorID);
    } else {
      console.log("❌ Biometric mismatch. Sensor: " + sensorID + " | Stored: [" + storedIDs.join(", ") + "]");

      if (bioStatusEl) {
        bioStatusEl.innerHTML =
          `<span style="color:#e74c3c; font-weight:bold">
             Identity Mismatch! Wrong finger. (Sensor ID: ${sensorID})
           </span>`;
      }
      if (cardStep2El) cardStep2El.classList.add("shake-anim");
      setSystemStatus("Biometric mismatch", "error");

      setTimeout(() => {
        if (cardStep2El) cardStep2El.classList.remove("shake-anim");
        if (currentStep === 2 && bioStatusEl && tempTeacherCandidate) {
          bioStatusEl.innerHTML =
            `Scan finger for <strong>${tempTeacherCandidate.name}</strong>`;
        }
        // Re-enable scanning for another attempt
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send("MATCH_MODE");
        }
      }, 2000);
    }
  }

  // -------------------------------------------------
  // 4️⃣ POST ATTENDANCE TO SERVER
  // -------------------------------------------------
  async function postAttendanceToServer(teacher, fingerprintId) {
    const roomCode = (teacher.assignedRoom || roomLabelEl?.textContent || "").trim();

    const payload = {
      teacher_id:     parseInt(teacher.id),
      rfid:           String(teacher.rfid || "").trim(),
      fingerprint_id: String(fingerprintId || "").trim(),
      room:           roomCode,
      subject_code:   teacher.currentSubject
    };

    try {
      const res = await fetch("api/teacher_tap", {
        method: "POST",
        headers: {
          "Content-Type":     "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (bioStatusEl) {
          bioStatusEl.innerHTML = `<span style="color:#e74c3c">${data.msg}</span>`;
        }
        setSystemStatus("Access Denied", "error");
        setTimeout(resetFlow, 4000);
        return;
      }
      recordAttendanceFromServer(teacher, data);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  }

  function recordAttendanceFromServer(teacher, payload) {
    const att    = payload.attendance || {};
    const counts = payload.today_counts || {};

    const status     = (att.status || "IN").toUpperCase();
    const swipeHuman = String(att.swipe_ts_human || "").trim();
    const tsDate     = parseServerTs(att.swipe_ts);
    const displayTime = swipeHuman || formatShortTime(tsDate);

    if (teacherNameEl) teacherNameEl.textContent = teacher.name || "---";
    if (teacherIdEl)   teacherIdEl.textContent   = teacher.teacherCode || teacher.id || "---";
    if (displayRfidEl) displayRfidEl.textContent = teacher.rfid || "---";
    if (displayBioEl)  displayBioEl.textContent  = `ID #${teacher.biometricId || "---"}`;

    if (teacherStatusEl) {
      teacherStatusEl.textContent = status;
      teacherStatusEl.classList.remove("status-in", "status-out");
      teacherStatusEl.classList.add(status === "IN" ? "status-in" : "status-out");
    }

    if (bioStatusEl) {
      bioStatusEl.innerHTML = `
        <span style="color:#2ecc71; font-size:1.2rem; font-weight:bold">
          <i class="fa-solid fa-circle-check"></i> ${status} SUCCESS
        </span>
      `;
    }

    updateLastTapInfo(tsDate);
    setSystemStatus(status === "IN" ? "Teacher IN" : "Teacher OUT", status.toLowerCase());

    addLogRow(teacher, displayTime, status);

    if (todayInCountEl)  todayInCountEl.textContent  = counts.in  ?? 0;
    if (todayOutCountEl) todayOutCountEl.textContent = counts.out ?? 0;

    setTimeout(resetFlow, 3000);
  }

  function addLogRow(teacher, time, status) {
    if (!logListEl) return;

    const row = document.createElement("div");
    row.className      = "log-item";
    row.dataset.id     = teacher.id;
    row.dataset.status = status;

    row.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-name">${teacher.name || ""}</span>
      <span class="log-prog">${teacher.program || ""}</span>
      <span class="log-pill ${status.toLowerCase()}">${status}</span>
    `;

    row.style.animation = "slideIn 0.3s ease-out";
    logListEl.prepend(row);
  }

  function resetFlow() {
    currentStep          = 1;
    tempTeacherCandidate = null;
    rfidBuffer           = "";

    if (cardStep1El) {
      cardStep1El.style.opacity = "1";
      cardStep1El.classList.remove("active", "shake-anim");
    }
    if (cardStep2El) {
      cardStep2El.classList.add("disabled");
      cardStep2El.classList.remove("active", "shake-anim");
    }
    if (rfidStatusEl) {
      rfidStatusEl.innerHTML =
        `Place card near reader.<br><strong>Waiting for scan...</strong>`;
    }
    if (bioStatusEl) {
      bioStatusEl.innerHTML =
        `Verify Identity.<br><strong>Locked (Tap RFID first)</strong>`;
    }

    clearTeacherInfo();
    setSystemStatus("Standby");
    setFocusLabel("Tap");
  }

  // -------------------------------------------------
  // 5️⃣ ROOM SELECTION
  // -------------------------------------------------
  function setupRoomSelection() {
    document.querySelectorAll(".room-card").forEach((card) => {
      card.addEventListener("click", function () {
        const roomName = this.getAttribute("data-room") || this.textContent.trim();
        if (roomSelectScreen)  roomSelectScreen.style.display = "none";
        if (attendanceWrapper) attendanceWrapper.classList.remove("hidden-attendance");
        if (roomLabelEl)       roomLabelEl.textContent = roomName;
        resetFlow();
      });
    });

    if (btnBackToRoom) {
      btnBackToRoom.addEventListener("click", () => {
        if (attendanceWrapper) attendanceWrapper.classList.add("hidden-attendance");
        if (roomSelectScreen)  roomSelectScreen.style.display = "flex";
      });
    }
  }

  // -------------------------------------------------
  // 6️⃣ SILENT REFRESH: TODAY'S ATTENDANCE
  // -------------------------------------------------
  async function refreshAttendanceFromServer() {
    if (!attendanceWrapper || attendanceWrapper.classList.contains("hidden-attendance")) return;
    if (!logListEl) return;

    const roomCode = roomLabelEl ? roomLabelEl.textContent.trim() : "";
    const params   = new URLSearchParams();
    if (roomCode) params.set("room", roomCode);

    try {
      const res  = await fetch("api/get_attendance_today.php?" + params.toString(), { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data.ok) return;

      const rows   = data.rows   || [];
      const counts = data.today_counts || {};

      logListEl.innerHTML = "";

      rows.forEach((row) => {
        const status  = (row.status || "IN").toUpperCase();
        const human   = String(row.swipe_ts_human || "").trim();
        const ts      = parseServerTs(row.swipe_ts);
        const timeStr = human || formatShortTime(ts);

        const item = document.createElement("div");
        item.className      = "log-item";
        item.dataset.id     = row.teacher_id;
        item.dataset.status = status;

        item.innerHTML = `
          <span class="log-time">${timeStr}</span>
          <span class="log-name">${row.name || ""}</span>
          <span class="log-prog">${row.program || ""}</span>
          <span class="log-pill ${status.toLowerCase()}">${status}</span>
        `;

        logListEl.appendChild(item);
      });

      if (todayInCountEl)  todayInCountEl.textContent  = counts.in  ?? 0;
      if (todayOutCountEl) todayOutCountEl.textContent = counts.out ?? 0;

      updateLastTapInfo(new Date());
    } catch (err) {
      console.error("[ATT-REFRESH] Error:", err);
    }
  }

  function startAttendanceSilentRefresh() {
    refreshAttendanceFromServer();
    setInterval(refreshAttendanceFromServer, 1000);
  }

  // -------------------------------------------------
  // 7️⃣ SCHEDULE HELPERS
  // -------------------------------------------------
  async function loadClassSchedules() {
    try {
      const res = await fetch("api/schedule_list?_=" + Date.now(), { credentials: "same-origin" });
      if (res.status === 401) {
        console.error("[SCHED] Unauthorized.");
        return;
      }
      const data = await res.json();
      if (data.ok) {
        classSchedules = data.rows || [];
        console.log("[SCHED] Loaded:", classSchedules.length);
      }
    } catch (err) {
      console.error("[SCHED] Failed:", err);
    }
  }

  function getActiveSchedule(teacherName) {
    const now         = new Date();
    const currentRoom = roomLabelEl ? roomLabelEl.textContent.trim() : "";

    const dayNames       = ["S", "M", "T", "W", "Th", "F", "S"];
    const currentDayCode = dayNames[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const GRACE_BEFORE = 15;
    const GRACE_AFTER  = 30;

    return classSchedules.find(sched => {
      const roomMatch = String(sched.room).trim() === currentRoom;
      const nameMatch = sched.teacher_name.toLowerCase().trim() === teacherName.toLowerCase().trim();
      const dayMatch  = sched.days.includes(currentDayCode);

      const startMinutes = parse12ToMinutes(sched.start_time) - GRACE_BEFORE;
      const endMinutes   = parse12ToMinutes(sched.end_time)   + GRACE_AFTER;
      const timeMatch    = currentMinutes >= startMinutes && currentMinutes <= endMinutes;

      return nameMatch && roomMatch && dayMatch && timeMatch;
    });
  }

  function parse12ToMinutes(t) {
    if (!t) return 0;
    let [hm, suffix] = t.split(" ");
    let [hStr, mStr] = hm.split(":");
    let h = parseInt(hStr, 10);
    let m = parseInt(mStr, 10);
    if (suffix === "PM" && h !== 12) h += 12;
    if (suffix === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }

  // -------------------------------------------------
  // 🚀 INIT
  // -------------------------------------------------
  function init() {
    startClock();
    clearTeacherInfo();
    setSystemStatus("Standby");
    setFocusLabel("Tap");
    resetFlow();

    loadSupabaseTeachers();
    loadClassSchedules();
    initWebSocket();
    setupRoomSelection();

    // Reload teachers + schedules every second
    setInterval(() => {
      loadSupabaseTeachers();
      loadClassSchedules();
    }, 1000);

    window.focus();
    document.body.addEventListener("click", () => window.focus());
    document.addEventListener("keydown", handleRfidKeydown);

    startAttendanceSilentRefresh();
  }

  init();
});
