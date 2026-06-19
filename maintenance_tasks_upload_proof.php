<?php
// api/maintenance_tasks_upload_proof.php
declare(strict_types=1);

session_start();
require __DIR__ . '/supabase_conn.php';

if (ob_get_length()) ob_clean();
header('Content-Type: application/json; charset=utf-8');

$uid  = (int)($_SESSION['uid'] ?? 0);
$role = (string)($_SESSION['role'] ?? '');

if (!$uid || !in_array($role, ['maint_staff', 'maintenance_staff'], true)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'msg' => 'Missing staff session.']);
    exit;
}

$id = (int)($_POST['id'] ?? $_REQUEST['id'] ?? 0);
if ($id <= 0 || !isset($_FILES['proof'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'msg' => 'Invalid request.']);
    exit;
}

$f = $_FILES['proof'];
$ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
$dir = __DIR__ . '/../uploads/maintenance_proofs';
if (!is_dir($dir)) mkdir($dir, 0755, true);

$fname = 'proof_' . $id . '_' . time() . '.' . $ext;
$dest  = $dir . '/' . $fname;

if (move_uploaded_file($f['tmp_name'], $dest)) {
    // ✅ FIX: Save a CLEAN relative path without hardcoded project folders
    $relativePath = 'uploads/maintenance_proofs/' . $fname;

    $sql = "UPDATE public.maintenance_requests SET 
            proof_url = :url, 
            proof_image_url = :url, 
            updated_at = now() 
            WHERE id = :id AND assigned_to_id = :sid";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':url' => $relativePath, ':id' => $id, ':sid' => $uid]);

    echo json_encode(['ok' => true, 'url' => $relativePath]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'msg' => 'Failed to save file. Check folder permissions.']);
}