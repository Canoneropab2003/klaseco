<?php
// maintenance_login.php
declare(strict_types=1);

require __DIR__ . '/auth.php';
require __DIR__ . '/supabase_conn.php';

// If already logged in, just send to the correct home
if (is_logged_in()) {
    redirect_if_logged_in();
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_401('Unauthorized');
}

// -----------------------------
// 1) Get credentials
// -----------------------------
$username = trim($_POST['username'] ?? '');
$password = trim($_POST['password'] ?? '');

if ($username === '' || $password === '') {
    json_401('Username and password required.');
}

// -----------------------------
// 2) Look up maintenance user
// -----------------------------
$sql = "
    SELECT
        id,
        maint_id,
        name,
        role,          -- e.g. 'maintenance head' or 'maintenance staff'
        email,
        username,
        password_hash
    FROM maintenance_users
    WHERE username = :u
    LIMIT 1
";
$stmt = $pdo->prepare($sql);
$stmt->execute([':u' => $username]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    json_401('Invalid username or password.');
}

// -----------------------------
// 3) Check password
// -----------------------------
if (!password_verify($password, $user['password_hash'])) {
    json_401('Invalid username or password.');
}

// -----------------------------
// 4) Set session
// -----------------------------
session_regenerate_id(true);

$_SESSION['uid']      = (int)$user['id'];
$_SESSION['username'] = $user['username'];
$_SESSION['name']     = $user['name'];

// Map DB role → app role + redirect
$maintRole = strtolower(trim($user['role'])); // from DB
$redirect  = 'maintenancestaff.php';          // fallback

if ($maintRole === 'maintenance head') {
    $_SESSION['role'] = 'maint_head';
    $redirect         = 'maintenancehead.php';
} elseif ($maintRole === 'maintenance staff') {
    $_SESSION['role'] = 'maint_staff';
    $redirect         = 'maintenancestaff.php';
} else {
    // unknown → treat as staff
    $_SESSION['role'] = 'maint_staff';
}

// (optional) keep original role string too
$_SESSION['maint_role'] = $maintRole;

// -----------------------------
// 5) JSON response for login.js
// -----------------------------
header('Content-Type: application/json; charset=utf-8');
// -----------------------------
// 3.5) Update last_login_at
// -----------------------------
$stmtUpdate = $pdo->prepare("UPDATE public.maintenance_users SET last_login_at = NOW() WHERE id = :id");
$stmtUpdate->execute([':id' => $user['id']]);
echo json_encode([
    'ok'       => true,
    'message'  => 'Login successful.',
    'toast'    => 'Welcome Back Maintenance!',
    'redirect' => $redirect,
]);
exit;
