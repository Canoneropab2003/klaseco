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

  // âœ… MOBILE MENU ELEMENTS (ADDED)
  const menuToggle = document.getElementById('menuToggle'); // hamburger button
  const sidebar    = document.getElementById('sidebar');    // your sidebar container
  const overlay    = document.getElementById('overlay');    // dark background overlay

  // âœ… MOBILE MENU TOGGLE FUNCTION (ADDED)
  function toggleMenu() {
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
  }

  // âœ… Attach mobile toggle events (ADDED)
  if (menuToggle) {
    menuToggle.addEventListener('click', toggleMenu);
  }
  if (overlay) {
    overlay.addEventListener('click', toggleMenu); // close when clicking overlay
  }

  // âœ… Use the actual section IDs + .page-section class
  const overviewSection            = document.querySelector('#overview.page-section');
  const attendanceSection          = document.querySelector('#attendance.page-section');
  const teachersaccountsSection    = document.querySelector('#teachersaccounts.page-section');
  const maintenanceaccountsSection = document.querySelector('#maintenanceaccounts.page-section');
  const adminstaffaccountsSection  = document.querySelector('#adminstaffaccounts.page-section');
  const systemlogsSection          = document.querySelector('#systemlogs.page-section');
  const aichatbotSection           = document.querySelector('#aichatbot.page-section');
  const scheduleSection            = document.querySelector('#schedule.page-section');
  const analyticsSection           = document.querySelector('#analytics.page-section');
  const profileSection             = document.querySelector('#profile.page-section');
  const maintenanceSection         = document.querySelector('#maintenance.page-section'); // maintenance (requests)

  const menuButtons = document.querySelectorAll('.menu-item');

    // 🔹 LOGOUT BUTTON → logout.php (kills PHP session via session_boot.php)
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
          
        if (typeof showLoginToast === 'function') {
          showLoginToast("Logging out...");
        }
        // Clear front-end login flags
        sessionStorage.removeItem('fromLogin');
        sessionStorage.removeItem('loginToast');
    
        /* FIX: Use location.replace instead of .href
           This ensures that once they logout, the Dashboard is removed from 
           the history stack. If they hit "Back", they won't see the 
           protected dashboard content again.
        */
        window.location.replace("logout.php"); 
      });
    }

  if (!overviewSection) return;

  function hideAll() {
    if (overviewSection)            overviewSection.style.display = 'none';
    if (attendanceSection)          attendanceSection.style.display = 'none';
    if (teachersaccountsSection)    teachersaccountsSection.style.display = 'none';
    if (maintenanceaccountsSection) maintenanceaccountsSection.style.display = 'none';
    if (adminstaffaccountsSection)  adminstaffaccountsSection.style.display = 'none';
    if (systemlogsSection)          systemlogsSection.style.display = 'none';
    if (aichatbotSection)           aichatbotSection.style.display = 'none';
    if (scheduleSection)            scheduleSection.style.display = 'none';
    if (analyticsSection)           analyticsSection.style.display = 'none';
    if (profileSection)             profileSection.style.display = 'none';
    if (maintenanceSection)         maintenanceSection.style.display = 'none';
  }

  // âœ… Default: show Dashboard (overview)
  hideAll();
  overviewSection.style.display = 'block';

  // âœ… Default: make Dashboard button active
  const defaultBtn = document.querySelector('.menu-item[data-section="overview"]');
  if (defaultBtn) {
    menuButtons.forEach(btn => btn.classList.remove('active'));
    defaultBtn.classList.add('active');
  }

  // âœ… Click handler for sidebar menu
  menuButtons.forEach(button => {
    button.addEventListener('click', () => {
      // active state
      menuButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const section = button.dataset.section;

      hideAll();
      switch (section) {
        case 'overview':            overviewSection.style.display = 'block';            break;
        case 'attendance':          attendanceSection.style.display = 'block';          break;
        case 'teachersaccounts':    teachersaccountsSection.style.display = 'block';    break;
        case 'maintenanceaccounts': maintenanceaccountsSection.style.display = 'block'; break;
        case 'adminstaffaccounts':  adminstaffaccountsSection.style.display = 'block';  break;
        case 'systemlogs':          systemlogsSection.style.display = 'block';          break;
        case 'aichatbot':           aichatbotSection.style.display = 'block';           break;
        case 'schedule':            scheduleSection.style.display = 'block';            break;
        case 'analytics':           analyticsSection.style.display = 'block';           break;
        case 'profile':             profileSection.style.display = 'block';             break;
        case 'maintenance':         maintenanceSection.style.display = 'block';         break;
      }

      // âœ… AUTO-CLOSE SIDEBAR ON MOBILE AFTER CLICK (ADDED)
      if (window.innerWidth <= 768) {
        if (sidebar && sidebar.classList.contains('active')) {
          toggleMenu();
        }
      }
    });
  });
});