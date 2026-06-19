<?php
// api/maintenance_users_list.php
declare(strict_types=1);

require __DIR__ . '/../supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

try {
    $sql = "
        SELECT
            id,
            maint_id,
            name,
            email,
            phone,
            role,
            status,
            created_at,
            updated_at
        FROM public.maintenance_users
        WHERE lower(role) = 'maintenance staff'
          AND status = 'active'
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
        'ok'    => false,
        'msg'   => 'Server error while loading maintenance staff.',
        'error' => $e->getMessage()
    ]);
}
