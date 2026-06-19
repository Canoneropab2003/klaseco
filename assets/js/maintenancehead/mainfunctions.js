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
  // ✅ Use the actual section IDs + .page-section class
  const overviewSection            = document.querySelector('#overview.page-section');
  const maintenanceAccountSection  = document.querySelector('#maintenance-account.page-section');
  const maintenanceSection         = document.querySelector('#maintenance.page-section');
  const hardwareSection            = document.querySelector('#hardware.page-section');
  const hardwareControlSection     = document.querySelector('#hardware-control.page-section');
  const systemlogsSection          = document.querySelector('#systemlogs.page-section');
  const profileSection             = document.querySelector('#profile.page-section');
  const menuButtons = document.querySelectorAll('.menu-item');

// 🔹 LOGOUT BUTTON → logout.php (kills PHP session via session_boot.php)
const logoutBtn = document.querySelector('.logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    // Clear front-end login flags
    sessionStorage.removeItem('fromLogin');
    sessionStorage.removeItem('loginToast');

    // Go through PHP logout, which destroys the session and redirects to login.php
    window.location.href = "logout.php";
    // or: window.location.replace("logout.php");
  });
}


  if (!overviewSection) return;

  function hideAll() {
    if (overviewSection)            overviewSection.style.display = 'none';
    if (maintenanceAccountSection)  maintenanceAccountSection.style.display = 'none';
    if (maintenanceSection)         maintenanceSection.style.display = 'none';
    if (hardwareSection)            hardwareSection.style.display = 'none';
    if (hardwareControlSection)     hardwareControlSection.style.display = 'none';
    if (systemlogsSection)          systemlogsSection.style.display = 'none';
    if (profileSection)             profileSection.style.display = 'none';
  }

  // ✅ Default: show Dashboard (overview)
  hideAll();
  overviewSection.style.display = 'block';

  // Set Overview menu active on load
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
        case 'overview':             overviewSection.style.display = 'block'; break;
        case 'profile':              profileSection.style.display = 'block'; break;
        case 'maintenance-account':  maintenanceAccountSection.style.display = 'block'; break;
        case 'maintenance':          maintenanceSection.style.display = 'block'; break;
        case 'hardware':             hardwareSection.style.display = 'block'; break;   // 🆕 Hardware Monitoring
        case 'hardware-control':     hardwareControlSection.style.display = 'block'; break; // 🆕 Hardware Control
        case 'systemlogs':           systemlogsSection.style.display = 'block'; break;
      }
    });
  });
});