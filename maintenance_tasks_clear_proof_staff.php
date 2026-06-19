<?php
session_start();
header('Content-Type: application/json');
require __DIR__ . '/supabase_conn.php';

$uid  = (int)($_SESSION['uid'] ?? 0);
$role = $_SESSION['role'] ?? '';

if (!$uid || !in_array($role, ['maint_staff', 'maintenance_staff'], true)) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'msg' => 'Missing staff session.']);
  exit;
}

$raw  = file_get_contents("php://input");
$data = json_decode($raw, true);

$id = (int)($data['id'] ?? 0);
if ($id <= 0) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'msg' => 'Invalid task id.']);
  exit;
}

$sql = "
UPDATE public.maintenance_requests
SET
  proof_url = NULL,
  proof_image_url = NULL,
  proof_uploaded_at = NULL,
  proof_uploaded_by_id = NULL,
  proof_uploaded_by_name = NULL,
  updated_at = now()
WHERE id = :id
  AND assigned_to_id = :sid
";

try {
  $stmt = $pdo->prepare($sql);
  $stmt->execute([
    ':id'  => $id,
    ':sid' => $uid
  ]);

  if ($stmt->rowCount() === 0) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'msg' => 'Not allowed or task not found.']);
    exit;
  }

  echo json_encode(['ok' => true]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'msg' => 'Failed to clear proof.', 'error' => $e->getMessage()]);
}
