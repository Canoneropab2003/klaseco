<?php
require __DIR__ . '/auth.php';
require_role('maint_staff');
nocache_headers();
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KLASECO | Maintenance Staff</title>

  <link rel="icon" type="image/png" href="assets/images/klaseco-logo.png" />

  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
  <link href="https://fonts.cdnfonts.com/css/lovelo" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700;900&display=swap" rel="stylesheet" />

  <!-- MAIN DASHBOARD CSS (reuse Admin styling) -->
  <link rel="stylesheet" href="assets/css/maintenancestaff/admindb.css" />
  <link rel="stylesheet" href="assets/css/maintenancestaff/maintenancerequest.css" />
  <link rel="stylesheet" href="assets/css/maintenancestaff/SystemLogs.css" />
  <link rel="stylesheet" href="assets/css/maintenancestaff/profile.css" />
  <meta name="maint-staff-id" content="<?= htmlspecialchars((string)($_SESSION['user_id'] ?? $_SESSION['maintenance_user_id'] ?? '')) ?>">
</head>

<body>
  <div id="loading-screen">
    <img src="assets/images/klaseco-logo.png" class="loading-logo" alt="KLASECO loading logo" />
    <p class="loading-text">Loading Maintenance Staff Panel...</p>
  </div>

    <div class="container">
        <div class="sidebar-overlay" id="overlay"></div>
        <aside class="sidebar" id="sidebar" aria-label="Main navigation">
        <div class="brand">
        <img src="assets/images/klaseco-logo.png" alt="KLASECO logo" class="logo" />
        <div class="brand-name">KLASECO</div>
      </div>

      <nav class="menu">
        <button class="menu-item" data-section="overview">
          <i class="fa-solid fa-gauge"></i><span>Dashboard</span>
        </button>

        <button class="menu-item" data-section="maintenance">
          <i class="fa-solid fa-screwdriver-wrench"></i><span>Maintenance Task</span>
        </button>

        <button class="menu-item" data-section="systemlogs">
          <i class="fa-solid fa-list"></i><span>System Logs</span>
        </button>

        <button class="menu-item" data-section="profile">
          <i class="fa-solid fa-user"></i><span>Profile</span>
        </button>
      </nav>

      <button class="logout-btn">
        <i class="fa-solid fa-right-from-bracket"></i><span>LOGOUT</span>
      </button>
    </aside>

    <main class="main">
        <header class="header">
            <div class="header-left">
        <button class="menu-toggle" id="menuToggle" type="button" aria-label="Toggle Navigation Menu">
            <i class="fas fa-bars" aria-hidden="true"></i>
        </button>
            <h1>MAINTENANCE STAFF MONITORING</h1>
        </div>

        <div class="clock-section">
          <div class="notif-wrapper" style="position: relative; display: inline-block;">
          <button class="bell-btn" id="staffNotifBtn" aria-label="Notifications">
            <i class="fa-solid fa-bell"></i>
            <span id="staffNotifBadge" class="badge" style="display: none; position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; padding: 2px 6px; font-size: 10px; border-radius: 50%;">0</span>
          </button>
        
          <div id="staffNotifDropdown" class="notif-dropdown">
            <div class="notif-header">
              <span id="staffNotifTitle">0 New Tasks</span>
              <button id="staffMarkRead" class="btn-link">Clear</button>
            </div>
            <div id="staffNotifList" class="notif-list">
              </div>
          </div>
        </div>

          <div class="clock" aria-live="polite">
            <span class="time">--:--:--</span>
            <span class="date">---</span>
          </div>
        </div>
      </header>

      <section id="overview" class="page-section overview">
        <h2>OVERVIEW</h2>

        <div class="cards">
          <div class="card">
            <div class="card-icon"><i class="fa-solid fa-screwdriver-wrench"></i></div>
            <p>Assigned Tasks</p>
            <strong id="overview-assigned">—</strong>
          </div>

          <div class="card">
            <div class="card-icon"><i class="fa-solid fa-circle-check"></i></div>
            <p>Resolved Today</p>
            <strong id="overview-resolved">—</strong>
          </div>

          <div class="card">
            <div class="card-icon"><i class="fa-solid fa-hourglass-half"></i></div>
            <p>Pending Requests</p>
            <strong id="overview-pending">—</strong>
          </div>
        </div>
      </section>

      <!-- ========= MAINTENANCE REQUESTS (STAFF) ========= -->
      <section id="maintenance" class="page-section">
        <div class="panel maintenance-panel">

          <!-- Header -->
          <div class="panel-head">
            <div>
              <h2><i class="fa-solid fa-screwdriver-wrench"></i> My Maintenance Tasks</h2>
              <p class="t-subtitle">
                These are tasks assigned to you by the Maintenance Head. Update status and add work notes when done.
              </p>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters">
            <div class="field field-grow">
              <label>Search</label>
              <div class="field-input">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input
                  type="text"
                  id="maintenanceSearch"
                  placeholder="Search issue, room, or reporter..."
                />
              </div>
            </div>

            <div class="field">
              <label for="maintenanceFilterStatus">Status</label>
              <select id="maintenanceFilterStatus" name="maintenanceFilterStatus">
                <option value="">All</option>
                <option value="in-progress">In-Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div class="field">
              <label for="maintenanceFilterPriority">Priority</label>
              <select id="maintenanceFilterPriority" name="maintenanceFilterPriority">
                <option value="">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <!-- Table -->
          <div class="m-table-scroll">
            <table class="m-table" id="maintenanceTable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Issue</th>
                  <th>Room</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Reported By</th>
                  <th>Assigned To</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="maintenanceTableBody">
                <!-- Rows loaded dynamically -->
              </tbody>
            </table>
          </div>

        </div>

        <!-- =========================
            MODAL — Edit Task (STAFF)
        ========================= -->
        <div class="modal" id="maintenanceModal" aria-hidden="true">
          <div class="modal-dialog">

            <!-- HEADER -->
            <div class="modal-header">
              <h3 id="maintenanceModalTitle">
                <i class="fa-solid fa-pen-to-square"></i> Update Task
              </h3>
              <button class="modal-close" data-close-maintenance-modal>
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <!-- BODY -->
            <div class="modal-body">
              <form id="maintenanceForm">
                <input type="hidden" id="maintReqId" />

                <div class="form-grid">
                  <!-- Read-only -->
                  <div class="field">
                    <label>Issue Title</label>
                    <input type="text" id="maintIssueTitle" readonly />
                  </div>

                  <div class="field">
                    <label for="maintRoom">Room</label>
                    <select id="maintRoom" disabled>
                      <option value="">Select room</option>
                      <option value="A301">A301</option>
                      <option value="A302">A302</option>
                    </select>
                  </div>

                  <div class="field">
                    <label>Priority</label>
                    <select id="maintPriority" disabled>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <!-- Staff Editable -->
                  <div class="field">
                    <label>Status</label>
                    <select id="maintStatus" required>
                      <option value="pending">Pending</option>
                      <option value="in-progress">In-Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  <div class="field">
                    <label for="maintAssignedTo">Assigned To</label>
                    <select id="maintAssignedTo" disabled>
                      <option value="">Assigned Technician</option>
                    </select>
                  </div>
                </div>

                <div class="field">
                    <label><i class="fa-solid fa-file-contract"></i> Supervisor's Instructions</label>
                    <div id="maintDescriptionDisplay" class="minput" style="background: #0b1f44; color: #a9def9; min-height: 60px; padding: 12px; border-radius: 12px; font-style: italic; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 10px;">
                        </div>
                    <input type="hidden" id="maintDescription" />
                </div>
                
                <div class="field">
                    <label><i class="fa-solid fa-pen-nib"></i> Your Work Notes / Updates</label>
                    <textarea
                        id="maintWorkNotes" 
                        rows="3"
                        class="minput"
                        placeholder="Add what you did to fix the issue..."
                    ></textarea>
                </div>

                <!-- ========= PROOF IMAGE UPLOAD ========= -->
                <div class="field upload-proof-wrapper">
                  <label class="proof-upload-label">
                    Upload Proof of Work (Optional)
                  </label>

                  <!-- Hidden file input -->
                  <input
                    type="file"
                    id="maintProofImage"
                    accept="image/*"
                    class="proof-input-hidden"
                  />

                  <!-- Upload button -->
                  <button
                    type="button"
                    class="btn dark proof-upload-btn"
                    id="btnUploadProof">
                    <i class="fa-solid fa-image"></i>
                    <span>Upload Image</span>
                  </button>

                  <!-- Preview container -->
                  <div id="proofPreview">
                    <img id="proofImageDisplay" alt="Proof of work preview" />
                    <label class="proof-preview-label">Proof of Work Preview</label>
                    <button type="button" class="btn ghost" id="btnRemoveProof">
                      <i class="fa-solid fa-trash-can"></i>
                      <span>Remove Image</span>
                    </button>
                  </div>
                </div>
                <!-- ========= END PROOF IMAGE UPLOAD ========= -->

              </form>
            </div>

            <!-- FOOTER -->
            <div class="modal-footer">
              <button class="btn ghost" data-close-maintenance-modal>Cancel</button>
              <button class="btn primary" id="btnSaveMaintRequest">
                <i class="fa-solid fa-floppy-disk"></i>
                <span>Save Update</span>
              </button>
            </div>

          </div>
        </div>
      </section>

      <section id="systemlogs" class="page-section">
        <div class="logs-panel">
          <div class="logs-head">
            <h2><i class="fa-solid fa-file-lines"></i> System Logs</h2>
            <button class="lbtn lbtn-clear" type="button">
              <i class="fa-solid fa-trash-can"></i> Clear Logs
            </button>
          </div>

          <p class="logs-subtext">Recent activities across Teachers &amp; Maintenance (Maintenance Head view)</p>

          <div class="logs-table-wrap">
            <table class="logs-table">
              <thead>
                <tr>
                  <th class="col-role">Role</th>
                  <th class="col-event">Event</th>
                  <th class="col-detail">Detail</th>
                </tr>
              </thead>

              <tbody>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ========= PROFILE SECTION - MAINTENANCE HEAD ========= -->
      <section id="profile" class="page-section">
        <div class="profile-panel">

          <!-- Profile Header -->
          <div class="profile-header">
            <img src="assets/images/klaseco-logo.png" class="profile-avatar" alt="Maintenance Head Photo">
            <div>
              <h2 class="profile-name" id="profileName">Maintenance Staff</h2>
              <p class="profile-role" id="profileRole">Maintenance Staff</p>
            </div>
          </div>

          <!-- Quick Stats -->
          <div class="profile-quick-stats">
            <div class="stat-chip">
              <i class="fa-solid fa-circle-user"></i>
              <span class="stat-label">Account Status</span>
              <span class="stat-value" id="profileStatus">Active</span>
            </div>

            <div class="stat-chip">
              <i class="fa-solid fa-id-badge"></i>
              <span class="stat-label">Access Level</span>
              <span class="stat-value" id="profileAccessLevel">Head Level Access</span>
            </div>

            <div class="stat-chip">
              <i class="fa-solid fa-calendar-day"></i>
              <span class="stat-label">Joined</span>
              <span class="stat-value" id="profileCreated">Loading...</span>
            </div>
          </div>

          <!-- Account Information -->
          <div class="profile-info">
            <h3>Account Information</h3>
            <div class="info-grid">

              <div class="info-item">
                <label>Username:</label>
                <span id="profileUsername"></span>
              </div>

              <div class="info-item">
                <label>Email:</label>
                <span id="profileEmail"></span>
              </div>

              <div class="info-item">
                <label>Last Login:</label>
                <span id="profileLogin">No recent login</span>
              </div>

            </div>
          </div>

          <!-- Actions -->
          <div class="profile-actions">
            <button class="edit-btn" type="button">
              <i class="fa-solid fa-pen"></i> Edit Profile
            </button>
            <button class="password-btn" type="button">
              <i class="fa-solid fa-lock"></i> Change Password
            </button>
          </div>

        </div>
      </section>

      <!-- =========  EDIT PROFILE MODAL ========= -->
      <div id="editProfileModal" class="profile-modal-overlay" aria-hidden="true">
        <div class="profile-modal" role="dialog" aria-modal="true" aria-labelledby="editProfileTitle">

          <div class="modal-header">
            <h3 id="editProfileTitle"><i class="fa-solid fa-pen"></i> Edit Profile</h3>
            <button class="modal-close" type="button" data-close-modal>&times;</button>
          </div>

          <form id="editProfileForm" class="modal-body">

            <div class="profile-photo-upload">
              <div class="photo-preview">
                <img id="editAvatarPreview" src="assets/images/klaseco-logo.png" alt="KLASECO Default Avatar">
                <label for="editAvatarInput" class="photo-upload-btn">
                  <i class="fa-solid fa-pen"></i>
                </label>
                <input type="file" id="editAvatarInput" accept="image/*" hidden>
              </div>
              <small>Click the pencil to upload a new profile photo</small>
            </div>

            <div class="modal-grid">
              <div class="modal-field">
                <label for="editName">Full Name</label>
                <input type="text" id="editName" name="name" placeholder="Enter full name" required>
              </div>

              <div class="modal-field">
                <label for="editEmail">Email</label>
                <input type="email" id="editEmail" name="email" placeholder="Enter email" readonly required>
              </div>

              <div class="modal-field">
                <label for="editUsername">Username</label>
                <input type="text" id="editUsername" name="username" readonly required>
      
              </div>

              <div class="modal-field">
                <label for="editRole">Role</label>
                <input type="text" id="editRole" name="role" value="Maintenance Staff" readonly>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-outline" data-close-modal>Cancel</button>
              <button type="submit" class="btn-primary">Save Changes</button>
            </div>

          </form>

        </div>
      </div>

      <!-- =========    CHANGE PASSWORD MODAL ========= -->
        <div id="changePasswordModal" class="profile-modal-overlay" aria-hidden="true">
            <div class="profile-modal" role="dialog" aria-modal="true" aria-labelledby="changePasswordTitle">

            <div class="modal-header">
                <h3 id="changePasswordTitle"><i class="fa-solid fa-lock"></i> Change Password</h3>
                <button class="modal-close" type="button" data-close-modal>&times;</button>
            </div>

            <form id="changePasswordForm" class="modal-body">
            
                <div class="modal-field">
                    <label for="currentPassword">Current Password</label>
                    <div class="password-input-wrapper">
                        <input type="password" id="currentPassword" name="current_password" required>
                        <button type="button" class="password-toggle" data-target="currentPassword">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>
                </div>
            
                <div class="modal-field">
                    <label for="newPassword">New Password</label>
                    <div class="password-input-wrapper">
                        <input type="password" id="newPassword" name="new_password" required>
                        <button type="button" class="password-toggle" data-target="newPassword">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>
                    <small class="field-hint">At least 8 characters with letters & numbers.</small>
                </div>
            
                <div class="modal-field">
                    <label for="confirmPassword">Confirm New Password</label>
                    <div class="password-input-wrapper">
                        <input type="password" id="confirmPassword" name="confirm_password" required>
                        <button type="button" class="password-toggle" data-target="confirmPassword">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>
                    <small class="field-error" id="passwordError">Passwords do not match.</small>
                </div>
            
                <div class="modal-actions">
                    <button type="button" class="btn-outline" data-close-modal>Cancel</button>
                    <button type="submit" class="btn-primary">Update Password</button>
                </div>
            
            </form>

            </div>
        </div>
    <div id="toastContainer" class="toast-container"></div>
      <div id="login-toast" class="login-toast"></div>
    </main>
  </div>

      <!-- =========================
      CONFIRM RESOLVE POPUP
    ========================= -->
    <div class="maint-resolve-overlay" id="resolveConfirmOverlay" aria-hidden="true">
      <div class="maint-resolve-dialog" role="dialog" aria-modal="true">
        <div class="maint-resolve-icon"><i class="fa-solid fa-exclamation"></i></div>

        <div class="maint-resolve-title">Mark this task as RESOLVED?</div>

        <div class="maint-resolve-main">
          Issue: <strong id="resolveIssueText">—</strong><br/>
          Room: <strong id="resolveRoomText">—</strong>
        </div>

        <div class="maint-resolve-sub">
          Once this task is marked as RESOLVED, it will be locked for Maintenance Staff and can no longer be edited.
          You can still view it in the list and in this window for reference.
        </div>

        <div class="maint-resolve-actions">
          <button type="button" class="btn resolve-confirm-yes" id="btnResolveYes">
            <i class="fa-solid fa-check"></i>
            <span>Yes, Resolve</span>
          </button>
          <button type="button" class="btn resolve-confirm-no" id="btnResolveNo">
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>


  <script src="assets/js/core/klaseco-refresh-bus.js"></script>

  <script src="assets/js/maintenancestaff/mainfunctions.js"></script>
  <script src="assets/js/maintenancestaff/maintenancerequest.js"></script>
  <script src="assets/js/maintenancestaff/systemlogs.js"></script>
  <script src="assets/js/maintenancestaff/profile.js"></script>
</body>
</html>
