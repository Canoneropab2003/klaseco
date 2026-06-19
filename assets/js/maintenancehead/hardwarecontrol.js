// assets/js/maintenancehead/hardwarecontrol.js
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const section = document.querySelector("#hardware-control.page-section");
  if (!section) return;

  // --------------------------------
  // DOM REFERENCES
  // --------------------------------
  const roomTabs          = section.querySelectorAll(".room-tab");
  const roomControls      = section.querySelectorAll(".room-controls");
  const toggleButtons     = section.querySelectorAll(".toggle-device");
  const automationButtons = section.querySelectorAll(".toggle-automation");

  // --------------------------------
  // STATE (in-memory)
  // --------------------------------
  let deviceStates = {};         // { A301_LIGHT_1: "on", ... }
  let roomAuto = {};             // { A301: "on"/"off", ... }

  // Optional: labels for nicer logs/toasts
  const DEVICE_LABELS = {
    // A303
    A303_FAN_1:   "Wall Fan 1 (A303)",
    A303_FAN_2:   "Wall Fan 2 (A303)",
    A303_LIGHT_1: "Main Light 1 (A303)",
    A303_LIGHT_2: "Main Light 2 (A303)",

    // A304
    A304_FAN_1:   "Wall Fan 1 (A304)",
    A304_FAN_2:   "Wall Fan 2 (A304)",
    A304_LIGHT_1: "Main Light 1 (A304)",
    A304_LIGHT_2: "Main Light 2 (A304)"
  };

  // --------------------------------
  // SYSTEM LOGS (optional)
  // --------------------------------
  function logHardwareEvent(event, detail) {
    if (typeof addSystemLog === "function") {
      addSystemLog("Hardware", event, detail);
    } else {
      console.log(`[HARDWARE][${event}] ${detail}`);
    }
  }

  // --------------------------------
  // TOAST
  // --------------------------------
  function showHardwareToast(message, type = "info") {
    const container = document.getElementById("toast-hardware") || document.getElementById("login-toast");
    if (!container) {
      console.log(`[TOAST ${type}]`, message);
      return;
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.35s";
      setTimeout(() => toast.remove(), 350);
    }, 2200);
  }

  // --------------------------------
  // UI HELPERS — DEVICE
  // --------------------------------
  function applyDeviceStateToUI(deviceId, state) {
    const btn = section.querySelector(`.toggle-device[data-device="${deviceId}"]`);
    if (!btn) return;

    const normalized = state === "on" ? "on" : "off";
    btn.dataset.state = normalized;

    const labelSpan = btn.querySelector("span");
    if (labelSpan) labelSpan.textContent = normalized === "on" ? "Turn Off" : "Turn On";

    const statusEl = document.getElementById(`status-${deviceId}`);
    if (statusEl) {
      statusEl.textContent = normalized.toUpperCase();
      statusEl.classList.toggle("status-on", normalized === "on");
      statusEl.classList.toggle("status-off", normalized === "off");
    }
  }

  // --------------------------------
  // UI HELPERS — AUTOMATION
  // --------------------------------
  function applyRoomAutomationToUI(roomCode, state) {
    const normalized = state === "on" ? "on" : "off";
    roomAuto[roomCode] = normalized;

    // automation button
    const btn = section.querySelector(`.toggle-automation[data-room="${roomCode}"]`);
    if (btn) {
      btn.dataset.state = normalized;
      const span = btn.querySelector("span");
      if (span) span.textContent = normalized === "on" ? "Turn Automation Off" : "Turn Automation On";
    }

    // automation status chip
    const chip = document.getElementById(`auto-status-${roomCode}`);
    if (chip) {
      chip.textContent = normalized.toUpperCase();
      chip.classList.toggle("status-on", normalized === "on");
      chip.classList.toggle("status-off", normalized === "off");
    }

    // lock/unlock manual controls (CSS can style .automation-on to disable)
    const roomBlock = section.querySelector(`.room-controls[data-room="${roomCode}"]`);
    if (roomBlock) roomBlock.classList.toggle("automation-on", normalized === "on");

    // also hard-disable buttons for safety (works even without CSS)
    const manualBtns = roomBlock ? roomBlock.querySelectorAll(".toggle-device") : [];
    manualBtns.forEach(b => {
      b.disabled = (normalized === "on");
      b.classList.toggle("disabled", normalized === "on");
    });
  }

  // --------------------------------
  // API HELPERS
  // --------------------------------
  async function safeJson(res) {
    const text = await res.text();
    try { return JSON.parse(text); }
    catch (e) { return { success: false, error: text || "Invalid JSON from server" }; }
  }

  // --------------------------------
  // DB: LOAD AUTOMATION STATE PER ROOM
  // GET: api/room_automation_get.php?room=A301
  // returns: { success:true, data:{ room_code:"A301", is_enabled:true/false } }
  // --------------------------------
  async function loadAutomationFromDB(roomCode) {
    const url = `api/room_automation_get?room=${encodeURIComponent(roomCode)}&_=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = await safeJson(res);

    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to load automation state");
    }

    const state = json.data && json.data.is_enabled ? "on" : "off";
    applyRoomAutomationToUI(roomCode, state);
    return state;
  }

  async function initAutomationDB() {
    const rooms = Array.from(section.querySelectorAll(".room-controls"))
      .map(el => el.dataset.room)
      .filter(Boolean);

    const uniqueRooms = rooms.length ? Array.from(new Set(rooms)) : ["A303", "A304"];

    for (const room of uniqueRooms) {
      try {
        await loadAutomationFromDB(room);
      } catch (err) {
        console.error(err);
        applyRoomAutomationToUI(room, "off"); // safe fallback
      }
    }

    logHardwareEvent("Automation Init", "Room automation states loaded from DB.");
  }

  // --------------------------------
  // DB: SET AUTOMATION STATE
  // POST: api/room_automation_set.php
  // body: { room_code:"A301", is_enabled:true/false }
  // --------------------------------
  async function setAutomationInDB(roomCode, isEnabled) {
  const payload = { room_code: roomCode, is_enabled: !!isEnabled };
  console.log("[AUTO SET] sending:", payload);

  const res = await fetch("api/room_automation_set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload)
  });

  const json = await safeJson(res);
  console.log("[AUTO SET] status:", res.status, "response:", json);

  if (!res.ok || !json.success) {
    throw new Error(json.error || "Failed to set automation");
  }

  return json.data;
}


  // --------------------------------
  // DB: LOAD DEVICE STATES
  // GET: api/hardware_get_states.php
  // returns: { success:true, data:[{device_key,status},...] }
  // --------------------------------
  async function loadAllDeviceStatesFromDB() {
    try {
      const res = await fetch(`api/hardware_get_states?_=${Date.now()}`, { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok || !json.success) {
        showHardwareToast(json.error || "Failed to load device states.", "error");
        return;
      }

      deviceStates = {};
      (json.data || []).forEach(row => {
        const key = row.device_key;
        const st = String(row.status || "off").toLowerCase() === "on" ? "on" : "off";
        deviceStates[key] = st;
        applyDeviceStateToUI(key, st);
      });

      logHardwareEvent("Init", "Hardware device states loaded from DB.");
    } catch (err) {
      console.error(err);
      showHardwareToast("Error loading device states.", "error");
    }
  }

  // --------------------------------
  // DB: UPDATE SINGLE DEVICE STATE
  // POST: api/hardware_update_status.php
  // --------------------------------
  async function updateDeviceStateInDB(deviceId, roomCode, newState) {
    try {
    const baseUrl = window.location.origin;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // ✅ Use clean URL (no .php) for live hosting compatibility
    const res = await fetch(`${cleanBase}/api/hardware_update_status`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },
      body: JSON.stringify({ 
        device_key: deviceId, 
        room_code: roomCode, 
        status: newState 
      })
    });

      const json = await safeJson(res);

      if (!res.ok || !json.success) {
        showHardwareToast(json.error || "Failed to update device status.", "error");
        return false;
      }

      logHardwareEvent("DB Update", `Device ${deviceId} (${roomCode}) => ${newState.toUpperCase()}`);
      return true;
    } catch (err) {
      console.error(err);
      showHardwareToast("Error updating device status.", "error");
      return false;
    }
  }

  // --------------------------------
  // ROOM TABS
  // --------------------------------
  function switchRoom(roomId) {
    roomTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.room === roomId));
    roomControls.forEach(block => block.classList.toggle("hidden", block.dataset.room !== roomId));
  }

  roomTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const room = tab.dataset.room;
      if (room) switchRoom(room);
    });
  });

  const defaultTab = section.querySelector(".room-tab.active") || roomTabs[0];
  if (defaultTab) switchRoom(defaultTab.dataset.room);

  // --------------------------------
  // DEVICE TOGGLE (manual) — BLOCK if automation ON
  // --------------------------------
  async function setDeviceState(deviceId, roomCode, nextState) {
    const autoState = roomAuto[roomCode] || "off";
    if (autoState === "on") {
      showHardwareToast(`Automation is ON for ${roomCode}. Manual control locked.`, "error");
      return;
    }

    const oldState = deviceStates[deviceId] || "off";

    // optimistic UI
    deviceStates[deviceId] = nextState === "on" ? "on" : "off";
    applyDeviceStateToUI(deviceId, deviceStates[deviceId]);

    const ok = await updateDeviceStateInDB(deviceId, roomCode, deviceStates[deviceId]);
    if (!ok) {
      deviceStates[deviceId] = oldState;
      applyDeviceStateToUI(deviceId, oldState);
      return;
    }

    const label = DEVICE_LABELS[deviceId] || deviceId;
    showHardwareToast(`${label} turned ${nextState.toUpperCase()}.`, "success");
    logHardwareEvent("Toggle", `${label} (${roomCode}) turned ${nextState.toUpperCase()}`);
  }

  toggleButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const deviceId = btn.dataset.device;
      if (!deviceId) return;

      let roomCode = btn.dataset.room;
      if (!roomCode) {
        const parentRoom = btn.closest(".room-controls");
        roomCode = parentRoom ? parentRoom.dataset.room : "";
      }
      if (!roomCode) return;

      const current = btn.dataset.state === "on" ? "on" : "off";
      const next = current === "on" ? "off" : "on";
      setDeviceState(deviceId, roomCode, next);
    });
  });

  // --------------------------------
  // AUTOMATION TOGGLE — DB-DRIVEN ✅
  // --------------------------------
  automationButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const roomCode = btn.dataset.room;
      if (!roomCode) return;

      const current = btn.dataset.state === "on" ? "on" : "off";
      const next = current === "on" ? "off" : "on";

      // optimistic UI
      applyRoomAutomationToUI(roomCode, next);

      try {
        await setAutomationInDB(roomCode, next === "on");

        showHardwareToast(`Automation for ${roomCode} is now ${next.toUpperCase()}.`, "success");
        logHardwareEvent("Automation", `Room ${roomCode} automation => ${next.toUpperCase()} (DB)`);

        // Optional: when turning automation OFF, reload device states (sync UI)
        if (next === "off") {
          await loadAllDeviceStatesFromDB();
        }
      } catch (err) {
        console.error(err);

        // revert if failed
        applyRoomAutomationToUI(roomCode, current);
        showHardwareToast(`Failed to update automation for ${roomCode}.`, "error");
        logHardwareEvent("Automation Error", `Failed to set ${roomCode} => ${next.toUpperCase()}`);
      }
    });
  });

  // --------------------------------
  // INITIALIZE
  // --------------------------------
  (async function init() {
    await initAutomationDB();         // ✅ reads automation state from DB (Arduino will also read)
    await loadAllDeviceStatesFromDB(); // loads device status from DB
  })();
});
