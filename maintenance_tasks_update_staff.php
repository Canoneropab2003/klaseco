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

// Read JSON body
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

$id         = (int)($data['id'] ?? 0);
$status     = trim((string)($data['status'] ?? ''));
$work_notes = trim((string)($data['work_notes'] ?? ''));

if ($id <= 0) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'msg' => 'Invalid task id.']);
  exit;
}

// Validate allowed statuses (must match your CHECK constraint)
$allowed = ['pending', 'in progress', 'resolved'];
if ($status !== '' && !in_array($status, $allowed, true)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'msg' => 'Invalid status value.']);
  exit;
}

// ✅ FULL UPDATE QUERY (NOT just WHERE)
$sql = "
UPDATE public.maintenance_requests
SET
  status = :status,
  work_notes = :work_notes,
  updated_at = now()
WHERE id = :id
  AND assigned_to_id = :sid
";

try {
  $stmt = $pdo->prepare($sql);
  $stmt->execute([
    ':status'     => ($status === '' ? 'pending' : $status),
    ':work_notes' => $work_notes,
    ':id'         => $id,
    ':sid'        => $uid,
  ]);

  if ($stmt->rowCount() === 0) {
    // Not assigned to this staff OR task not found
    http_response_code(403);
    echo json_encode(['ok' => false, 'msg' => 'Not allowed or task not found.']);
    exit;
  }

  echo json_encode(['ok' => true]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'msg' => 'Failed to update task.', 'error' => $e->getMessage()]);
}
