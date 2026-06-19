<?php require __DIR__.'/auth.php'; redirect_if_logged_in(); ?> 
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>KLASECO | Login</title>

  <link rel="icon" type="image/x-icon" href="assets/images/klaseco-logo.png" />
  <link rel="stylesheet" href="assets/css/login/login.css" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"/>
</head>

<body>
  <div class="container">

    <div class="left-panel">
      <div class="header">
        <img src="assets/images/Logo.png" alt="KLASECO Symbol" class="header-logo" />
        <p>UNIVERSITY OF<br>BOHOL COMPUTER<br>ENGINEERING</p>
      </div>

      <div class="main-content">
        <img class="rp-logo" src="assets/images/klaseco-logo.png" alt="KLASECO logo" />
        <p class="rp-tagline">Innovation You Can See, Learning You Can Feel</p>
      </div>
    </div>

    <div class="right-panel"></div>

    <div class="login-card">
      <div class="card-header">
        <img class="card-badge" src="assets/images/klaseco-logo.png" alt="KLASECO badge" />
        <div class="card-title">
          <div class="system-name">K L A S E C O &nbsp; S Y S T E M</div>
          <div class="system-sub">Smart Classroom Management Portal</div>
        </div>
      </div>

      <h2 class="welcome" aria-live="polite"></h2>
      <hr class="divider"/>

      <div class="role-toggle">
          <input type="radio" id="role-admin" name="role" value="admin" checked>
          <input type="radio" id="role-maint" name="role" value="maintenance">
          <input type="radio" id="role-teacher" name="role" value="teacher">
        
          <label for="role-admin" class="pill pill-admin">
            <i class="fa-solid fa-user-group"></i>
            <span>Administrator</span>
          </label>
        
          <label for="role-maint" class="pill pill-maint">
            <i class="fa-solid fa-gear"></i>
            <span>Maintenance</span>
          </label>
        
          <label for="role-teacher" class="pill pill-teacher" onclick="window.location.href='TeacherTap.html'">
            <i class="fa-solid fa-chalkboard-user"></i>
            <span>Teacher</span>
          </label>
        </div>

      <div class="section-label">
        <i class="fa-solid fa-lock"></i>
        <span>Credentials</span>
      </div>

      <!-- Single form, JS will decide endpoint based on role -->
      <form class="form" id="login-form" method="POST" action="admin_login.php" autocomplete="on">
        <div class="field field-email">
          <input type="email"
                 name="email"
                 placeholder="Email"
                 autocomplete="username">
          <button type="button" class="field-action" aria-label="clear">
            <span>×</span>
          </button>
        </div>

        <div class="field field-username">
          <input type="text"
                 name="username"
                 placeholder="Username"
                 autocomplete="username">
          <button type="button" class="field-action" aria-label="clear">
            <span>×</span>
          </button>
        </div>

        <div class="field">
          <input type="password"
                 name="password"
                 placeholder="Password"
                 autocomplete="current-password">
          <button type="button" class="field-action" aria-label="toggle password">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>

        <div class="form-links">
          <button type="button" class="back-btn">
            <i class="fa-solid fa-arrow-left-long"></i>
            <span>Back to Home</span>
          </button>

          <button type="button" class="forgot" id="forgot-link">
            Forgot your password?
          </button>
        </div>

        <button class="submit" type="submit">
          <span class="btn-inner">
            <i class="fa-solid fa-arrow-right-to-bracket"></i>
            <span>LOG IN</span>
          </span>

          <span class="btn-loader" aria-hidden="true">
            <span class="loader-text">Logging in...</span>
          </span>
        </button>

      </form>

      <div class="forgot-modal" id="forgot-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="forgot-title">
        <div class="forgot-content">
          <h3 id="forgot-title">Reset Your Password</h3>
          <p>Enter your registered email and we’ll send you a reset link.</p>

          <input type="email" id="reset-email" placeholder="Enter your email">

          <div class="forgot-buttons">
            <button id="send-reset" class="btn-send" type="button">Send Link</button>
            <button id="close-forgot" class="btn-cancel" type="button">Cancel</button>
          </div>
        </div>
      </div>

    </div>

  </div>

  <!-- Toast for login messages -->
  <div id="toast" class="toast" hidden role="status" aria-live="polite"></div>

  <script src="assets/js/loginfunctions/login.js"></script>
</body>
</html>