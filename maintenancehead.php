<?php
require __DIR__ . '/auth.php';
require_role('maint_head');
nocache_headers();
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KLASECO | Facilities Supervisor</title>

  <link rel="icon" type="image/png" href="assets/images/klaseco-logo.png" />

  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
  <link href="https://fonts.cdnfonts.com/css/lovelo" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700;900&display=swap" rel="stylesheet" />

  <!-- MAIN DASHBOARD CSS (reuse Admin styling) -->
  <link rel="stylesheet" href="assets/css/maintenancehead/admindb.css" />
  <link rel="stylesheet" href="assets/css/maintenancehead/maintenanceaccount.css" />
  <link rel="stylesheet" href="assets/css/maintenancehead/maintenance.css" />
  <link rel="stylesheet" href="assets/css/maintenancehead/hardware.css" />
  <link rel="stylesheet" href="assets/css/maintenancehead/hardwarecontrol.css" />
  <link rel="stylesheet" href="assets/css/maintenancehead/SystemLogs.css" />
  <link rel="stylesheet" href="assets/css/maintenancehead/profile.css" />
</head>

<script>
  window.INACTIVITY_TIMEOUT_MINUTES = 15; // ← edit this value to change idle timeout
</script>

<body>
  <div id="loading-screen">
    <img src="assets/images/klaseco-logo.png" class="loading-logo" alt="KLASECO loading logo" />
    <p class="loading-text">Loading Maintenance Panel...</p>
  </div>

  <div class="container">
    <aside class="sidebar" aria-label="Main navigation">
      <div class="brand">
        <img src="assets/images/klaseco-logo.png" alt="KLASECO logo" class="logo" />
        <div class="brand-name">KLASECO</div>
      </div>

      <nav class="menu">
        <button class="menu-item" data-section="overview">
          <i class="fa-solid fa-gauge"></i><span>Dashboard</span>
        </button>

        <button class="menu-item" data-section="maintenance-account">
          <i class="fa-solid fa-user-gear"></i><span>Maintenance Staff</span>
        </button>

        <button class="menu-item" data-section="maintenance">
          <i class="fa-solid fa-screwdriver-wrench"></i><span>Maintenance Task</span>
        </button>

        <button class="menu-item" data-section="hardware">
          <i class="fa-solid fa-microchip"></i><span>Hardware</span>
        </button>

        <button class="menu-item" data-section="hardware-control">
          <i class="fa-solid fa-toggle-on"></i><span>Hardware Control</span>
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
          <button class="menu-toggle">
            <i class="fa-solid fa-bars"></i>
          </button>
          <h1>Facilities Supervisor</h1>
        </div>
        
        <div class="clock-section">
          <div class="notif-wrapper" style="position: relative; display: inline-block;">
  <button class="bell-btn" id="notificationBtn" aria-label="Notifications">
    <i class="fa-solid fa-bell"></i>
    <span id="notifBadge" class="badge" style="display: none; position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; padding: 2px 6px; font-size: 10px; border-radius: 50%;">0</span>
  </button>

  <div id="notifDropdown" class="notif-dropdown">
    <div class="notif-header">
      <span id="notifCountTitle">0 New Notifications</span>
      <button id="markAllRead" class="btn-link">Set all as read</button>
    </div>
    <div id="notifList" class="notif-list">
      </div>
    <div class="notif-footer">
      <button class="btn-see-all">See all notifications</button>
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
            <div class="card-meta">
              <p>Active Maintenance</p>
              <strong id="overview-schedule-count">—</strong>
            </div>
          </div>

          <div class="card">
            <div class="card-icon"><i class="fa-solid fa-circle-check"></i></div>
            <div class="card-meta">
              <p>Resolved Requests</p>
              <strong id="overview-maint-resolved-today">—</strong>
            </div>
          </div>

          <div class="card">
            <div class="card-icon"><i class="fa-solid fa-hourglass-half"></i></div>
            <div class="card-meta">
              <p>Pending Requests</p>
              <strong id="overview-maint-pending">—</strong>
            </div>
          </div>
        </div>
      </section>

          <!-- =========================
          🧰 MAINTENANCE REQUESTS SECTION
          ========================= -->
      <section id="maintenance" class="page-section">
        <div class="panel maintenance-panel">

          <!-- Header -->
          <div class="panel-head">
            <h2><i class="fa-solid fa-screwdriver-wrench"></i> Maintenance Requests</h2>
            <button class="btn primary" id="btnOpenMaintModal">
              <i class="fa-solid fa-plus"></i>
              <span>New Request</span>
            </button>
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
                  placeholder="Search issue, room, reporter..."
                />
              </div>
            </div>

          <div class="field">
            <label for="maintenanceFilterStatus">Status</label>
            <select id="maintenanceFilterStatus" name="maintenanceFilterStatus">
              <option value="">All</option>
              <option value="pending">Pending</option>
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
                <!-- Rows will be loaded via JS -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- =========================
            MODAL — Create/Edit Request
          ========================= -->
        <div class="modal" id="maintenanceModal" aria-hidden="true">
          <div class="modal-dialog">
            <div class="modal-header">
              <h3 id="maintenanceModalTitle">New Maintenance Request</h3>
              <button class="modal-close" data-close-maintenance-modal>
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div class="modal-body">
              <form id="maintenanceForm">
                <input type="hidden" id="maintReqId" />

                <div class="form-grid">
                  <div class="field">
                    <label>Issue Title</label>
                    <input type="text" id="maintIssueTitle" required />
                </div>

                <div class="field">
                  <label for="maintRoom">Room</label>
                  <select id="maintRoom" required></select>
                </div>

                  <div class="field">
                    <label>Priority</label>
                    <select id="maintPriority" required>
                      <option value="low">Low</option>
                      <option value="medium" selected>Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div class="field">
                    <label>Status</label>
                    <select id="maintStatus" required>
                      <option value="pending" selected>Pending</option>
                      <option value="in-progress">In-Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                <div class="field">
                  <label for="maintAssignedTo">
                    Assigned To
                    <span id="assignLockHint"
                          class="assign-lock-hint"
                          style="display:none;">
                      (Maintenance Head only)
                    </span>
                  </label>

                  <select id="maintAssignedTo" required>
                    <option value="">Select Technician</option>
                  </select>
                </div>

                </div>

                <div class="field">
                  <label>Description</label>
                  <textarea id="maintDescription" rows="3"></textarea>
                </div>
              </form>
            </div>

            <div class="modal-footer">
              <button class="btn ghost" data-close-maintenance-modal>Cancel</button>
              <button class="btn primary" id="btnSaveMaintRequest">
                <i class="fa-solid fa-floppy-disk"></i>
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>

      <!-- ======================= -->
      <!-- ❗ Delete Confirmation Modal -->
      <!-- ======================= -->
      <div id="maintConfirmDeleteModal" class="confirm-delete-overlay">
        <div class="confirm-delete-box">
          <div class="confirm-delete-icon">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>

          <h3>Delete this request?</h3>
          <p id="maintConfirmDetails"></p>

          <div class="confirm-delete-actions">
            <button id="btnConfirmDeleteMaint" class="btn btn-danger">
              <i class="fa-solid fa-trash"></i> Delete
            </button>
            <button id="btnCancelDeleteMaint" class="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
      </section>

        <section id="maintenance-account" class="page-section">
          <div class="maintenance-panel">
            <div class="maintenance-head">
              <h2>
                <i class="fa-solid fa-user-gear"></i>
                Maintenance Staff Accounts
              </h2>
              <p class="t-subtitle">
                This list shows all maintenance staff accounts created in the Maintenance Head panel.
              </p>
            </div>

            <div class="t-table-wrap">
              <table class="t-table t-table-compact">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Staff Name</th>
                    <th>Staff ID</th> 
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="teacherAccountNamesBody">
                  <!-- Rows will be injected here via JS -->
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="hardware" class="page-section">
        <div class="panel">

          <!-- Header -->
          <div class="panel-head">
            <h2><i class="fa-solid fa-microchip"></i> Hardware Monitoring</h2>
          </div>

          <!-- KPIs -->
          <div class="hardware-kpis">
            <div class="kpi-card">
              <span class="kpi-title"><i class="fa-solid fa-server"></i> Online Devices</span>
              <span class="kpi-value" id="hardwareOnlineCount">0</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-title"><i class="fa-solid fa-plug-circle-exclamation"></i> Offline Devices</span>
              <span class="kpi-value" id="hardwareOfflineCount">0</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-title"><i class="fa-solid fa-triangle-exclamation"></i> Errors</span>
              <span class="kpi-value" id="hardwareErrorCount">0</span>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters">
            <div class="field field-grow">
              <label>Search</label>
              <div class="field-input">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="hardwareSearch" placeholder="Search by device, room, or type..."/>
              </div>
            </div>

          <div class="field">
            <label for="hardwareFilterStatus">Status</label>
            <select id="hardwareFilterStatus" name="hardwareFilterStatus">
              <option value="">All</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div class="field">
            <label for="hardwareFilterRoom">Room</label>
            <select id="hardwareFilterRoom" name="hardwareFilterRoom">
              <option value="">All</option>
              <option value="A301">A303</option>
              <option value="A302">A304</option>
            </select>
          </div>
          </div>

          <!-- Device Table -->
          <div class="m-table-scroll">
            <table class="m-table" id="hardwareTable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Device</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Room</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody id="hardwareTableBody">
                <!-- rows will be added via JS -->
              </tbody>
            </table>
          </div>

        </div>
      </section>

      <section id="hardware-control" class="page-section">
        <div class="panel hardware-control-panel">

          <div class="panel-head">
            <h2><i class="fa-solid fa-sliders"></i> Hardware Control</h2>
            <p class="t-subtitle">Control devices per classroom in real-time</p>
          </div>

        <div class="room-tabs">
          <button class="room-tab active" data-room="A303">Room A303</button>
          <button class="room-tab" data-room="A304">Room A304</button>
        </div>
        
        <div class="room-control-area">
        
          <div class="room-controls" data-room="A303">
        
            <div class="room-automation-bar" data-room="A303">
              <div class="automation-left">
                <i class="fa-solid fa-robot"></i>
                <div class="automation-meta">
                  <p class="automation-title">Room Automation</p>
                  <p class="automation-sub">When ON, manual controls are locked.</p>
                </div>
              </div>
        
              <div class="automation-right">
                <button class="btn toggle-automation" data-room="A303" data-state="off">
                  <i class="fa-solid fa-power-off"></i>
                  <span>Turn Automation On</span>
                </button>
                <span id="auto-status-A303" class="auto-status status-off">OFF</span>
              </div>
            </div>
        
            <div class="device-grid">
              <div class="control-card" data-device="A303_FAN_1">
                <i class="fa-solid fa-fan control-icon"></i>
                <p class="control-name">Wall Fan 1</p>
                <button class="btn toggle-device" data-device="A303_FAN_1" data-room="A303" data-state="off">
                  <i class="fa-solid fa-power-off"></i>
                  <span>Turn On</span>
                </button>
                <span id="status-A303_FAN_1" class="device-status">OFF</span>
              </div>
        
              <div class="control-card" data-device="A303_FAN_2">
                <i class="fa-solid fa-fan control-icon"></i>
                <p class="control-name">Wall Fan 2</p>
                <button class="btn toggle-device" data-device="A303_FAN_2" data-room="A303" data-state="off">
                  <i class="fa-solid fa-power-off"></i>
                  <span>Turn On</span>
                </button>
                <span id="status-A303_FAN_2" class="device-status">OFF</span>
              </div>
        
              <div class="control-card" data-device="A303_LIGHT_1">
                <i class="fa-solid fa-lightbulb control-icon"></i>
                <p class="control-name">Main Light 1</p>
                <button class="btn toggle-device" data-device="A303_LIGHT_1" data-room="A303" data-state="off">
                  <i class="fa-solid fa-power-off"></i>
                  <span>Turn On</span>
                </button>
                <span id="status-A303_LIGHT_1" class="device-status">OFF</span>
              </div>
        
              <div class="control-card" data-device="A303_LIGHT_2">
                <i class="fa-solid fa-lightbulb control-icon"></i>
                <p class="control-name">Main Light 2</p>
                <button class="btn toggle-device" data-device="A303_LIGHT_2" data-room="A303" data-state="off">
                  <i class="fa-solid fa-power-off"></i>
                  <span>Turn On</span>
                </button>
                <span id="status-A303_LIGHT_2" class="device-status">OFF</span>
              </div>
            </div>
          </div>
        
          <div class="room-controls hidden" data-room="A304">
        
            <div class="room-automation-bar" data-room="A304">
              <div class="automation-left">
                <i class="fa-solid fa-robot"></i>
                <div class="automation-meta">
                  <p class="automation-title">Room Automation</p>
                  <p class="automation-sub">When ON, manual controls are locked.</p>
                </div>
              </div>
        
              <div class="automation-right">
                <button class="btn toggle-automation" data-room="A304" data-state="off">
                  <i class="fa-solid fa-power-off"></i>
                  <span>Turn Automation On</span>
                </button>
                <span id="auto-status-A304" class="auto-status status-off">OFF</span>
              </div>
            </div>
        
            <div class="device-grid">
              <div class="control-card" data-device="A304_FAN_1">
                <i class="fa-solid fa-fan control-icon"></i>
                <p class="control-name">Wall Fan 1</p>
                <button class="btn toggle-device" data-device="A304_FAN_1" data-room="A304" data-state="off">
                  <i class="fa-solid fa-power-off"></i>
                  <span>Turn On</span>
                </button>
                <span id="status-A304_FAN_1" class="device-status">OFF</span>
              </div>
        
              <div class="control-card" data-device="A304_FAN_2">
                <i class="fa-solid fa-fan control-icon"></i>
                <p class="control-name">Wall Fan 2</p>
                <button class="btn toggle-device" data-device="A304_FAN_2" data-room="A304" data-state="off">
                  <i class="fa-solid fa-power-off"></i>
                  <span>Turn On</span>
                </button>
                <span id="status-A304_FAN_2" class="device-status">OFF</span>
              </div>
        
              <div class="control-card" data-device="A304_LIGHT_1">
                <i class="fa-solid fa-lightbulb control-icon"></i>
                <p class="control-name">Main Light 1</p>
                <button class="btn toggle-device" data-device="A304_LIGHT_1" data-room="A304" data-state="off">
                  <i class="fa-solid fa-power-off"></i>
                  <span>Turn On</span>
                </button>
                <span id="status-A304_LIGHT_1" class="device-status">OFF</span>
              </div>
        
              <div class="control-card" data-device="A304_LIGHT_2">
                <i class="fa-solid fa-lightbulb control-icon"></i>
                <p class="control-name">Main Light 2</p>
                <button class="btn toggle-device" data-device="A304_LIGHT_2" data-room="A304" data-state="off">
                  <i class="fa-solid fa-power-off"></i>
                  <span>Turn On</span>
                </button>
                <span id="status-A304_LIGHT_2" class="device-status">OFF</span>
              </div>
            </div>
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

      <!-- =========================
           PROFILE SECTION - MAINTENANCE HEAD
      ========================= -->
      <section id="profile" class="page-section">
        <div class="profile-panel">

          <!-- Profile Header -->
          <div class="profile-header">
            <img src="assets/images/klaseco-logo.png" class="profile-avatar" alt="Maintenance Head Photo">
            <div>
              <h2 class="profile-name" id="profileName">Maintenance Head</h2>
              <p class="profile-role" id="profileRole">Maintenance Head</p>
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

      <!-- =========================
          EDIT PROFILE MODAL
      ========================= -->
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
                <input type="text" id="editName" name="name" placeholder="Enter full name">
              </div>

              <div class="modal-field">
                <label for="editEmail">Email</label>
                <input type="email" id="editEmail" name="email" placeholder="Enter email" readonly>
              </div>

              <div class="modal-field">
                <label for="editUsername">Username</label>
                <input type="text" id="editUsername" name="username" readonly>
                
              </div>

              <div class="modal-field">
                <label for="editRole">Role</label>
                <input type="text" id="editRole" name="role" value="Maintenance Head" readonly>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-outline" data-close-modal>Cancel</button>
              <button type="submit" class="btn-primary">Save Changes</button>
            </div>

          </form>

        </div>
      </div>

      <!-- =========================
          CHANGE PASSWORD MODAL
      ========================= -->
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

      <div id="login-toast" class="login-toast"></div>
      <div id="toastContainer" class="toast-container"></div>
    </main>
  </div>

  <script src="assets/js/core/klaseco-refresh-bus.js"></script>

  <script src="assets/js/maintenancehead/mainfunctions.js"></script>
  <script src="assets/js/maintenancehead/maintenanceaccounts.js"></script>
  <script src="assets/js/maintenancehead/maintenance.js"></script>
  <script src="assets/js/maintenancehead/hardware.js"></script>
  <script src="assets/js/maintenancehead/hardwarecontrol.js"></script>
  <script src="assets/js/maintenancehead/systemlogs.js"></script>
  <script src="assets/js/maintenancehead/profile.js"></script>
</body>
</html>
