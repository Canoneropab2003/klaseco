<?php
// api/get_maintenance_technicians.php
declare(strict_types=1);

require __DIR__ . '/supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $sql = "
        SELECT
          id,
          maint_id,
          name,
          role
        FROM maintenance_users
        WHERE status = 'active'
          AND role = 'Maintenance Staff'
        ORDER BY name ASC
    ";

    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'ok'   => true,
        'rows' => $rows
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'  => false,
        'msg' => 'Failed to load technicians'
    ]);
}
