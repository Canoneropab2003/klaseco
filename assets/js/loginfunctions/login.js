document.addEventListener('DOMContentLoaded', () => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => r.querySelectorAll(s);

  const form       = $('.form');
  const roleRadios = $$('input[name="role"]');

  const emailWrap  = $('.field-email');
  const userWrap   = $('.field-username');
  const emailInput = emailWrap?.querySelector('input') || null;
  const userInput  = userWrap?.querySelector('input') || null;
  const passInput  = $('input[type="password"]');

  const welcomeEl  = $('.welcome');
  const submitBtn  = $('.submit');
  const backBtn    = $('.back-btn');
  const loginCard  = $('.login-card');
  const toast      = $('#toast');

  /* ======================================================
     🔔 TOAST
  ====================================================== */
  function showToast(msg, tone = 'info', ms = 2200) {
    if (!toast) return;
    toast.textContent = msg;

    const map = {
      info:  ['#0b223a', '#163a60'],
      ok:    ['#11361c', '#2e7d32'],
      error: ['#351213', '#8b1d1d'],
      warn:  ['#3a2b0b', '#b58900'],
    };
    const [bg, bd] = map[tone] || map.info;
    toast.style.background = bg;
    toast.style.borderColor = bd;
    toast.hidden = false;

    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toast.hidden = true; }, ms);
  }

  /* ======================================================
     📊 PROGRESS BAR (optional – attaches to login card)
  ====================================================== */
  function ensureProgressBar() {
    if (!loginCard) return null;
    let bar = $('.progress-bar', loginCard);
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'progress-bar';
      loginCard.prepend(bar);
    }
    return bar;
  }

  /* ======================================================
     🔙 BACK BUTTON
  ====================================================== */
  backBtn?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  /* ======================================================
     🧹 CLEAR FIELD BUTTONS
  ====================================================== */
  $$('.field-action[aria-label="clear"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.field')?.querySelector('input');
      if (input) {
        input.value = '';
        input.focus();
      }
    });
  });

  /* ======================================================
     👁 PASSWORD TOGGLE
  ====================================================== */
  $$('.field-action[aria-label="toggle password"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.field')?.querySelector('input');
      const icon  = btn.querySelector('i');
      if (!input) return;

      input.type = input.type === 'password' ? 'text' : 'password';
      icon?.classList.toggle('fa-eye');
      icon?.classList.toggle('fa-eye-slash');
      input.focus();
    });
  });

  /* ======================================================
     ❗ FORGOT PASSWORD MODAL
  ====================================================== */
  const forgotLink  = $('#forgot-link');
  const modal       = $('#forgot-modal');
  const closeBtn    = $('#close-forgot');
  const sendBtn     = $('#send-reset');
  const emailReset  = $('#reset-email');

  function openModal() {
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => emailReset?.focus(), 60);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (emailReset) emailReset.value = "";
    document.documentElement.style.overflow = '';
  }

  if (forgotLink && modal) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });

    closeBtn?.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    // Replace the old sendBtn.addEventListener logic in login.js
sendBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  const email = emailReset.value.trim();

  // 1. Log the attempt
  console.log("%c[DEBUG] Attempting password reset for:", "color: blue; font-weight: bold;", email);

  sendBtn.classList.add('is-loading');
  sendBtn.disabled = true;

  try {
    const res = await fetch('api/forgot_password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });

    // 2. Log the HTTP Status
    console.log("[DEBUG] Response Status:", res.status);

    const text = await res.text();
    console.log("[DEBUG] Raw Server Response:", text); // 🔑 This shows PHP errors!

    const data = JSON.parse(text);

    if (data.ok) {
      showModalToast(`Success! ${data.msg}`, 'success');
      setTimeout(closeModal, 3000);
    } else {
      showModalToast(`⚠️ ${data.msg}`, 'error');
    }
  } catch (err) {
    // 3. Log the exact Error object
    console.error("[DEBUG] Catch Block Triggered:", err);
    showModalToast("⚠️ Network error. Check console (F12).", "error");
  } finally {
    sendBtn.classList.remove('is-loading');
    sendBtn.disabled = false;
  }
});
  }

  function showModalToast(text, type) {
    const oldToast = modal.querySelector('.forgot-toast');
    if (oldToast) oldToast.remove();

    const toastEl = document.createElement('div');
    toastEl.className = `forgot-toast ${type}`;
    toastEl.innerHTML = text;
    modal.querySelector('.forgot-content').appendChild(toastEl);

    requestAnimationFrame(() => toastEl.classList.add('visible'));

    setTimeout(() => toastEl.classList.remove('visible'), 1800);
    setTimeout(() => toastEl.remove(), 2200);
  }

  /* ======================================================
     🧑‍💼 ROLE LOGIC (ADMIN / MAINT)
  ====================================================== */
  function setActiveRole(role) {
    const isAdmin = role === "admin";

    if (emailWrap) emailWrap.style.display = isAdmin ? "flex" : "none";
    if (userWrap)  userWrap.style.display  = isAdmin ? "none" : "flex";

    if (emailInput) {
      emailInput.required = isAdmin;
      emailInput.disabled = !isAdmin;
      if (!isAdmin) emailInput.value = "";
    }

    if (userInput) {
      userInput.required = !isAdmin;
      userInput.disabled = isAdmin;
      if (isAdmin) userInput.value = "";
    }

    if (passInput) {
      passInput.required = true;
    }

    if (welcomeEl) {
      welcomeEl.textContent = isAdmin
        ? "WELCOME BACK ADMINISTRATOR"
        : "WELCOME BACK MAINTENANCE";
    }
  }

  // ✅ Auto-select role from URL param (e.g. ?role=maintenance or ?role=admin)
  const urlRole = new URLSearchParams(window.location.search).get("role")?.toLowerCase().trim();

  if (urlRole === "maintenance") {
    // Check the maintenance radio
    const maintRadio = document.querySelector('input[name="role"][value="maintenance"]');
    if (maintRadio) maintRadio.checked = true;
    // Hide Administrator and Teacher tabs
    const adminLabel   = document.querySelector('label[for="role-admin"]');
    const teacherLabel = document.querySelector('label[for="role-teacher"]');
    if (adminLabel)   adminLabel.style.display   = "none";
    if (teacherLabel) teacherLabel.style.display = "none";
    setActiveRole("maintenance");
  } else if (urlRole === "admin") {
    // Admin is already checked by default, just hide Maintenance and Teacher tabs
    const maintLabel   = document.querySelector('label[for="role-maint"]');
    const teacherLabel = document.querySelector('label[for="role-teacher"]');
    if (maintLabel)   maintLabel.style.display   = "none";
    if (teacherLabel) teacherLabel.style.display = "none";
    setActiveRole("admin");
  } else {
    const initialRole = $('input[name="role"]:checked')?.value || "admin";
    setActiveRole(initialRole);
  }

  roleRadios.forEach(r => {
    r.addEventListener('change', () => setActiveRole(r.value));
  });

  /* ======================================================
     🧩 HELPERS
  ====================================================== */
  function getCSRF() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta?.getAttribute('content') || null;
  }

  function disableForm(form, on) {
    form.setAttribute('aria-busy', on ? 'true' : 'false');
    $$('input, button, a, select, textarea, .toggle-pass, .clear-input', form)
      .forEach(el => {
        if ('disabled' in el) el.disabled = !!on;
        el.setAttribute('aria-disabled', on ? 'true' : 'false');
      });
  }

  function startSubmitting(button, loginWrapper) {
    ensureProgressBar();
    if (loginWrapper) loginWrapper.classList.add('is-submitting');
    if (button) button.classList.add('is-loading'); // match your CSS
  }

  function finishSubmitting(button, loginWrapper) {
    if (loginWrapper) {
      loginWrapper.classList.remove('is-submitting');
      loginWrapper.classList.add('is-success');
    }
    if (button) {
      button.classList.remove('is-loading');
      button.classList.add('is-success');
    }
  }

  function resetSubmitting(button, loginWrapper) {
    if (loginWrapper) {
      loginWrapper.classList.remove('is-submitting', 'is-success');
    }
    if (button) {
      button.classList.remove('is-loading', 'is-success');
    }
  }

  /* ======================================================
     🚀 AJAX SUBMIT
  ====================================================== */
  async function handleSubmit(form, role) {
    if (!form) return;
    const loginWrap = loginCard || document.body;
    const btn = $('.submit', form);

    // Client-side required check
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    startSubmitting(btn, loginWrap);

    // capture values BEFORE disabling
    const capturedFormData = new FormData(form);
    capturedFormData.append('role', role);

    disableForm(form, true);

    /* ======================================================
       🔧 FIX: Use absolute URL to prevent 301 Redirects
    ====================================================== */
    const baseUrl = window.location.origin; 
    
    // Ensure we don't have double slashes if origin ends with one
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // Remove the .php extension so .htaccess doesn't redirect the request
const action = role === 'maintenance'
  ? `${cleanBase}/maintenance_login`
  : `${cleanBase}/admin_login`;

    const method = 'POST';
    const headers = {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest' // 🔑 tells PHP this is AJAX
    };
    const csrf = getCSRF();
    if (csrf) headers['X-CSRF-Token'] = csrf;

    const body = new URLSearchParams(capturedFormData);
    headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';

    let data = null;
    let isJson = false;
    let status = 0;

    try {
const res = await fetch(action, {
  method,
  headers,
  body,
  credentials: 'same-origin'
});

status = res.status;
const text = await res.text();

console.log('[LOGIN DEBUG] status =', status);
console.log('[LOGIN DEBUG] raw response =', text);

try {
  data = JSON.parse(text);
  isJson = true;
} catch {
  isJson = false;
  console.log('[LOGIN DEBUG] JSON parse failed');
}

    } catch (err) {
      resetSubmitting(btn, loginWrap);
      disableForm(form, false);
      showToast('Network error. Please try again.', 'error');

      (role === 'admin' ? emailInput : userInput)?.focus();
      return;
    }

    const isSuccess = isJson && data && data.ok === true;

    if (isSuccess) {
      finishSubmitting(btn, loginWrap);
      showToast(data?.message || 'Login successful.', 'ok');

      sessionStorage.setItem("fromLogin", "yes");
      if (role === 'admin') {
        sessionStorage.setItem("loginToast", data?.toast || "Welcome Back Admin!");
      } else {
        sessionStorage.setItem("loginToast", data?.toast || "Welcome Back Maintenance!");
      }

      const defaultRedirect = role === 'admin'
        ? 'admindb.php'
        : 'maintenancedb.php';

      const to = data?.redirect || defaultRedirect;

      setTimeout(() => { window.location.assign(to); }, 500);
    } else {
      let msg = 'Invalid credentials. Please try again.';

      if (isJson && (data?.message || data?.error)) {
        msg = data.message || data.error;
      }

      if (!isJson && (status === 401 || status === 403)) {
        msg = 'Incorrect email or password.';
      }
      if (!isJson && status >= 500) {
        msg = 'Server error. Please try again.';
      }

      resetSubmitting(btn, loginWrap);
      disableForm(form, false);
      showToast(msg, 'error');

      // focus main identifier depending on role
      if (role === 'admin' && emailInput) {
        emailInput.focus();
      } else if (role === 'maintenance' && userInput) {
        userInput.focus();
      } else {
        form.querySelector('input[required]')?.focus();
      }
    }
  }

  /* ======================================================
     🧷 BIND FORM
  ====================================================== */
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const role = $('input[name="role"]:checked')?.value || 'admin';
      handleSubmit(form, role);
    }, { capture: true });
  }
});