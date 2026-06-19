<?php
// api/schedule_list.php
require __DIR__ . '/../auth.php';
//require_role_json('admin_staff'); 

require __DIR__ . '/../supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

// ✅ ADDED: Clear buffer to prevent accidental text from breaking JSON
if (ob_get_length()) ob_clean();

try {
    $sql = "
      SELECT
        id,
        days,
        start_time,
        end_time,
        teacher_name,
        subject_code,
        room,
        created_at
      FROM class_schedules
      ORDER BY created_at ASC, id ASC
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
        'msg'   => 'Server error while loading class schedules.',
        'error' => $e->getMessage(),
    ]);
}
