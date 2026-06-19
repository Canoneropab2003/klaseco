<?php
require_once __DIR__ . '/session_boot.php';

$BASE = rtrim(str_replace('\\','/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
if ($BASE === '/' || $BASE === '\\') $BASE = '';

define('LOGIN_PAGE',        $BASE . '/login.php');
define('ADMIN_HOME',        $BASE . '/admindb.php');
define('ADMIN_STAFF_HOME',  $BASE . '/academicadmin.php');   // 👈 NEW

define('MAINT_HEAD_HOME',   $BASE . '/maintenancehead.php');
define('MAINT_STAFF_HOME',  $BASE . '/maintenancestaff.php');

function is_logged_in(){
  return !empty($_SESSION['uid']) && !empty($_SESSION['role']);
}

function role(){
  return $_SESSION['role'] ?? null;
}

function go($path){
  header('Location: ' . $path);
  exit;
}

/**
 * Require an exact role (admin, admin_staff, maint_head, maint_staff, etc.)
 */
function require_role(string $req){
  if (!is_logged_in()) go(LOGIN_PAGE);
  if (role() !== $req) go(LOGIN_PAGE);
}

/**
 * If already logged in, send user to their correct home.
 */
function redirect_if_logged_in(){
  if (!is_logged_in()) return;

  switch (role()) {
    case 'admin':
      go(ADMIN_HOME);
    case 'admin_staff':
      go(ADMIN_STAFF_HOME);      // 👈 NEW
    case 'maint_head':
      go(MAINT_HEAD_HOME);
    case 'maint_staff':
      go(MAINT_STAFF_HOME);
    default:
      // Unknown role → do nothing, avoid redirect loop
      return;
  }
}

// ... json_401, json_403, require_auth_json, require_role_json stay as you have ...


/* (rest of your helpers unchanged) */
function nocache_headers() {
  header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
  header('Pragma: no-cache');
  header('Expires: 0');
}

function json_401($msg='Unauthorized'){
  http_response_code(401);
  header('Content-Type: application/json');
  echo json_encode(['ok'=>false,'error'=>$msg]);
  exit;
}
function json_403($msg='Forbidden'){
  http_response_code(403);
  header('Content-Type: application/json');
  echo json_encode(['ok'=>false,'error'=>$msg]);
  exit;
}

function require_auth_json(){
  if (!is_logged_in()) json_401();
}
function require_role_json(string $req){
  if (!is_logged_in()) json_401();
  if (role() !== $req) json_403();
}
