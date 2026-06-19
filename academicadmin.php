<?php
require __DIR__ . '/auth.php';
require_role('admin_staff');   // 👈 only admin staff allowed
nocache_headers();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KLASECO | Admin Staff Monitoring</title>

  <link rel="icon" type="image/png" href="assets/images/klaseco-logo.png" />

  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
  <link href="https://fonts.cdnfonts.com/css/lovelo" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700;900&display=swap" rel="stylesheet" />
  <!-- MAIN ADMIN CSS (kept) -->
  <link rel="stylesheet" href="assets/css/AcademicAdmin/admindb.css" />
  <link rel="stylesheet" href="assets/css/AcademicAdmin/attendance.css" />
  <link rel="stylesheet" href="assets/css/AcademicAdmin/teacheraccount.css" />
  <link rel="stylesheet" href="assets/css/AcademicAdmin/classschedule.css" />
  <link rel="stylesheet" href="assets/css/AcademicAdmin/analytics.css" />
  <link rel="stylesheet" href="assets/css/AcademicAdmin/SystemLogs.css" />
  <link rel="stylesheet" href="assets/css/AcademicAdmin/aibotchat.css" />
  <link rel="stylesheet" href="assets/css/AcademicAdmin/profile.css" />
</head>

<script>
  window.INACTIVITY_TIMEOUT_MINUTES = 15;
</script>

<body>
  <div id="loading-screen">
    <img src="assets/images/klaseco-logo.png" class="loading-logo" alt="KLASECO loading logo" />
    <p class="loading-text">Loading Admin Staff Dashboard...</p>
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

        <button class="menu-item" data-section="attendance">
          <i class="fa-solid fa-calendar-check"></i><span>Attendance</span>
        </button>

        <button class="menu-item" data-section="teacher-account">
          <i class="fa-solid fa-user-tie"></i><span>Teacher Account</span>
        </button>

        <button class="menu-item" data-section="schedule">
          <i class="fa-solid fa-calendar-days"></i><span>Class Schedule</span>
        </button>

        <button class="menu-item" data-section="analytics">
          <i class="fa-solid fa-chart-line"></i><span>Analytics</span>
        </button>

        <button class="menu-item" data-section="systemlogs">
          <i class="fa-solid fa-list"></i><span>System Logs</span>
        </button>

        <button class="menu-item" data-section="aichatbot">
          <i class="fa-solid fa-robot"></i><span>AI Chatbot</span>
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
            <h1>ADMIN STAFF MONITORING</h1>
        </div>

        <div class="clock-section">
          <button class="bell-btn" aria-label="Notifications">
            <i class="fa-solid fa-bell"></i>
          </button>

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
              <div class="card-icon"><i class="fa-solid fa-calendar-days"></i></div>
              <div class="card-meta">
                <p>Class Schedule</p>
                <strong id="overview-schedule-count">—</strong>
              </div>
            </div>

<div class="card">
  <div class="card-icon"><i class="fa-solid fa-user-check"></i></div>
  <div class="card-meta">
    <p>Present Today</p>
    <strong id="overview-present-count">--</strong>
  </div>
</div>
<div class="card">
  <div class="card-icon"><i class="fa-solid fa-clock"></i></div>
  <div class="card-meta">
    <p>Time-ins Today</p>
    <strong id="overview-timein-count">--</strong>
  </div>
</div>
          </div>
        </section>

        <section id="attendance" class="page-section panel">
          <!-- ✅ STEP 1: ROOM SELECTION (shown first) -->
          <div id="attendanceRoomSelect" class="select-room-panel">
            <h2>Select Classroom to View Attendance</h2>

            <div class="room-options">
              <button class="room-btn" data-room="A303">A303</button>
              <button class="room-btn" data-room="A304">A304</button>
            </div>
          </div>

          <!-- ✅ STEP 2: ATTENDANCE CONTENT (hidden until room is chosen) -->
          <div id="attendanceContent" class="attendance-content hidden">
            <div class="panel-head">
              <button id="backToRoomBtn" class="back-btn" type="button">
  <i class="fa-solid fa-arrow-left"></i> Back to Rooms
