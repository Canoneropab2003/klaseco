document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // ================================
  // DOM REFERENCES
  // ================================
  const editBtn            = document.querySelector(".profile-actions .edit-btn");
  const passwordBtn        = document.querySelector(".profile-actions .password-btn");

  const editModal          = document.getElementById("editProfileModal");
  const passwordModal      = document.getElementById("changePasswordModal");

  const profileNameEl      = document.getElementById("profileName");
  const profileEmailEl     = document.getElementById("profileEmail");
  const profileUsernameEl  = document.getElementById("profileUsername");
  const profileRoleEl      = document.getElementById("profileRole");
  const profileLoginEl     = document.getElementById("profileLogin");

  // Quick stats
  const profileStatusEl       = document.getElementById("profileStatus");
  const profileAccessLevelEl  = document.getElementById("profileAccessLevel");
  const profileCreatedEl      = document.getElementById("profileCreated");

  const editForm           = document.getElementById("editProfileForm");
  const changePasswordForm = document.getElementById("changePasswordForm");
  const passwordErrorEl    = document.getElementById("passwordError");

  const editAvatarInput    = document.getElementById("editAvatarInput");
  const editAvatarPreview  = document.getElementById("editAvatarPreview");
  const mainAvatar         = document.querySelector(".profile-avatar");

  // Edit Profile form inputs
  const nameInput           = document.getElementById("editName");
  const emailInput          = document.getElementById("editEmail");
  const usernameInput       = document.getElementById("editUsername");
  const roleInput           = document.getElementById("editRole");

  // Password form inputs
  const currentPasswordInput = document.getElementById("currentPassword");
  const newPasswordInput     = document.getElementById("newPassword");
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
  
  // Toast Notification System
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

    // Auto-remove after 3 seconds
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
    minute: "2-digit" 
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

  function applyUserToProfile(u) {
    if (!u) return;

    if (profileNameEl) profileNameEl.textContent = u.name || "—";
    if (profileEmailEl) profileEmailEl.textContent = u.email || "—";
    if (profileUsernameEl) profileUsernameEl.textContent = u.username || "—";
    if (profileRoleEl) profileRoleEl.textContent = u.role || "—";
    if (profileLoginEl) profileLoginEl.textContent = formatLogin(u.last_login_at);

    if (profileStatusEl) profileStatusEl.textContent = u.account_status || "—";

    if (profileAccessLevelEl) {
      profileAccessLevelEl.textContent = (u.role || "").toLowerCase() === "admin" ? "Full Admin" : "Staff Access";
    }

    if (profileCreatedEl) profileCreatedEl.textContent = formatShortDate(u.created_at);

    setAvatar(u.avatar_url);
  }

  function syncEditFormFromUser(u) {
    if (!u) return;

    if (nameInput) nameInput.value = u.name || "";
    
    // ✅ FIX: Remove readOnly and grayed-out class for Email
    if (emailInput) {
      emailInput.value = u.email || "";
      emailInput.readOnly = false; // Changed from true
      emailInput.removeAttribute("aria-readonly");
      emailInput.classList.remove("field-readonly");
    }
    
    // ✅ FIX: Remove readOnly and grayed-out class for Username
    if (usernameInput) {
      usernameInput.value = u.username || "";
      usernameInput.readOnly = false; // Just in case it was locked
      usernameInput.removeAttribute("aria-readonly");
      usernameInput.classList.remove("field-readonly");
    }
    
    // 🔒 KEEP: Role remains grayed out and uneditable
    if (roleInput) {
      roleInput.value = u.role || "";
      roleInput.readOnly = true;
      roleInput.setAttribute("aria-readonly", "true");
      roleInput.classList.add("field-readonly");
    }

    setAvatar(u.avatar_url);
}

  async function apiGetMe() {
    const res = await fetch(API_ME, { credentials: "same-origin" });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data || !data.ok) {
      throw new Error((data && data.error) ? data.error : "Failed to load profile");
    }
    return data.data;
  }

  // Update this function in profile.js
