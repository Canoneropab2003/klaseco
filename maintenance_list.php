<?php
// api/maintenance_list.php
declare(strict_types=1);

require __DIR__ . '/../auth.php';
require_role('admin'); // only admin
require __DIR__ . '/supabase_conn.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $sql = "
        SELECT
            id,
            maint_id,
            name,
            role,
            email,
            phone,      -- ✅ ensure this column is included
            username,
            created_at,
            updated_at
        FROM maintenance_users
        ORDER BY id ASC
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
        'ok'  => false,
        'msg' => 'Failed to load maintenance accounts.',
    ]);
}
