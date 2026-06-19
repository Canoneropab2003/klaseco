<?php
// Load auth (starts the session via session_boot.php and defines LOGIN_PAGE)
require __DIR__ . '/auth.php';

// Send no-cache headers (define if not already available)
if (!function_exists('nocache_headers')) {
  function nocache_headers(): void {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Cache-Control: post-check=0, pre-check=0', false);
    header('Pragma: no-cache');
  }
}
nocache_headers();

// Make sure a session is active before destroying it
if (session_status() !== PHP_SESSION_ACTIVE) {
  session_start();
}

// Wipe session data and cookie
$_SESSION = [];
if (ini_get('session.use_cookies')) {
  $p = session_get_cookie_params();
  setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
}
session_destroy();
?>
<!doctype html>
<meta charset="utf-8">
<script>
  // Tell other tabs on this origin to logout immediately
  try { localStorage.setItem('klaseco:logout', String(Date.now())); } catch(e) {}
  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('klaseco-auth');
      bc.postMessage({ type: 'logout' });
      bc.close();
    }
  } catch(e) {}

  // Redirect to login
  location.replace('<?= htmlspecialchars(LOGIN_PAGE, ENT_QUOTES) ?>?logged_out=1');
</script>