</button>
              <h2 id="selectedRoomTitle">ATTENDANCE (RFID &amp; Biometric)</h2>
            </div>

            <div class="filters">
              <div class="field">
                <label>Date</label>
                <button class="pill pill-light">All dates</button>
              </div>

              <div class="field">
                <label>Teacher</label>
                <button class="pill pill-light">Teacher</button>
              </div>

              <div class="field field-grow">
                <label>Search</label>
                <div class="search">
                  <i class="fa-solid fa-magnifying-glass"></i>
                  <input type="text" placeholder="Search name or Subject" />
                </div>
              </div>

              <button class="btn btn-reset">
              <i class="fa-solid fa-rotate-left"></i><span>Reset</span>
            </button>
            <button class="btn btn-export">
              <i class="fa-solid fa-upload"></i><span>Export CSV</span>
            </button>
            <button class="btn btn-pdf">
              <i class="fa-solid fa-file-pdf"></i><span>Export PDF</span>
            </button>
            </div>

            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th class="col-time">Time</th>
                    <th class="col-out">Out</th>
                    <th class="col-teacher">Teacher</th>
                    <th class="col-program">Program</th>
                    <th class="col-subject">Subject</th>
                    <th class="col-date">Date</th>
                  </tr>
                </thead>

                <tbody>
                  <!-- rows will be injected here -->
                </tbody>
              </table>

              <div class="rows-hint">
                <label for="rowsSelect" class="pill pill-muted">Rows:</label>
                <select id="rowsSelect" class="rows-select">
                  <option value="all" selected>All</option>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section id="teacher-account" class="page-section">
          <div class="teachers-panel">
            <div class="teachers-head">
              <h2>
                <i class="fa-solid fa-user-tie"></i>
                Teacher Accounts
              </h2>
              <p class="t-subtitle">
                This list shows all teacher accounts created in the Admin &raquo; Manage Teachers panel.
              </p>
            </div>

            <div class="t-table-wrap">
              <table class="t-table t-table-compact">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Teacher Name</th>
                    <th>Teacher ID</th>
                    <th>Program</th>
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

        <section id="schedule" class="page-section">
          <div class="schedule-panel">

            <!-- Header -->
            <div class="schedule-head">
              <h2><i class="fa-solid fa-calendar-days"></i> Class Schedule</h2>
            </div>

            <!-- ADD SCHEDULE CARD -->
            <div class="schedule-form-card">
              <h3>Add Schedule</h3>

              <form id="schedule-form">
                <!-- Day(s) – tall on the left -->
                <div class="form-row form-row-days">
                  <label>Day(s)</label>
                  <div class="days-group">

                    <label class="day-pill">
                      <input type="checkbox" name="days" value="Monday">
                      <span>Monday</span>
                    </label>

                    <label class="day-pill">
                      <input type="checkbox" name="days" value="Tuesday">
                      <span>Tuesday</span>
                    </label>

                    <label class="day-pill">
                      <input type="checkbox" name="days" value="Wednesday">
                      <span>Wednesday</span>
                    </label>

                    <label class="day-pill">
                      <input type="checkbox" name="days" value="Thursday">
                      <span>Thursday</span>
                    </label>

                    <label class="day-pill">
                      <input type="checkbox" name="days" value="Friday">
                      <span>Friday</span>
                    </label>

                    <label class="day-pill">
                      <input type="checkbox" name="days" value="Saturday">
                      <span>Saturday</span>
                    </label>

                  </div>
                </div>
                <div class="form-row form-row-start">
                  <label for="class-start">Start Time</label>
                  <select id="class-start" required>
                    <option value="" disabled selected>Select Start Time</option>
                  </select>
                </div>

                <div class="form-row form-row-end">
                  <label for="class-end">End Time</label>
                  <select id="class-end" required>
                    <option value="" disabled selected>Select End Time</option>
                  </select>
                </div>

                <div class="form-row form-row-teacher">
                  <label for="teacher">Teacher</label>
                  <select id="teacher" required>
                    <option value="" disabled selected>Select Teacher</option>
                  </select>
                </div>

                <div class="form-row form-row-subject">
                  <label for="subject">Subject Code</label>
                  <input id="subject" type="text" placeholder="Subject">
                </div>

                <div class="form-row form-row-room">
                  <label for="room">Room</label>
                  <select id="room" required>
                    <option value="" disabled selected>Select Room</option>
                  </select>
                </div>

                <div class="form-row form-row-submit">
                  <button class="btn-primary" type="submit">Add Schedule</button>
                </div>
                
                <div class="form-row form-row-reset">
                  <button class="btn-clear" type="reset">Clear</button>
                </div>

              </form>
            </div>

            <div class="schedule-table-container">
  <div class="schedule-table-header">
    <h3>Existing Schedules</h3>
    <div class="sched-search-wrap">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input
        type="text"
        id="sched-search-input"
        placeholder="Search teacher, subject, room, days�"
        autocomplete="off"
      />
    </div>
  </div>

  <div class="schedule-table-shell">
    <table>
      <thead>
        <tr>
          <th>Day(s)</th>
          <th>Start</th>
          <th>End</th>
          <th>Teacher</th>
          <th>Subject</th>
          <th>Room</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody id="schedule-table-body"></tbody>
    </table>
  </div>
