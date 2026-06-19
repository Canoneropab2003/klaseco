    <?php
    // Start session (and set cookie params) via session_boot.php inside auth.php
    require __DIR__ . '/auth.php';
    require_role('admin');   // gatekeep this page

    // DB connection (Supabase PDO)
    require __DIR__ . '/api/supabase_conn.php';

    // No-cache headers (only if you don't already define this elsewhere)
    if (!function_exists('nocache_headers')) {
    function nocache_headers(): void {
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Cache-Control: post-check=0, pre-check=0', false);
        header('Pragma: no-cache');
    }
    }
    nocache_headers();

    // Dynamically detect app base (works for /klaseco-admin or any folder name)
    $APP_BASE = rtrim(str_replace('\\','/', dirname($_SERVER['SCRIPT_NAME'])), '/') . '/';

    $ADMIN_NAME = $_SESSION['admin_user']['name'] ?? 'Admin';

    /**
     * q1() for PDO/Supabase
     * Run a scalar query and return the first column as int.
     */
    function q1(PDO $db, string $sql, array $params = []): int {
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $val = $stmt->fetchColumn();
    return (int)($val ?? 0);
    }

    // =============================
    // KPI COUNTS (Supabase/Postgres)
    // =============================

    // Teachers total
    $KPI_TEACHERS = q1($pdo, "SELECT COUNT(*) FROM teachers");

    // Maintenance total
    $KPI_MAINTS   = q1($pdo, "SELECT COUNT(*) FROM maintenance_users");

    // TODO: recreate v_present_today in Supabase, for now hard-code 0
    $KPI_PRESENT = 0;


    // Time-ins today (PostgreSQL syntax; swipe_ts is TIMESTAMPTZ)
    $KPI_TIMEINS  = q1(
    $pdo,
    "SELECT COUNT(*)
    FROM attendance
    WHERE swipe_ts::date = CURRENT_DATE
        AND status = 'IN'"
    );

    // Devices/AutoMode are mock values for now (you can replace later from real sources)
    $KPI_DEVICES  = 0;
    $KPI_AUTOMODE = false;
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KLASECO | Admin Monitoring</title>

    <link rel="icon" type="image/png" href="assets/images/klaseco-logo.png" />

    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
    <link href="https://fonts.cdnfonts.com/css/lovelo" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700;900&display=swap" rel="stylesheet" />

    <link rel="stylesheet" href="assets/css/admincss/admindb.css" />
    <link rel="stylesheet" href="assets/css/admincss/attendance.css" />
    <link rel="stylesheet" href="assets/css/admincss/Mteachers.css" />
    <link rel="stylesheet" href="assets/css/admincss/Mmaintenance.css" />
    <link rel="stylesheet" href="assets/css/admincss/adminstaffaccounts.css" />
    <link rel="stylesheet" href="assets/css/admincss/maintenance.css" />
    <link rel="stylesheet" href="assets/css/admincss/analytics.css" />
    <link rel="stylesheet" href="assets/css/admincss/SystemLogs.css" />
    <link rel="stylesheet" href="assets/css/admincss/aibotchat.css" />
    <link rel="stylesheet" href="assets/css/admincss/profile.css" />
    </head>

    <body>
    <div id="loading-screen">
        <img src="assets/images/klaseco-logo.png" class="loading-logo" alt="KLASECO loading logo" />
        <p class="loading-text">Loading Dashboard...</p>
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

            <button class="menu-item" data-section="teachersaccounts">
            <i class="fa-solid fa-user-group"></i><span>Teachers<br>Accounts</span>
            </button>

            <button class="menu-item" data-section="adminstaffaccounts">
                <i class="fa-solid fa-user-gear"></i><span>Admin Staff Accounts</span>
            </button>

            <button class="menu-item active" data-section="maintenanceaccounts">
            <i class="fa-solid fa-screwdriver-wrench"></i><span>Maintenance<br>Accounts</span>
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
        </form>
        </aside>

        <main class="main">
        <header class="header">
            <div class="header-left">
        <button class="menu-toggle" id="menuToggle" type="button" aria-label="Toggle Navigation Menu">
            <i class="fas fa-bars" aria-hidden="true"></i>
        </button>
            <h1>ADMIN MONITORING</h1>
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
                <div class="card-icon"><i class="fa-solid fa-chalkboard-user"></i></div>
                <div class="card-meta">
                <p>Registered Teachers</p>
                <strong id="overview-teachers-count">—</strong>
                </div>
            </div>

            <div class="card">
            <div class="card-icon"><i class="fa-solid fa-user-gear"></i></div>
            <div class="card-meta">
                <p>Registered Admin Staff</p>
                <strong id="overview-adminstaff-count">—</strong>
            </div>
            </div>

            <div class="card">
                <div class="card-icon"><i class="fa-solid fa-screwdriver-wrench"></i></div>
                <div class="card-meta">
                <p>Registered Maintenance</p>
                <strong id="overview-maintenance-count">—</strong>
                </div>
            </div>

            <div class="card">
                <div class="card-icon"><i class="fa-solid fa-user-check"></i></div>
                <div class="card-meta">
                    <p>Present Today</p>
                    <strong id="overview-present-count">—</strong>
                </div>
            </div>
            <div class="card">
                <div class="card-icon"><i class="fa-solid fa-clock"></i></div>
                <div class="card-meta">
                    <p>Time-ins Today</p>
                    <strong id="overview-timein-count">—</strong>
                </div>
            </div>
            </div>
        </section>

        <section id="attendance" class="page-section panel">
            <div class="panel-head">
            <h2>ATTENDANCE (RFID &amp; Biometric)</h2>
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
                <button class="btn btn-reset" type="button">
                    <i class="fa-solid fa-rotate-left"></i> Reset
                </button>
                <button class="btn btn-export" type="button">
                    <i class="fa-solid fa-upload"></i> Export CSV
                </button>
                <button class="btn btn-pdf" type="button">
                    <i class="fa-solid fa-file-pdf"></i> Export PDF
                </button>
            </div>

            <div class="table-wrap">
            <table class="table">
                <thead>
                <tr>
                    <th class="col-time">Time In</th>
                    <th class="col-out">Time Out</th>
                    <th class="col-room">Room</th> <th class="col-teacher">Teacher</th>
                    <th class="col-program">Program</th>
                    <th class="col-subject">Subject</th>
                    <th class="col-date">Date</th>
                </tr>
                </thead>

                <tbody>
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
        </section>

        <section id="teachersaccounts" class="page-section">
            <div class="teachers-panel">
            <div class="teachers-head">
                <h2><i class="fa-solid fa-gear"></i> Manage Teachers</h2>
            </div>

            <div class="tform-card">
                <div class="tform-grid">
                <div class="tfield">
                    <label for="t-id"><i class="fa-solid fa-id-card"></i> Teacher ID</label>
                    <input
                    id="t-id"
                    name="t-id"
                    class="tinput"
                    type="text"
                    placeholder="XXXXX-XXXX"
                    maxlength="10"
                    pattern="[0-9]{5}-[0-9]{4}"
                    inputmode="numeric"
                    required
                    title="Please enter a valid Teacher ID (e.g., 12345-6789)"
                    />
                </div>

                <div class="tfield">
                    <label for="t-email"><i class="fa-regular fa-envelope"></i> Email</label>
                    <input
                    id="t-email"
                    name="t-email"
                    class="tinput"
                    type="email"
                    placeholder="e.g., santos@universityofbohol.edu.ph
                    required
                    pattern="^[A-Za-z0-9._%+\-]+@gmail\.com$"
                    title="Please enter a valid University of Bohol email (e.g., santos@ub.edu.ph)"
                    />
                </div>

                <div class="tfield">
                    <label for="t-name"><i class="fa-regular fa-user"></i> Name</label>
                    <input
                    id="t-name"
                    name="t-name"
                    class="tinput"
                    type="text"
                    placeholder="Full name"
                    pattern="[A-Za-z\s.'\-]{3,}"
                    required
                    title="Please enter a valid name (letters only, at least 3 characters)"
                    />
                </div>

                <div class="tfield">
                    <label for="t-phone"><i class="fa-solid fa-phone"></i> Phone Number</label>
                    <input
                    id="t-phone"
                    name="t-phone"
                    class="tinput"
                    type="tel"
                    placeholder="e.g., 09XXXXXXXXX"
                    maxlength="11"
                    pattern="09[0-9]{9}"
                    inputmode="numeric"
                    required
                    title="Please enter a valid 11-digit phone number starting with 09 (e.g., 09123456789)"
                    />
                </div>

                <div class="tfield">
                    <label for="t-program"><i class="fa-solid fa-building-columns"></i> Program</label>
                    <select
                    id="t-program"
                    name="t-program"
                    class="tinput"
                    aria-label="Select department"
                    required
                    title="Please select a valid department or program"
                    >
                    <option value="" disabled selected>Select department</option>
                    <option value="CPE">Computer Engineering</option>
                    <option value="CE">Civil Engineering</option>
                    <option value="EE">Electrical Engineering</option>
                    <option value="IE">Industrial Engineering</option>
                    <option value="ECE">Electronics &amp; Communications Engineering</option>
                    <option value="ME">Mechanical Engineering</option>
                    <option value="GE">Geodetic Engineering</option>
                    <option value="CS">Computer Science</option>
                    <option value="AMT">Aircraft Maintenance Technology</option>
                    <option value="ARCHI">Architecture</option>
                    <option value="FA">Fine Arts (Visual Communication / Advertising)</option>
                    </select>
                </div>

                <div class="tfield">
                    <label for="t-status"><i class="fa-solid fa-sliders"></i> System Settings Status</label>
                    <select
                    id="t-status"
                    name="t-status"
                    class="tinput"
                    aria-label="Account status"
                    required
                    title="Please select the system status for this account"
                    >
                    <option value="" disabled selected>Select status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                    </select>
                </div>

                <div class="tfield">
                    <label for="t-rfid"><i class="fa-solid fa-wifi"></i> RFID</label>
                    <input
                    id="t-rfid"
                    name="t-rfid"
                    class="tinput"
                    type="text"
                    placeholder="Enter 10-digit RFID"
                    pattern="[0-9]{10}"
                    inputmode="numeric"
                    maxlength="10"
                    required
                    title="Please enter a valid 10-digit RFID number (e.g., 0009519297)"
                    />
                </div>

                <div class="tfield">
                    <label for="t-biometric">
                    <i class="fa-solid fa-fingerprint"></i> Biometric Data <span style="color: red;">*</span>
                    </label>
                    
                    <input type="hidden" id="t-biometric" name="t-biometric" required>

                    <button type="button" class="tinput-btn" id="scan-btn">
                    <i class="fa-solid fa-wifi"></i> <span>Open Scanner</span>
                    </button>
                    
                    <small class="tfield-hint">
                    Click to connect sensor and register fingerprint.
                    </small>
                </div>

                <div class="tfield">
                    <div class="tactions">
                    <button class="tbtn tbtn-primary" type="button">
                        <span>Add/Update</span>
                    </button>
                    <button class="tbtn tbtn-clear" type="button">
                        <i class="fa-solid fa-xmark"></i><span>Clear</span>
                    </button>
                    </div>
                </div>
                </div>
            </div>

            <div id="teacher-delete-confirm" class="t-confirm-overlay hidden">
                <div class="t-confirm-box">
                <div class="t-confirm-icon">!</div>

                <h3>Delete teacher?</h3>
                <p id="confirm-teacher-name"></p>
                <p id="confirm-teacher-id" class="t-confirm-id"></p>

                <div class="t-confirm-actions">
                    <button id="confirm-delete-btn" class="t-confirm-delete">
                    <i class="fa-solid fa-trash"></i> Delete
                    </button>
                    <button id="confirm-cancel-btn" class="t-confirm-cancel">
                    Cancel
                    </button>
                </div>
                </div>
            </div>

            <div class="t-table-wrap">
                <table class="t-table">
                <thead>
                    <tr>
                    <th>Teacher ID</th>
                    <th>RFID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Program</th>
                    <th>Status</th>
                    <th>Actions</th>
                    </tr>
                </thead>

                <tbody>
                </tbody>
                </table>
            </div>
            </div>

            <div id="toast-container"></div>
        </section>

        <section id="biometric-registration" class="page-section">
            <div class="teachers-panel">
            
            <div class="teachers-head">
                <h2><i class="fa-solid fa-fingerprint"></i> Biometric Enrollment</h2>
                <button type="button" onclick="closeBiometric()" class="tbtn tbtn-clear tbtn-right">
                <i class="fa-solid fa-arrow-left"></i> Back
                </button>
            </div>

            <div class="tform-card">
                <div class="bio-container">
                
                <div class="bio-controls">
                    <div class="tfield">
                        <label><i class="fa-solid fa-user-check"></i> Target Teacher</label>
                        <input type="text" id="bio-teacher-name" class="tinput" value="Registering New ID..." readonly>
                    </div>
                    
                    <div class="tfield">
                        <label><i class="fa-brands fa-usb"></i> Sensor Status</label>
                        <div class="connection-box">
                        <span id="device-status" class="status-badge status-disconnected">
                            <i class="fa-solid fa-circle-xmark"></i> Disconnected
                        </span>
                        <button id="btn-connect" class="tbtn tbtn-sm" type="button" onclick="connectSensor()">
                            Connect
                        </button>
                        </div>
                    </div>
                    
                    <div class="tactions">
                        <button id="btn-enroll" class="tbtn tbtn-primary tbtn-block" type="button" onclick="startMultiAngleScan()" disabled>
                        <i class="fa-solid fa-fingerprint"></i> <span id="btn-text">Start Enrollment</span>
                        </button>
                        <button class="tbtn tbtn-clear tbtn-block" type="button" onclick="closeBiometric()">
                        Cancel
                        </button>
                    </div>
                </div>

                <div class="bio-visual">
                    <div class="scan-area" id="scan-animator">
                        <i id="scan-icon" class="fa-solid fa-fingerprint scan-placeholder"></i>
                    </div>
                    
                    <div class="scan-instruction">
                        <h4 id="instruction-title">Ready to Connect</h4>
                        <p id="instruction-text">Please place your finger on the sensor.</p>
                    </div>
                    
                    <div class="scan-progress">
                        <div class="step-dot" id="step-1" title="Scan">1</div>
                        <div class="step-line" id="line-1"></div>
                        <div class="step-dot" id="step-2" style="opacity: 0.3;">
                            <i class="fa-solid fa-check"></i>
                        </div>
                        <div class="step-line" id="line-2"></div>
                        <div class="step-dot" id="step-3" style="opacity: 0.3;">3</div>
                    </div>
                </div>

                </div>
            </div>
            </div>
        </section>
    
        <section id="adminstaffaccounts" class="page-section adminstaff-section">
            <div class="maintenance-panel adminstaff-panel">
            <div class="maintenance-head adminstaff-head">
                <h2><i class="fa-solid fa-user-gear"></i> Manage Admin Staff</h2>
            </div>

            <form id="adminstaff-form" novalidate>
                <div class="mform-card as-form-card">
                <div class="mform-grid as-form-grid">
                    <input type="hidden" id="as-db-id" name="id" value="">
                    <div class="mfield as-field">
                    <label for="as-id">
                        <i class="fa-solid fa-id-card"></i> Staff ID
                    </label>
                    <input
                        id="as-id"
                        name="as-id"
                        class="minput as-input"
                        type="text"
                        placeholder="XX-XXXX-XXX"
                        maxlength="12"
                        pattern="[A-Za-z0-9]{2}-[0-9]{4}-[0-9]{3}"
                        inputmode="numeric"
                        required
                        title="Please enter a valid Staff ID (e.g., AS-1234-567)"
                    />
                    </div>

                    <div class="mfield as-field">
                    <label for="as-name">
                        <i class="fa-solid fa-user"></i> Name
                    </label>
                    <input
                        id="as-name"
                        name="as-name"
                        class="minput as-input"
                        type="text"
                        placeholder="Full Name"
                        pattern="^[A-Za-z\s.'\-]{3,}$"
                        required
                        title="Name must contain letters only (at least 3 characters)."
                    />
                    </div>

                    <div class="mfield as-field">
                      <label for="as-position">
                        <i class="fa-solid fa-user-tie"></i> Position
                      </label>
                      <select
                        id="as-position"
                        name="as-position"
                        class="minput as-input"
                        required
                        title="Select the Admin Staff position."
                      >
                        <option value="" disabled selected>Select Position</option>
                        <option value="Office Staff">Office Staff</option>
                      </select>
                    </div>

                    <div class="mfield as-field">
                    <label for="as-email">
                        <i class="fa-regular fa-envelope"></i> Email
                    </label>
                    <input
                        id="as-email"
                        name="as-email"
                        class="minput as-input"
                        type="email"
                        placeholder="example@ub.edu.ph"
                        required
                        title="Please enter a valid email address."
                    />
                    </div>

                    <div class="mfield as-field">
                    <label for="as-phone">
                        <i class="fa-solid fa-phone"></i> Phone
                    </label>
                    <input
                        id="as-phone"
                        name="as-phone"
                        class="minput as-input"
                        type="tel"
                        placeholder="09XXXXXXXXX"
                        maxlength="11"
                        pattern="09[0-9]{9}"
                        inputmode="numeric"
                        required
                        title="Phone must be 11 digits starting with 09."
                    />
                    </div>

                    <div class="mfield as-field">
                    <label for="as-username">
                        <i class="fa-solid fa-user-gear"></i> Username
                    </label>
                    <input
                        id="as-username"
                        name="as-username"
                        class="minput as-input"
                        type="text"
                        placeholder="Enter Username"
                        required
                        title="Please enter a username."
                    />
                    </div>

                    <div class="mfield mfield-password as-field as-password-field">
                    <label for="as-password">
                        <i class="fa-solid fa-lock"></i> Password
                    </label>

                    <div class="m-password-wrapper as-password-wrapper">
                        <input
                        id="as-password"
                        name="as-password"
                        class="minput as-input"
                        type="password"
                        placeholder="Enter Password"
                        required
                        minlength="4"
                        title="Password must have at least 4 characters."
                        />

                        <button
                        type="button"
                        class="m-password-toggle as-password-toggle"
                        aria-label="Show password"
                        >
                        <i class="fa-regular fa-eye"></i>
                        </button>
                    </div>

                    <div id="as-password-strength" class="m-password-strength as-password-strength"></div>
                    </div>

                    <div class="mfield mfield-span as-field as-actions-field">
                    <div class="mactions as-actions">
                        <button type="submit" class="mbtn mbtn-green as-btn as-btn-save">
                        <span>Add/Update</span>
                        </button>
                        <button type="button" class="mbtn mbtn-clear as-btn as-btn-clear">
                        <i class="fa-solid fa-xmark"></i><span>Clear</span>
                        </button>
                    </div>
                    </div>

                    <!-- DELETE CONFIRMATION -->
                    <div id="as-delete-confirm" class="t-confirm-overlay as-confirm-overlay hidden">
                    <div class="t-confirm-box as-confirm-box">
                        <div class="t-confirm-icon as-confirm-icon">!</div>

                        <h3>Delete Admin Staff account?</h3>
                        <p id="confirm-as-name"></p>
                        <p id="confirm-as-id" class="t-confirm-id"></p>
                        <div class="t-confirm-actions as-confirm-actions">
                        <button id="as-confirm-delete-btn" class="t-confirm-delete as-confirm-delete" type="button">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                        <button id="as-confirm-cancel-btn" class="t-confirm-cancel as-confirm-cancel" type="button">
                            Cancel
                        </button>
                        </div>
                    </div>
                    </div>

                </div>
                </div>
            </form>

            <!-- TABLE -->
            <div class="m-table-scroll as-table-scroll">
                <div class="m-table-wrap as-table-wrap">
                <table class="m-table as-table">
                    <thead>
                    <tr>
                        <th class="col-mid as-col-mid">Staff ID</th>
                        <th class="col-name as-col-name">Name</th>
                        <th class="col-email as-col-email">Email</th>
                        <th class="col-role as-col-role">Position</th>
                        <th class="col-phone as-col-phone">Phone</th>
                        <th class="col-user as-col-user">Username</th>
                        <th class="col-pass as-col-pass">Password</th>
                        <th class="col-actions as-col-actions">Actions</th>
                    </tr>
                    </thead>
                    <tbody></tbody>
                </table>
                </div>
            </div>

            </div>

            <div id="toast-adminstaff" class="toast-container as-toast-container"></div>
        </section>

        <section id="maintenanceaccounts" class="page-section maintenance-section">
            <div class="maintenance-panel maintenance-panel-main">
            <div class="maintenance-head maintenance-head-main">
                <h2><i class="fa-solid fa-screwdriver-wrench"></i> Manage Maintenance</h2>
            </div>

            <form id="maintenance-form" novalidate>
                <div class="mform-card mform-card-maintenance">
                <div class="mform-grid mform-grid-maintenance">

                    <div class="mfield mfield-maintenance">
                    <label for="m-id">
                        <i class="fa-solid fa-id-card"></i> Maintenance ID
                    </label>
                    <input
                        id="m-id"
                        name="m-id"
                        class="minput minput-maintenance"
                        type="text"
                        placeholder="XX-XXXX-XXX"
                        maxlength="12"
                        pattern="[0-9]{2}-[0-9]{4}-[0-9]{3}"
                        inputmode="numeric"
                        required
                        title="Please enter a valid Maintenance ID (e.g., 12-3456-789)"
                    />
                    </div>

                    <div class="mfield mfield-maintenance">
                    <label for="m-name">
                        <i class="fa-solid fa-user"></i> Name
                    </label>
                    <input
                        id="m-name"
                        name="m-name"
                        class="minput minput-maintenance"
                        type="text"
                        placeholder="Full Name"
                        pattern="[A-Za-z\s.'-]{3,}"
                        required
                        title="Name must contain letters only (at least 3 characters)."
                    />
                    </div>

                    <div class="mfield mfield-maintenance">
                    <label for="m-role">
                        <i class="fa-solid fa-helmet-safety"></i> Role
                    </label>

                    <select
                        id="m-role"
                        name="m-role"
                        class="minput minput-maintenance"
                        required
                        title="Please select the maintenance role."
                    >
                        <option value="" disabled selected>Select Role</option>
                    </select>
                    </div>

                    <div class="mfield mfield-maintenance">
                    <label for="m-email">
                        <i class="fa-regular fa-envelope"></i> Email
                    </label>
                    <input
                        id="m-email"
                        name="m-email"
                        class="minput minput-maintenance"
                        type="email"
                        placeholder="example@ub.edu.ph"
                        required
                        title="Please enter a valid email address (e.g., example@ub.edu.ph)."
                    />
                    </div>

                    <div class="mfield mfield-maintenance">
                    <label for="m-phone">
                        <i class="fa-solid fa-phone"></i> Phone
                    </label>
                    <input
                        id="m-phone"
                        name="m-phone"
                        class="minput minput-maintenance"
                        type="tel"
                        placeholder="09XXXXXXXXX"
                        maxlength="11"
                        pattern="09[0-9]{9}"
                        inputmode="numeric"
                        required
                        title="Phone must be 11 digits starting with 09."
                    />
                    </div>

                    <div class="mfield mfield-maintenance">
                    <label for="m-username">
                        <i class="fa-solid fa-user-gear"></i> Username
                    </label>
                    <input
                        id="m-username"
                        name="m-username"
                        class="minput minput-maintenance"
                        type="text"
                        placeholder="Enter Username"
                        required
                        title="Please enter a username."
                    />
                    </div>

                    <div class="mfield mfield-password mfield-maintenance">
                    <label for="m-password">
                        <i class="fa-solid fa-lock"></i> Password
                    </label>

                    <div class="m-password-wrapper m-password-wrapper-maintenance">
                        <input
                        id="m-password"
                        name="m-password"
                        class="minput minput-maintenance"
                        type="password"
                        placeholder="Enter Password"
                        required
                        minlength="4"
                        title="Please enter a password (at least 4 characters)."
                        />

                        <button
                        type="button"
                        class="m-password-toggle m-password-toggle-maintenance"
                        aria-label="Show password"
                        >
                        <i class="fa-regular fa-eye"></i>
                        </button>
                    </div>

                    <div id="m-password-strength" class="m-password-strength m-password-strength-maintenance">
                    </div>
                    </div>

                    <div class="mfield mfield-span mfield-maintenance">
                    <div class="mactions mactions-maintenance">
                        <button type="submit" class="mbtn mbtn-green mbtn-maintenance-save">
                        <span>Add/Update</span>
                        </button>
                        <button type="button" class="mbtn mbtn-clear mbtn-maintenance-clear">
                        <i class="fa-solid fa-xmark"></i><span>Clear</span>
                        </button>
                    </div>
                    </div>

                    <div id="maintenance-delete-confirm" class="t-confirm-overlay maintenance-confirm-overlay hidden">
                    <div class="t-confirm-box maintenance-confirm-box">
                        <div class="t-confirm-icon maintenance-confirm-icon">!</div>

                        <h3>Delete maintenance account?</h3>
                        <p id="confirm-maintenance-name"></p>
                        <p id="confirm-maintenance-id" class="t-confirm-id"></p>
                        <div class="t-confirm-actions maintenance-confirm-actions">
                        <button id="m-confirm-delete-btn" class="t-confirm-delete maintenance-confirm-delete" type="button">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                        <button id="m-confirm-cancel-btn" class="t-confirm-cancel maintenance-confirm-cancel" type="button">
                            Cancel
                        </button>
                        </div>
                    </div>
                    </div>

                </div>
                </div>
            </form>

            <div class="m-table-scroll m-table-scroll-maintenance">
                <div class="m-table-wrap m-table-wrap-maintenance">
                <table class="m-table m-table-maintenance">
                    <thead>
                    <tr>
                        <th class="col-mid m-col-mid">Maintenance ID</th>
                        <th class="col-name m-col-name">Name</th>
                        <th class="col-email m-col-email">Email</th>
                        <th class="col-role m-col-role">Role</th>
                        <th class="col-phone m-col-phone">Phone</th>
                        <th class="col-user m-col-user">Username</th>
                        <th class="col-pass m-col-pass">Password</th>
                        <th class="col-actions m-col-actions">Actions</th>
                    </tr>
                    </thead>

                    <tbody>
                    </tbody>
                </table>
                </div>
            </div>
            </div>

            <div id="toast-maintenance" class="toast-container maintenance-toast-container"></div>
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

        <section id="profile" class="page-section"> 
        <div class="profile-panel">

            <!-- Profile Header -->
            <div class="profile-header">
            <img src="assets/images/klaseco-logo.png" class="profile-avatar" alt="Admin Photo">
            <div>
                <h2 class="profile-name" id="profileName">KLASECO Admin</h2>
                <p class="profile-role" id="profileRole">System Administrator</p>
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
                <i class="fa-solid fa-user-shield"></i>
                <span class="stat-label">Access Level</span>
                <span class="stat-value" id="profileAccessLevel">Full Admin</span>
            </div>
            </div>

            <!-- Account Information -->
            <div class="profile-info">
            <h3>Account Information</h3>
            <div class="info-grid">
                <div class="info-item">
                <label>Username:</label>
                <span id="profileUsername">Loading...</span>
                </div>
                <div class="info-item">
                <label>Email:</label>
                <span id="profileEmail">Loading...</span>
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
    <div id="toast-adminstaff"></div>
    <div id="login-toast" class="login-toast"></div>

        <!-- expose APP_BASE to JavaScript -->
    <script>
        window.APP_BASE = <?= json_encode($APP_BASE) ?>;
    </script>

    <script src="assets/js/core/klaseco-refresh-bus.js"></script>
    
    <script src="assets/js/adminfunctions/mainfunctions.js"></script>
    <script src="assets/js/adminfunctions/attendance.js"></script>
    <script src="assets/js/adminfunctions/mteachers.js"></script>
    <script src="assets/js/adminfunctions/adminstaffaccounts.js"></script>
    <script src="assets/js/adminfunctions/mmaintenance.js"></script>
    <script src="assets/js/adminfunctions/maintenance.js"></script>
    <script src="assets/js/adminfunctions/analytics.js"></script>
    <script src="assets/js/adminfunctions/systemlogs.js"></script>
    <script src="assets/js/adminfunctions/aichatbot.js"></script>
    <script src="assets/js/adminfunctions/profile.js"></script>
    </body>
    </html>

    </body>
    </html>
