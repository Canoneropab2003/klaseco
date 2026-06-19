<?php
// admin_login.php
declare(strict_types=1);

require __DIR__ . '/auth.php';
require __DIR__ . '/supabase_conn.php';

/**
 * Detect if the client expects JSON (for our AJAX login).
 */
function wants_json(): bool {
    // Prefer explicit AJAX header from our JS
    if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) &&
        strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
        return true;
    }

    // Fallback to Accept header
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    return stripos($accept, 'application/json') !== false;
}

/**
 * Emit a JSON response and exit.
 */
function emit_json(array $payload, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    echo json_encode($payload);
    exit;
}

/**
 * Fail helper: JSON (for AJAX) or redirect with query params (for non-AJAX).
 */
function fail(string $msg, int $status = 400): void {
    if (wants_json()) {
        emit_json(['ok' => false, 'message' => $msg], $status);
    } else {
        go(LOGIN_PAGE . '?error=1&msg=' . urlencode($msg));
    }
}

// --------------------------------------
// Validate HTTP method
// --------------------------------------
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('Invalid request method.', 405);
}

// --------------------------------------
// Read inputs
// --------------------------------------
$email = trim($_POST['email'] ?? '');
$pass  = (string)($_POST['password'] ?? '');

if ($email === '' || $pass === '') {
    // Safety net – front-end should already validate these
    fail('Missing email or password.', 400);
}

// --------------------------------------
// Lookup admin in `admins` table
// --------------------------------------
try {
    $sql = "
        SELECT
            id,
            staff_id,
            name,
            email,
            password_hash,
            role
        FROM admins
        WHERE email = :email
        LIMIT 1
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':email' => $email]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    // Optionally log $e->getMessage()
    fail('Database error.', 500);
}

// If no row: invalid credentials
if (!$row) {
    // Generic so we don't reveal whether email or password is wrong
    fail('Incorrect email or password.', 401);
}

// Check password
if (!password_verify($pass, $row['password_hash'])) {
    fail('Incorrect email or password.', 401);
}

try {
    $loginStmt = $pdo->prepare("UPDATE admins SET last_login_at = NOW() WHERE id = :id");
    $loginStmt->execute([':id' => $row['id']]);
} catch (PDOException $e) {
    // Fail silently or log error
}
// --------------------------------------
// Determine admin role & redirect target
// --------------------------------------
$dbRole = strtolower($row['role'] ?? 'staff');

// Default: treat as STAFF → Academic Admin
$sessionRole = 'admin_staff';
$redirect    = 'academicadmin.php';
$toast       = 'Welcome Back Admin Staff!';

if ($dbRole === 'admin') {
    // Full system Administrator
    $sessionRole = 'admin';
    $redirect    = ADMIN_HOME; // admindb.php (from auth.php)
    $toast       = 'Welcome Back Administrator!';
}

// --------------------------------------
// Success: create session
// --------------------------------------
session_regenerate_id(true);

$_SESSION['uid']  = (int)$row['id'];
$_SESSION['name'] = $row['name'] ?: $row['email'];
$_SESSION['role'] = $sessionRole;

// --------------------------------------
// Respond based on expected content type
// --------------------------------------
if (wants_json()) {
    emit_json([
        'ok'       => true,
        'message'  => 'Login successful.',
        'toast'    => $toast,
        'redirect' => $redirect,
    ], 200);
} else {
    go($redirect);
}
