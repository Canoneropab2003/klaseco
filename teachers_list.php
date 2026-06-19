<?php
// api/teachers_list.php  (Supabase / PDO)
require __DIR__ . '/../supabase_conn.php';  // must define $pdo (PDO to Supabase)
header('Content-Type: application/json; charset=utf-8');

try {
  $sql = "
    SELECT
      id,
      teacher_id,
      email,
      name,
      phone,
      program,
      status,
      rfid,
      fingerprint_id,
      fingerprint_template,   -- ✅ NEW
      created_at,
      updated_at
    FROM teachers
    ORDER BY created_at DESC
  ";

  $stmt = $pdo->query($sql);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'ok'   => true,
    'rows' => $rows,
  ]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'ok'    => false,
    'msg'   => 'Server error while loading teachers.',
    'error' => $e->getMessage(),
  ]);
}
