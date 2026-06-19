<?php
// api/schedule_delete.php
require __DIR__ . '/../auth.php';
require_role_json('admin_staff'); // ✅ Use JSON version for API safety

require __DIR__ . '/../supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

// ✅ ROBUST INPUT: Try POST first, then raw JSON body
$id = isset($_POST['id']) ? (int)$_POST['id'] : 0;

if ($id <= 0) {
    $json = json_decode(file_get_contents('php://input'), true);
    if (is_array($json)) {
        $id = isset($json['id']) ? (int)$json['id'] : 0;
    }
}

if ($id <= 0) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'msg' => 'Invalid or missing schedule ID']);
  exit;
}

try {
  $stmt = $pdo->prepare("DELETE FROM class_schedules WHERE id = :id");
  $stmt->execute([':id' => $id]);

  echo json_encode(['ok' => true, 'msg' => 'Schedule deleted']);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'ok'  => false,
    'msg' => 'Failed to delete schedule',
    'err' => $e->getMessage(),
  ]);
}