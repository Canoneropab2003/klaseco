document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // ================================
  // DOM REFERENCES
  // ================================
  const editBtn        = document.querySelector(".profile-actions .edit-btn");
  const passwordBtn    = document.querySelector(".profile-actions .password-btn");

  const editModal      = document.getElementById("editProfileModal");
  const passwordModal  = document.getElementById("changePasswordModal");

  const profileNameEl      = document.getElementById("profileName");
  const profileEmailEl     = document.getElementById("profileEmail");
  const profileUsernameEl  = document.getElementById("profileUsername");
  const profileRoleEl      = document.getElementById("profileRole");
  const profileLoginEl     = document.getElementById("profileLogin");

  const profileStatusEl       = document.getElementById("profileStatus");
  const profileAccessLevelEl  = document.getElementById("profileAccessLevel");
  const profileCreatedEl      = document.getElementById("profileCreated");

  const editForm           = document.getElementById("editProfileForm");
  const changePasswordForm = document.getElementById("changePasswordForm");
  const passwordErrorEl    = document.getElementById("passwordError");

  const editAvatarInput    = document.getElementById("editAvatarInput");
  const editAvatarPreview  = document.getElementById("editAvatarPreview");
  const mainAvatar         = document.querySelector(".profile-avatar");

  const nameInput      = document.getElementById("editName");
  const emailInput     = document.getElementById("editEmail");
  const usernameInput  = document.getElementById("editUsername");
  const roleInput      = document.getElementById("editRole");

  const currentPasswordInput = document.getElementById("currentPassword");
  const newPasswordInput      = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  // ================================
  // API
  // ================================
  const API_ME     = "api/profile_me"; 
  const API_UPDATE = "api/profile_update";

  // ================================
  // STATE
  // ================================
  let currentUser = null;
  const DEFAULT_AVATAR = "assets/images/klaseco-logo.png";

  // ================================
  // HELPERS
  // ================================
  
  // ADDED: Toast Notification System from Maintenance Head
  function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) {
      // Fallback to alert if container doesn't exist
      alert(message);
      return;
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "fa-circle-check" : "fa-circle-exclamation";
    
    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-open");
    const anyOpen = document.querySelector(".profile-modal-overlay.is-open");
    if (!anyOpen) document.body.style.overflow = "";
  }

  function closeAllModals() {
    document.querySelectorAll(".profile-modal-overlay.is-open").forEach((m) => closeModal(m));
  }

  function hidePasswordError() {
    if (!passwordErrorEl) return;
    passwordErrorEl.style.display = "none";
    passwordErrorEl.textContent = "";
  }

  function showPasswordError(message) {
    if (!passwordErrorEl) return;
    passwordErrorEl.textContent = message;
    passwordErrorEl.style.display = "block";
  }

  function formatShortDate(isoString) {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  }

  function formatLogin(isoString) {
    if (!isoString) return "No recent login";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "No recent login";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function resolveAvatar(url) {
    if (!url) return DEFAULT_AVATAR;
    if (/^https?:\/\//i.test(url)) return url;
    return url;
  }

  function setAvatar(url) {
    const src = resolveAvatar(url);
    if (mainAvatar) mainAvatar.src = src;
    if (editAvatarPreview) editAvatarPreview.src = src;
  }

  function applyUserToUI(u) {
  if (!u) return;

  if (profileNameEl) profileNameEl.textContent = u.name || "—";
  if (profileEmailEl) profileEmailEl.textContent = u.email || "—";
  if (profileUsernameEl) profileUsernameEl.textContent = u.username || "—";
  if (profileRoleEl) profileRoleEl.textContent = u.role || "—";
  
  // ✅ FIXED: Removed the [cite] text and using correct DB column
  if (profileLoginEl) {
    profileLoginEl.textContent = formatLogin(u.last_login_at);
  }

  if (profileStatusEl) profileStatusEl.textContent = u.status || "—";

  if (profileAccessLevelEl) {
    const r = (u.role || "").toLowerCase();
    profileAccessLevelEl.textContent =
      r === "admin" ? "Full Admin"
      : r === "maint_head" ? "Maintenance Head Access"
      : r === "maint_staff" ? "Maintenance Staff Access"
      : "Maintenance Technician";
  }

  if (profileCreatedEl) profileCreatedEl.textContent = formatShortDate(u.created_at);
  setAvatar(u.avatar_url);
}

  function syncEditFormFromUser(u) {
  if (!u) return;

  if (nameInput)     nameInput.value = u.name || "";
  if (emailInput)    emailInput.value = u.email || "";
  if (usernameInput) usernameInput.value = u.username || "";
  if (roleInput)     roleInput.value = u.role || "";

  // ✅ FIXED: Correctly unlocks all three fields
  if (nameInput)     nameInput.readOnly = false;
  if (emailInput)    emailInput.readOnly = false;
  if (usernameInput) usernameInput.readOnly = false; 

  if (roleInput) {
    roleInput.readOnly = true;
    roleInput.classList.add("field-readonly");
  }

  setAvatar(u.avatar_url);
}

  async function apiGetMe() {
    const baseUrl = window.location.origin;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
    const res = await fetch(`${cleanBase}/${API_ME}`, { 
      credentials: "same-origin",
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || !json.ok) throw new Error(json?.error || "Failed to load profile");
    return json.data;
  }

  async function apiUpdateProfile({ name, email, username, avatarFile }) {
    const fd = new FormData();
    fd.append("name", name);
    fd.append("email", email);
    fd.append("username", username);
    if (avatarFile) fd.append("avatar", avatarFile);

    const baseUrl = window.location.origin;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const res = await fetch(`${cleanBase}/${API_UPDATE}`, { 
      method: "POST", 
      body: fd,
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || !json.ok) throw new Error(json?.error || "Update failed");
    return json.data;
  }

  // ================================
  // INIT: LOAD FROM DB
  // ================================
  (async () => {
    try {
      currentUser = await apiGetMe();
      applyUserToUI(currentUser);
    } catch (e) {
      console.error("Profile load error:", e);
    }
  })();

  hidePasswordError();

  // ================================
  // CLOSE HANDLERS
  // ================================
  document.addEventListener("click", (e) => {
    if (e.target.matches("[data-close-modal]")) {
      const overlay = e.target.closest(".profile-modal-overlay");
      if (overlay) closeModal(overlay);
    }
    if (e.target.classList.contains("profile-modal-overlay")) closeAllModals();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });

  // ================================
  // OPEN EDIT MODAL
  // ================================
  if (editBtn && editModal) {
    editBtn.addEventListener("click", async () => {
      try {
        currentUser = await apiGetMe();
        applyUserToUI(currentUser);
        syncEditFormFromUser(currentUser);
      } catch (e) {
        console.error(e);
      }
      openModal(editModal);
    });
  }

  // ================================
  // OPEN PASSWORD MODAL
  // ================================
  if (passwordBtn && passwordModal) {
    passwordBtn.addEventListener("click", () => {
      if (changePasswordForm) changePasswordForm.reset();
      hidePasswordError();
      openModal(passwordModal);
    });
  }

  // ================================
  // SAVE EDIT PROFILE (DB) - UPDATED WITH HEAD FEEDBACK
  // ================================
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = editForm.querySelector('button[type="submit"]');
      const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Save Changes";

      if (submitBtn) {
        submitBtn.classList.add("btn-loading");
        submitBtn.disabled = true;
      }

      const newName = nameInput?.value.trim() || "";
      const newEmail = emailInput?.value.trim() || "";
      const newUsername = usernameInput?.value.trim() || "";
      const avatarFile = editAvatarInput?.files?.[0] || null;

      try {
        const updated = await apiUpdateProfile({
          name: newName,
          email: newEmail,
          username: newUsername,
          avatarFile,
        });

        currentUser = updated;
        applyUserToUI(currentUser);

        if (editAvatarInput) editAvatarInput.value = "";

        // SUCCESS FEEDBACK FROM HEAD CODE
        if (submitBtn) {
          submitBtn.classList.remove("btn-loading");
          submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
          submitBtn.style.background = "#22c55e"; 
        }

        showToast("Profile updated successfully!");

        const profilePanel = document.querySelector(".profile-panel");
        if (profilePanel) {
          profilePanel.classList.add("save-success-glow");
          setTimeout(() => profilePanel.classList.remove("save-success-glow"), 1500);
        }

        setTimeout(() => {
          closeModal(editModal);
          if (submitBtn) {
            submitBtn.innerHTML = originalBtnHTML;
            submitBtn.style.background = "";
            submitBtn.disabled = false;
          }
        }, 1000);

      } catch (err) {
        console.error("Profile update error:", err);
        showToast(err?.message || "Failed to update profile.", "error");
        if (submitBtn) {
          submitBtn.classList.remove("btn-loading");
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHTML;
        }
      }
    });
  }

  // ================================
  // PASSWORD VALIDATION - UPDATED WITH HEAD FEEDBACK
  // ================================
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
      const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Update Password";

      const currentPassword = document.getElementById("currentPassword")?.value || "";
      const newPassword = newPasswordInput?.value || "";
      const confirmPassword = confirmPasswordInput?.value || "";

      if (typeof hidePasswordError === "function") hidePasswordError();

      if (newPassword.length < 8) {
        return showPasswordError("Password must be at least 8 characters.");
      }
      if (newPassword !== confirmPassword) {
        return showPasswordError("Passwords do not match.");
      }

      if (submitBtn) {
        submitBtn.classList.add("btn-loading");
        submitBtn.disabled = true;
      }

      try {
        const baseUrl = window.location.origin;
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const url = `${cleanBase}/api/profile_password_update`;

        const res = await fetch(url, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest" 
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
          })
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data || !data.ok) {
          throw new Error(data?.error || "Failed to update password.");
        }

        showToast("Password updated successfully!");
        changePasswordForm.reset();

        if (submitBtn) {
          submitBtn.classList.remove("btn-loading");
          submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Updated!';
          submitBtn.style.background = "#22c55e"; 
        }

        setTimeout(() => {
          closeModal(passwordModal);
          if (submitBtn) {
              submitBtn.innerHTML = originalBtnHTML;
              submitBtn.style.background = ""; 
              submitBtn.disabled = false;
          }
        }, 1000);
        
      } catch (err) {
        console.error("Password update error:", err);
        showPasswordError(err.message);
        if (submitBtn) {
          submitBtn.classList.remove("btn-loading");
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHTML;
        }
      }
    });
  }

  // ================================
  // AVATAR PREVIEW
  // ================================
  if (editAvatarInput && editAvatarPreview) {
    editAvatarInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) editAvatarPreview.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ADDED: PASSWORD VISIBILITY TOGGLE FROM HEAD CODE
  const toggleBtns = document.querySelectorAll(".password-toggle");
  toggleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const passwordInput = document.getElementById(targetId);
      const icon = btn.querySelector("i");

      if (passwordInput && passwordInput.type === "password") {
        passwordInput.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
      } else if (passwordInput) {
        passwordInput.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
      }
    });
  });
});