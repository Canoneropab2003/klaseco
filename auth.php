<?php
// auth.php
require_once __DIR__ . '/session_boot.php';

// FIX: Ensure session only starts if one doesn't exist to avoid corrupting JSON
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$BASE = rtrim(str_replace('\\','/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
if ($BASE === '/' || $BASE === '\\') $BASE = '';

/* ======================================================
   🚀 FIX: Match Clean URLs (Remove .php)
   This prevents 301 redirects that strip POST data.
====================================================== */
define('LOGIN_PAGE',        $BASE . '/login');
define('ADMIN_HOME',        $BASE . '/admindb');

define('MAINT_HEAD_HOME',   $BASE . '/maintenancehead');
define('MAINT_STAFF_HOME',  $BASE . '/maintenancestaff');

function is_logged_in(){
  return !empty($_SESSION['uid']) && !empty($_SESSION['role']);
}

function role(){
  return $_SESSION['role'] ?? null;
}

/**
 * FIX: Use absolute URLs for redirects to avoid protocol-switch redirects
 */
function go($path){
  $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
  $host = $_SERVER['HTTP_HOST'];
  header('Location: ' . $protocol . $host . $path);
  exit;
}

/**
 * Require an exact role
 */
function require_role(string $req){
  if (!is_logged_in()) go(LOGIN_PAGE);
  if (role() !== $req) go(LOGIN_PAGE);
}