document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // ================================
  // DOM REFERENCES
  // ================================
  const editBtn = document.querySelector(".profile-actions .edit-btn");
  const passwordBtn = document.querySelector(".profile-actions .password-btn");

  const editModal = document.getElementById("editProfileModal");
  const passwordModal = document.getElementById("changePasswordModal");

  const profileNameEl = document.getElementById("profileName");
  const profileEmailEl = document.getElementById("profileEmail");
  const profileUsernameEl = document.getElementById("profileUsername");
  const profileRoleEl = document.getElementById("profileRole");
  const profileLoginEl = document.getElementById("profileLogin");

  const profileStatusEl = document.getElementById("profileStatus");
  const profileAccessLevelEl = document.getElementById("profileAccessLevel");
  const profileCreatedEl = document.getElementById("profileCreated");

  const editForm = document.getElementById("editProfileForm");
  const changePasswordForm = document.getElementById("changePasswordForm");
  const passwordErrorEl = document.getElementById("passwordError");

  const editAvatarInput = document.getElementById("editAvatarInput");
  const editAvatarPreview = document.getElementById("editAvatarPreview");
  const mainAvatar = document.querySelector(".profile-avatar");

  const nameInput = document.getElementById("editName");
  const emailInput = document.getElementById("editEmail");
  const usernameInput = document.getElementById("editUsername");
  const roleInput = document.getElementById("editRole");

  const currentPasswordInput = document.getElementById("currentPassword");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  // ================================
  // API ENDPOINTS
  // ================================
  const API_ME = "./api/profile_me";
  const API_UPDATE = "./api/profile_update";

  // ================================
  // STATE
  // ================================
  let currentUser = null;
  const DEFAULT_AVATAR = "assets/images/klaseco-logo.png";

  // ================================
  // HELPERS
  // ================================
  
  // New Helper: Toast Notifications
  function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

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
    if (!document.querySelector(".profile-modal-overlay.is-open")) {
      document.body.style.overflow = "";
    }
  }

  function closeAllModals() {
    document.querySelectorAll(".profile-modal-overlay.is-open").forEach(closeModal);
  }

  function hidePasswordError() {
    if (!passwordErrorEl) return;
    passwordErrorEl.style.display = "none";
    passwordErrorEl.textContent = "";
  }

  function showPasswordError(msg) {
    if (!passwordErrorEl) return;
    passwordErrorEl.textContent = msg;
    passwordErrorEl.style.display = "block";
  }

  function formatShortDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  }

  function formatLogin(iso) {
    if (!iso) return "No recent login";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "No recent login";
    return d.toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

  function applyUser(u) {
    if (!u) return;

    if (profileNameEl) profileNameEl.textContent = u.name || "—";
    if (profileEmailEl) profileEmailEl.textContent = u.email || "—";
    if (profileUsernameEl) profileUsernameEl.textContent = u.username || "—";
    if (profileRoleEl) profileRoleEl.textContent = u.role || "—";
    if (profileLoginEl) profileLoginEl.textContent = formatLogin(u.last_login_at);

    if (profileStatusEl) profileStatusEl.textContent = u.account_status || "—";
    if (profileAccessLevelEl) {
      profileAccessLevelEl.textContent = (u.role || "").toLowerCase() === "admin" ? "Full Admin" : "Faculty & Records Access";
    }
    if (profileCreatedEl) profileCreatedEl.textContent = formatShortDate(u.created_at);

    setAvatar(u.avatar_url);
  }

  function syncModalFromUser(u) {
    if (!u) return;
    if (nameInput) nameInput.value = u.name || "";
    
    // ✅ Enabled editing for Email
    if (emailInput) {
      emailInput.value = u.email || "";
      emailInput.readOnly = false; // Ensure it is editable
      emailInput.classList.remove("field-readonly");
    }

    // ✅ Enabled editing for Username
    if (usernameInput) {
      usernameInput.value = u.username || "";
      usernameInput.readOnly = false; // Ensure it is editable
      usernameInput.classList.remove("field-readonly");
    }

    // 🔒 Keep Role as Read-Only
    if (roleInput) {
      roleInput.value = u.role || "";
      roleInput.readOnly = true;
      roleInput.classList.add("field-readonly");
    }
    setAvatar(u.avatar_url);
  }
  // ================================
  // API CALLS
  // ================================
  async function apiGetMe() {
    const baseUrl = window.location.origin;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBase}/${API_ME}`;

    const res = await fetch(url, { 
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
    if (email) fd.append("email", email);
    if (username) fd.append("username", username);
    if (avatarFile) fd.append("avatar", avatarFile);

    const res = await fetch(API_UPDATE, { method: "POST", body: fd, credentials: "same-origin" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || !json.ok) throw new Error(json?.error || "Update failed");
    return json.data;
  }

  // ================================
  // INITIAL LOAD
  // ================================
  (async () => {
    try {
      currentUser = await apiGetMe();
      applyUser(currentUser);
    } catch (e) {
      console.error("Profile load error:", e);
    }
  })();

  hidePasswordError();

  // ================================
  // GLOBAL EVENT HANDLERS
  // ================================
  document.addEventListener("click", (e) => {
    if (e.target.matches("[data-close-modal]")) closeModal(e.target.closest(".profile-modal-overlay"));
    if (e.target.classList.contains("profile-modal-overlay")) closeModal(e.target);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });

  if (editBtn && editModal) {
    editBtn.addEventListener("click", () => {
      syncModalFromUser(currentUser);
      openModal(editModal);
    });
  }

  if (passwordBtn && passwordModal) {
    passwordBtn.addEventListener("click", () => {
      if (changePasswordForm) changePasswordForm.reset();
      hidePasswordError();
      openModal(passwordModal);
    });
  }

  // ================================
  // HANDLE EDIT PROFILE (HTML5 COMPLIANT)
  // ================================
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      if (!editForm.checkValidity()) return;

      e.preventDefault();

      const submitBtn = editForm.querySelector('button[type="submit"]');
      const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Save Changes";
      
      if (submitBtn) {
        submitBtn.classList.add("btn-loading");
        submitBtn.disabled = true;
      }

      const newName = nameInput?.value.trim() || "";
      const newEmail = emailInput ? emailInput.value.trim() : "";
      const newUsername = usernameInput ? usernameInput.value.trim() : "";
      const avatarFile = editAvatarInput?.files?.[0] || null;

      try {
        const updated = await apiUpdateProfile({
          name: newName,
          email: newEmail,
          username: newUsername,
          avatarFile
        });

        currentUser = updated;
        applyUser(currentUser);

        if (editAvatarInput) editAvatarInput.value = "";

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
        console.error("Update error:", err);
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
  // PASSWORD SUBMIT (UPGRADED WITH API & TOAST)
  // ================================
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (e) => {
      if (!changePasswordForm.checkValidity()) return;

      e.preventDefault();
      
      const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
      const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Update Password";
      
      const newPassword = newPasswordInput?.value || "";
      const confirmPassword = confirmPasswordInput?.value || "";
      const currentPassword = currentPasswordInput?.value || "";

      hidePasswordError();

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
        
        const res = await fetch(`${cleanBase}/api/profile_password_update`, {
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

        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Failed to update password.");

        showToast("Password updated successfully!");

        if (submitBtn) {
            submitBtn.classList.remove("btn-loading");
            submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Updated!';
            submitBtn.style.background = "#22c55e"; 
        }

        changePasswordForm.reset();

        setTimeout(() => {
          closeModal(passwordModal);
          if (submitBtn) {
              submitBtn.innerHTML = originalBtnHTML;
              submitBtn.style.background = ""; 
              submitBtn.disabled = false;
          }
        }, 1000);

      } catch (err) {
        console.error("Password error:", err);
        showToast(err.message, "error");
        if (submitBtn) {
          submitBtn.classList.remove("btn-loading");
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHTML;
        }
      }
    });
  }

  // ================================
  // PASSWORD VISIBILITY TOGGLE (NEW)
  // ================================
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

  // ================================
  // AVATAR PREVIEW (INSTANT)
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
});