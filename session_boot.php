<?php
// Start a session only if none is active.
// Set cookie params *before* starting the session.
function start_session_if_needed(): void {
  if (session_status() === PHP_SESSION_NONE) {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
      'lifetime' => 0,
      'path'     => '/',
      'domain'   => '',
      'secure'   => $secure,
      'httponly' => true,
      'samesite' => 'Lax',
    ]);
    session_start();
  }
}

start_session_if_needed();

// Optional: idle timeout (60 min)
$MAX_IDLE = 3600;
$now = time();

if (isset($_SESSION['__last']) && ($now - (int)$_SESSION['__last']) > $MAX_IDLE) {
  // Destroy current session and start a fresh one with the same cookie params.
  $_SESSION = [];

  if (session_status() === PHP_SESSION_ACTIVE) {
    if (ini_get('session.use_cookies')) {
      $p = session_get_cookie_params();
      setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
  }

  // Start a new empty session
  start_session_if_needed();
}

$_SESSION['__last'] = $now;
