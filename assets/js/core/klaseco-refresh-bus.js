// ============================================
// 🌐 KLASECO - Global Silent Refresh Bus
// File: assets/js/core/klaseco-refresh-bus.js
// Use in ALL roles: Admin, AcademicAdmin, Maint Head,
// Maint Staff, Tap Screen, etc.
// ============================================
(() => {
  "use strict";

  // Prevent double-initialization
  if (window.KLASECO_REFRESH) return;

  const localBus = new EventTarget();

  // Cross-tab channel (if supported)
  let bc = null;
  if (typeof BroadcastChannel !== "undefined") {
    bc = new BroadcastChannel("KLASECO_GLOBAL_REFRESH");
  }

  // Fallback via localStorage
  const STORAGE_KEY = "KLASECO_GLOBAL_REFRESH_PING";

  // -----------------------------
  // 🔊 Emit (publish) an event
  // -----------------------------
  function emit(topic, payload = {}) {
    const detail = {
      topic,      // e.g. "schedule-changed"
      payload,    // optional extra info
      ts: Date.now(),
    };

    // 1) Dispatch locally on THIS page
    const ev = new CustomEvent("klaseco-refresh", { detail });
    localBus.dispatchEvent(ev);

    // 2) Broadcast to other tabs / windows
    if (bc) {
      bc.postMessage(detail);
    } else {
      // Fallback using storage event
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(detail));
        // small cleanup
        setTimeout(() => localStorage.removeItem(STORAGE_KEY), 200);
      } catch {
        // ignore quota errors
      }
    }
  }

  // -----------------------------
  // 👂 Subscribe to a topic
  // -----------------------------
  function subscribe(topic, handler) {
    if (typeof handler !== "function") return;

    const wrapped = (ev) => {
      if (!ev || !ev.detail) return;
      if (ev.detail.topic !== topic) return;
      handler(ev.detail.payload, ev.detail);
    };

    handler.__klasecoWrapped = wrapped;
    localBus.addEventListener("klaseco-refresh", wrapped);
  }

  // -----------------------------
  // 🚫 Unsubscribe
  // -----------------------------
  function unsubscribe(topic, handler) {
    if (!handler || !handler.__klasecoWrapped) return;
    localBus.removeEventListener("klaseco-refresh", handler.__klasecoWrapped);
    delete handler.__klasecoWrapped;
  }

  // -----------------------------
  // 🔄 Cross-tab listeners
  // -----------------------------
  if (bc) {
    bc.addEventListener("message", (msg) => {
      const ev = new CustomEvent("klaseco-refresh", { detail: msg.data });
      localBus.dispatchEvent(ev);
    });
  } else {
    window.addEventListener("storage", (e) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const detail = JSON.parse(e.newValue);
        const ev = new CustomEvent("klaseco-refresh", { detail });
        localBus.dispatchEvent(ev);
      } catch {
        // ignore parse errors
      }
    });
  }

  // -----------------------------
  // 🌍 Expose globally
  // -----------------------------
  window.KLASECO_REFRESH = {
    emit,        // KLASECO_REFRESH.emit("schedule-changed", {...})
    subscribe,   // KLASECO_REFRESH.subscribe("schedule-changed", handler)
    unsubscribe, // KLASECO_REFRESH.unsubscribe("schedule-changed", handler)
  };

})();