async function apiUpdateProfile({ name, email, username, avatarFile }) {
  const fd = new FormData();
  fd.append("name", name);
  fd.append("email", email); // ✅ ADD THIS LINE
  fd.append("username", username);
  if (avatarFile) fd.append("avatar", avatarFile);

  const res = await fetch(API_UPDATE, {
    method: "POST",
    body: fd,
    credentials: "same-origin",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.ok) {
    throw new Error((data && data.error) ? data.error : "Update failed");
  }
  return data.data;
}

  // ================================
  // LOAD LOGGED-IN ACCOUNT FROM DB
  // ================================
  (async () => {
    try {
      currentUser = await apiGetMe();
      applyUserToProfile(currentUser);
    } catch (err) {
      console.error("Profile load error:", err);
      if (profileNameEl) profileNameEl.textContent = "—";
      if (profileEmailEl) profileEmailEl.textContent = "—";
      if (profileUsernameEl) profileUsernameEl.textContent = "—";
      if (profileRoleEl) profileRoleEl.textContent = "—";
      setAvatar(null);
    }
  })();

  hidePasswordError();

  // ================================
  // GLOBAL CLOSE HANDLERS
  // ================================
  document.addEventListener("click", (e) => {
    if (e.target.matches("[data-close-modal]")) {
      const overlay = e.target.closest(".profile-modal-overlay");
      if (overlay) closeModal(overlay);
    }
    if (e.target.classList.contains("profile-modal-overlay")) {
      closeAllModals(); // Fixed consistency with Maintenance Head version
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });

  // ================================
  // OPEN EDIT PROFILE MODAL
  // ================================
  if (editBtn && editModal) {
    editBtn.addEventListener("click", () => {
      syncEditFormFromUser(currentUser);
      openModal(editModal);
    });
  }

  // ================================
  // OPEN CHANGE PASSWORD MODAL
  // ================================
  if (passwordBtn && passwordModal) {
    passwordBtn.addEventListener("click", () => {
      if (changePasswordForm) changePasswordForm.reset();
      hidePasswordError();
      openModal(passwordModal);
    });
  }

  // ================================
  // HANDLE EDIT PROFILE SUBMIT (DB SAVE)
  // ================================
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // 1. Capture values from inputs
      const newName = nameInput?.value.trim() || "";
      const newEmail = emailInput?.value.trim() || ""; // ✅ Added email capture
      const newUsername = usernameInput?.value.trim() || "";
      const avatarFile = editAvatarInput?.files?.[0] || null;

      // 2. Client-side validation
      if (newName === "") {
        showToast("Full Name is required.", "error");
        return;
      }
      if (newEmail === "") { // ✅ Added email validation
        showToast("Email address is required.", "error");
        return;
      }

      // 3. UI Loading State
      const submitBtn = editForm.querySelector('button[type="submit"]');
      const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Save Changes";
      
      if (submitBtn) {
        submitBtn.classList.add("btn-loading");
        submitBtn.disabled = true;
      }

      try {
        // 4. Call API with updated parameters
        const updated = await apiUpdateProfile({
          name: newName,
          email: newEmail, // ✅ Now passing the actual email value
          username: newUsername,
          avatarFile
        });

        // 5. Update local state and UI
        currentUser = updated;
        applyUserToProfile(currentUser);

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

        // 6. Close Modal and Reset Button
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
  // HANDLE CHANGE PASSWORD SUBMIT
  // ================================
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
      const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Update Password";
      
      const currentPassword = currentPasswordInput?.value || "";
      const newPassword = newPasswordInput?.value || "";
      const confirmPassword = confirmPasswordInput?.value || "";

      hidePasswordError();

      // Client-side validation
      if (newPassword.length < 8) return showPasswordError("Password must be at least 8 characters.");
      if (newPassword !== confirmPassword) return showPasswordError("Passwords do not match.");
      
      
      // Add loading state to button
      if (submitBtn) {
        submitBtn.classList.add("btn-loading");
        submitBtn.disabled = true;
      }

      try {
      // ✅ FIX: Use absolute clean URL to bypass 301 redirects
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

        const data = await res.json();

        if (!data.ok) {
          throw new Error(data.error || "Failed to update password.");
        }

        showToast("Password updated successfully!");
        changePasswordForm.reset();

        // Show success state on button
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
        console.error("Password error:", err);
        showToast(err.message, "error");
        // Remove loading state on error
        if (submitBtn) {
          submitBtn.classList.remove("btn-loading");
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHTML;
        }
      }
    });
  }

  // ================================
  // AVATAR UPLOAD PREVIEW (instant)
  // ================================
  if (editAvatarInput && editAvatarPreview) {
    editAvatarInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        if (editAvatarPreview && ev.target?.result) {
          editAvatarPreview.src = ev.target.result;
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // ================================
  // PASSWORD VISIBILITY TOGGLE
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

});
