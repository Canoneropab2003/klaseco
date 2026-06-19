<?php
// api/teachers_delete.php  (Supabase / PDO)
require __DIR__ . '/../auth.php';
require_role('admin');

require __DIR__ . '/../supabase_conn.php';  // defines $pdo
header('Content-Type: application/json; charset=utf-8');

// accept either JSON or form
$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) {
  $in = $_POST;
}

$teacher_id = trim($in['teacher_id'] ?? '');  // e.g. "22-0417-642"
$id         = trim($in['id'] ?? '');          // optional numeric PK

if ($teacher_id === '' && $id === '') {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Missing id or teacher_id']); 
  exit;
}

try {
  if ($id !== '' && ctype_digit($id)) {
    $stmt = $pdo->prepare("DELETE FROM teachers WHERE id = :id");
    $stmt->execute([':id' => (int)$id]);
  } else {
    $stmt = $pdo->prepare("DELETE FROM teachers WHERE teacher_id = :teacher_id");
    $stmt->execute([':teacher_id' => $teacher_id]);
  }

  if ($stmt->rowCount() < 1) {
    echo json_encode(['ok' => false, 'error' => 'Not found']); 
    exit;
  }

  echo json_encode(['ok' => true]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'ok'    => false,
    'error' => $e->getMessage(),
  ]);
}
