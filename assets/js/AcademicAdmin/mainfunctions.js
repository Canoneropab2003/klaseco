function showLoginToast(message) {
  const toast = document.getElementById('login-toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove('show');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
  });

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// DASHBOARD LOADING SCREEN + TOAST (only show toast after loader)
window.addEventListener("load", () => {
  const loader       = document.getElementById("loading-screen");
  const toastMessage = sessionStorage.getItem("loginToast");
  const fromLogin    = sessionStorage.getItem("fromLogin");

  function triggerToast() {
    if (!toastMessage) return;
    showLoginToast(toastMessage);
    sessionStorage.removeItem("loginToast");
  }

  if (!loader) {
    if (toastMessage) triggerToast();
    return;
  }

  if (fromLogin === "yes") {
    setTimeout(() => {
      loader.style.opacity = "0";
      loader.style.transition = "opacity .6s ease";

      setTimeout(() => {
        loader.style.display = "none";
        triggerToast(); // show toast AFTER loader hides
      }, 600);
    }, 1500);

    sessionStorage.removeItem("fromLogin");
  } else {
    loader.style.display = "none";
    if (toastMessage) triggerToast();
  }
});

// CLOCK
const timeEl = document.querySelector('.time');
const dateEl = document.querySelector('.date');

function pad(n) {
  return n.toString().padStart(2, '0');
}

function tick() {
  const now = new Date();
  const hours12 = now.getHours() % 12 || 12;
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';

  if (timeEl) {
    timeEl.textContent = `${pad(hours12)}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${ampm}`;
  }

  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  }
}

tick();
setInterval(tick, 1000);

// ================================
// PAGE SECTIONS + SIDEBAR HANDLER
// ================================
document.addEventListener('DOMContentLoaded', () => {

  // ✅ MOBILE MENU ELEMENTS (ADDED - like your second code)
  const menuToggle = document.getElementById('menuToggle'); // hamburger button
  const sidebar    = document.getElementById('sidebar');    // sidebar container
  const overlay    = document.getElementById('overlay');    // dark overlay

  // ✅ MOBILE MENU TOGGLE FUNCTION (ADDED)
  function toggleMenu(forceClose = false) {
    if (!sidebar && !overlay) return;

    if (forceClose) {
      if (sidebar) sidebar.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
      return;
    }

    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
  }

  // ✅ Attach events (ADDED)
  if (menuToggle) {
    menuToggle.addEventListener('click', () => toggleMenu());
  }
  if (overlay) {
    overlay.addEventListener('click', () => toggleMenu(true)); // close when clicking overlay
  }

  // ✅ Use the actual section IDs + .page-section class (YOUR FIRST CODE)
  const overviewSection       = document.querySelector('#overview.page-section');
  const attendanceSection     = document.querySelector('#attendance.page-section');
  const systemlogsSection     = document.querySelector('#systemlogs.page-section');
  const aichatbotSection      = document.querySelector('#aichatbot.page-section');
  const scheduleSection       = document.querySelector('#schedule.page-section');
  const analyticsSection      = document.querySelector('#analytics.page-section');
  const profileSection        = document.querySelector('#profile.page-section');
  const teacherAccountSection = document.querySelector('#teacher-account.page-section'); // ✅ kept

  const menuButtons = document.querySelectorAll('.menu-item');

  // 🔹 LOGOUT BUTTON → logout.php
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        // 1. Give instant feedback (Convenience!)
        if (typeof showLoginToast === 'function') {
          showLoginToast("Logging out...");
        }
    
        // 2. Clear front-end login flags
        sessionStorage.removeItem('fromLogin');
        sessionStorage.removeItem('loginToast');
    
        // 3. Use replace() to fix the back-button loop issue
        setTimeout(() => {
          window.location.replace("logout"); 
        }, 500); // Small delay so they can see the toast
      });
    }

  if (!overviewSection) return;

  function hideAll() {
    if (overviewSection)       overviewSection.style.display = 'none';
    if (attendanceSection)     attendanceSection.style.display = 'none';
    if (systemlogsSection)     systemlogsSection.style.display = 'none';
    if (aichatbotSection)      aichatbotSection.style.display = 'none';
    if (scheduleSection)       scheduleSection.style.display = 'none';
    if (analyticsSection)      analyticsSection.style.display = 'none';
    if (profileSection)        profileSection.style.display = 'none';
    if (teacherAccountSection) teacherAccountSection.style.display = 'none';
  }

  // ✅ Default: show Dashboard (overview)
  hideAll();
  overviewSection.style.display = 'block';

  // ✅ Default menu active
  const defaultBtn = document.querySelector('.menu-item[data-section="overview"]');
  if (defaultBtn) {
    menuButtons.forEach(btn => btn.classList.remove('active'));
    defaultBtn.classList.add('active');
  }

  // ==============================
  // MENU CLICK HANDLER
  // ==============================
  menuButtons.forEach(button => {
    button.addEventListener('click', () => {
      menuButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const section = button.dataset.section;

      hideAll();
      switch (section) {
        case 'overview':        overviewSection.style.display = 'block'; break;
        case 'attendance':      attendanceSection.style.display = 'block'; break;
        case 'systemlogs':      systemlogsSection.style.display = 'block'; break;
        case 'aichatbot':       aichatbotSection.style.display = 'block'; break;
        case 'schedule':        scheduleSection.style.display = 'block'; break;
        case 'analytics':       analyticsSection.style.display = 'block'; break;
        case 'profile':         profileSection.style.display = 'block'; break;
        case 'teacher-account': teacherAccountSection.style.display = 'block'; break;
      }

      // ✅ AUTO-CLOSE SIDEBAR ON MOBILE AFTER CLICK (ADDED - like second code)
      if (window.innerWidth <= 768) {
        if (sidebar && sidebar.classList.contains('active')) {
          toggleMenu(true);
        }
      }
    });
  });

  // ==========================================
  // 🧮 OVERVIEW: COUNT EVENTS / CLASS SCHEDULES
  // ==========================================
  const scheduleCountEl = document.getElementById("overview-schedule-count");

  async function loadOverviewCounts() {
    if (!scheduleCountEl) return;

    try {
      const res = await fetch("api/schedule_list?_=" + Date.now(), { 
      headers: { "Accept": "application/json" },
      credentials: "same-origin",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.ok !== true) {
        console.error("Overview schedule count error:", data?.error || data?.msg);
        scheduleCountEl.textContent = "—";
        return;
      }

      const rows = Array.isArray(data.rows) ? data.rows : [];
      scheduleCountEl.textContent = rows.length;
    } catch (err) {
      console.error("Overview schedule count fetch error:", err);
      scheduleCountEl.textContent = "—";
    }
  }

  // 🔹 Initial load
  loadOverviewCounts();

  // 🔹 Expose globally
  window.KLASECO_OVERVIEW = window.KLASECO_OVERVIEW || {};
  window.KLASECO_OVERVIEW.loadScheduleCount = loadOverviewCounts;

  // 🔔 Listen to the GLOBAL REFRESH BUS
  if (window.KLASECO_REFRESH && typeof window.KLASECO_REFRESH.subscribe === "function") {
    window.KLASECO_REFRESH.subscribe("schedule-changed", () => {
      loadOverviewCounts();
    });
  } else {
    window.addEventListener("schedule-changed", () => {
      loadOverviewCounts();
    });
  }
});