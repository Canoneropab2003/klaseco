<?php
// api/get_teachers.php
declare(strict_types=1);

require __DIR__ . '/supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $sql = "
        SELECT
            id,
            teacher_id,
            name,
            program,
            rfid,
            fingerprint_id,
            status
        FROM teachers
        -- allow any status for now, or keep only active/NULL if you want:
        -- WHERE status IS NULL OR LOWER(status) = 'active'
        ORDER BY name ASC
    ";
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Optional: quick debug
    // file_put_contents('debug_teachers.log', print_r($rows, true));

    echo json_encode([
        'ok'   => true,
        'rows' => $rows
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'  => false,
        'msg' => 'Failed to load teachers: ' . $e->getMessage()
    ]);
}