</div>

          </div>

          <div id="schedule-delete-confirm" class="t-confirm-overlay hidden">
            <div class="t-confirm-box">
              <div class="t-confirm-icon">!</div>

              <h3>Delete this schedule?</h3>
              <p id="confirm-schedule-text"></p>

              <div class="t-confirm-actions">
                <button id="s-confirm-delete-btn" class="t-confirm-delete" type="button">
                  <i class="fa-solid fa-trash"></i> Delete
                </button>
                <button id="s-confirm-cancel-btn" class="t-confirm-cancel" type="button">
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <!-- Toast container -->
          <div id="toast-schedule"></div>
        </section>

        <section id="analytics" class="page-section">
            <div class="analytics-panel">
        
                <div class="analytics-head">
                    <h2><i class="fa-solid fa-chart-line"></i> Analytics</h2>
        
                    <div class="analytics-range-tabs" role="tablist">
                        <button type="button" class="range-tab active" data-range="today">Today</button>
                        <button type="button" class="range-tab" data-range="7d">7 Days</button>
                        <button type="button" class="range-tab" data-range="30d">30 Days</button>
                    </div>
                </div>
        
                <div class="analytics-kpi-grid">
                    <div class="kpi-card blue">
                        <div class="kpi-label">Total Teachers</div>
                        <div class="kpi-value" id="kpiTotalTeachers">0</div>
                        <div class="kpi-sub">Registered Staff</div>
                    </div>
        
                    <div class="kpi-card green">
                        <div class="kpi-label">Attendance Rate</div>
                        <div class="kpi-value" id="kpiAttendanceRate">0%</div>
                        <div class="kpi-sub">Selected Period</div>
                    </div>
        
                    <div class="kpi-card purple">
                        <div class="kpi-label">Attendance Records</div>
                        <div class="kpi-value" id="kpiAttendanceCount">0</div>
                        <div class="kpi-sub">Total Activity Logs</div>
                    </div>
        
                    <div class="kpi-card orange">
                        <div class="kpi-label">Maintenance</div>
                        <div class="kpi-value" id="kpiOpenMaintenance">0</div>
                        <div class="kpi-sub">Pending Requests</div>
                    </div>
                </div>
        
                <div class="analytics-mini-grid">
                    <div class="mini-card">
                        <div class="mini-label">Present Today</div>
                        <div class="mini-value mini-ok" id="miniPresentToday">0</div>
                        <div class="mini-sub">Active in building</div>
                    </div>
        
                    <div class="mini-card">
                        <div class="mini-label">Absent Today</div>
                        <div class="mini-value mini-warn" id="miniAbsentToday">0</div>
                        <div class="mini-sub">No log detected</div>
                    </div>
        
                    <div class="mini-card">
                        <div class="mini-label">Resolved Issues</div>
                        <div class="mini-value mini-ok" id="miniResolvedToday">0</div>
                        <div class="mini-sub">Completed today</div>
                    </div>
                </div>
        
                <div class="analytics-main-grid">
                    <div class="analytics-chart-card">
                        <div class="chart-header">
                            <h3>Teacher Attendance Trend</h3>
                            <span class="chart-tag">Live Analytics</span>
                        </div>
                        <p class="chart-subtitle">Daily frequency of RFID/Fingerprint swipes.</p>
        
                        <div class="chart-placeholder">
                            <span>Chart Loading...</span>
                        </div>
        
                        <div class="chart-legend">
                            <span><span class="legend-dot legend-present"></span>Present</span>
                            <span><span class="legend-dot legend-absent"></span>Absent</span>
                            <span><span class="legend-dot legend-total"></span>Expected</span>
                        </div>
                    </div>
        
                    <aside class="analytics-side-card">
                        <h3>Today's Pulse</h3>
                        <div class="side-row">
                            <span>Active Staff</span>
                            <strong id="sideActiveTeachers">0</strong>
                        </div>
                        <div class="side-row">
                            <span>Inactive</span>
                            <strong id="sideInactiveTeachers">0</strong>
                        </div>
                        
                        <div class="side-divider"></div>
                        
                        <div class="side-row">
                            <span>Open Requests</span>
                            <strong class="warn-text" id="sideOpenMaintenance">0</strong>
                        </div>
                        <div class="side-row">
                            <span>Resolved Today</span>
                            <strong class="ok-text" id="sideResolvedMaintenance">0</strong>
                        </div>
                    </aside>
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

          <p class="logs-subtext">Recent activities across Teachers &amp; Maintenance</p>

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

      <section id="aichatbot" class="page-section">
        <div class="ai-panel">
          <div class="ai-head">
            <div class="ai-head-left">
              <div class="ai-icon-wrap">
                <i class="fa-solid fa-robot"></i>
              </div>
              <div class="ai-title">
                <h2>KLASECO AI Assistant</h2>
                <span class="ai-tagline">Your smart classroom companion</span>
              </div>
            </div>

            <div class="ai-status">
              <span class="ai-status-dot"></span>
              <span class="ai-status-text">Online</span>
            </div>
          </div>

          <p class="ai-subtext">
            Ask about attendance, devices, energy usage, or recent classroom activity.
          </p>

          <div class="ai-chatbox">
            <div class="ai-row ai-row-ai">
              <div class="ai-avatar">
                <i class="fa-solid fa-robot"></i>
              </div>
              <div class="ai-bubble ai-msg">
                <strong>Hello Admin!</strong><br />
                How can I help you today?
              </div>
            </div>

            <p class="ai-suggest-label">Try asking:</p>
            <div class="ai-suggestions">
              <button class="ai-suggest" type="button">Who is absent today?</button>
              <button class="ai-suggest" type="button">Show average attendance this month.</button>
              <button class="ai-suggest" type="button">How long were the fans ON this week?</button>
              <button class="ai-suggest" type="button">Which day used the most energy?</button>
            </div>
          </div>

          <div class="ai-input-panel">
            <input
              type="text"
              class="ai-input"
              placeholder="Type your question here..."
            />
            <button class="ai-send-btn" type="button">
              <i class="fa-solid fa-paper-plane"></i>
              Send
            </button>
          </div>
        </div>
      </section>

      <!-- =========================
          PROFILE SECTION - ADMIN STAFF
      ========================= -->
      <section id="profile" class="page-section">
        <div class="profile-panel">

          <!-- Profile Header -->
          <div class="profile-header">
            <img src="assets/images/klaseco-logo.png" class="profile-avatar" alt="Admin Staff Photo">
            <div>
              <h2 class="profile-name" id="profileName">Admin Staff</h2>
              <p class="profile-role" id="profileRole">Administrative Staff</p>
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
              <span class="stat-value" id="profileAccessLevel">Staff Access</span>
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
                <input type="text" id="editName" name="name" placeholder="Enter full name" required>
              </div>

              <div class="modal-field">
                <label for="editEmail">Email</label>
                <input type="email" id="editEmail" name="email" placeholder="Enter email" readonly>
              </div>

              <div class="modal-field">
                <label for="editUsername">Username</label>
                <input type="text" id="editUsername" name="username" readonly>
                <small class="field-hint">Username is fixed for the system admin.</small>
              </div>

              <div class="modal-field">
                <label for="editRole">Role</label>
                <input type="text" id="editRole" name="role" value="System Administrator" readonly>
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

    <div id="toastContainer" class="toast-container"></div>
    <div id="login-toast" class="login-toast"></div>
    <div id="toast-schedule" class="toast-container"></div>

    </main>
  </div>

  <script src="assets/js/core/klaseco-refresh-bus.js"></script>
  
  <script src="assets/js/AcademicAdmin/mainfunctions.js"></script>
  <script src="assets/js/AcademicAdmin/attendance.js"></script>
  <script src="assets/js/AcademicAdmin/teacheraccount.js"></script>
  <script src="assets/js/AcademicAdmin/classschedule.js"></script>
  <script src="assets/js/AcademicAdmin/analytics.js"></script>
  <script src="assets/js/AcademicAdmin/systemlogs.js"></script>
  <script src="assets/js/AcademicAdmin/aichatbot.js"></script>
  <script src="assets/js/AcademicAdmin/profile.js"></script>
</body>
</html>
