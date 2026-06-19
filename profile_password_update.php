<?php
// api/profile_password_update.php
declare(strict_types=1);

require __DIR__ . '/../auth.php';
require_auth_json(); 
require __DIR__ . '/../supabase_conn.php';

if (ob_get_length()) ob_clean();
header('Content-Type: application/json; charset=utf-8');

try {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    // ✅ FALLBACK: Handle redirects or standard form data
    if (!is_array($data)) {
        $data = !empty($_POST) ? $_POST : $_REQUEST;
    }

    $currentPass = $data['current_password'] ?? '';
    $newPass     = $data['new_password']     ?? '';
    $uid         = $_SESSION['uid']          ?? 0;
    $role        = $_SESSION['role']         ?? '';

    if (!$currentPass || !$newPass || !$uid) {
        throw new Exception("Missing required password data.");
    }

    // Identify if the user belongs to the 'admins' table
    $isAdminRole = in_array($role, ['admin', 'admin_staff', 'staff']);
    $table = $isAdminRole ? 'admins' : 'maintenance_users';

    // 1. Verify the current password
    $stmt = $pdo->prepare("SELECT password_hash FROM $table WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => $uid]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($currentPass, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Incorrect current password.']);
        exit;
    }

    // 2. Update with New Hash
    $newHash = password_hash($newPass, PASSWORD_DEFAULT);
    
    // ✅ FIX: "admins" table lacks "updated_at", so we remove it from the SQL
    if ($isAdminRole) {
        $sql = "UPDATE admins SET password_hash = :hash WHERE id = :id";
    } else {
        $sql = "UPDATE maintenance_users SET password_hash = :hash, updated_at = NOW() WHERE id = :id";
    }

    $update = $pdo->prepare($sql);
    $update->execute([':hash' => $newHash, ':id' => $uid]);

    echo json_encode(['ok' => true, 'msg' => 'Password updated successfully.']);

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}