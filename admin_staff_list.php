<?php
// api/admin_staff_list.php
session_start();

require __DIR__ . '/../auth.php';
require_role('admin'); // only main admin can manage admin staff

require __DIR__ . '/../supabase_conn.php'; // gives $pdo
header('Content-Type: application/json; charset=utf-8');

try {
    $sql = "
      SELECT
        id,
        staff_id,
        name,
        position,
        email,
        phone,
        username,
        created_at
      FROM admins
      WHERE role = 'staff'             -- 👈 only show staff accounts
      ORDER BY staff_id ASC, name ASC
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
        'msg'   => 'Failed to load admin staff.',
        'error' => $e->getMessage(),
    ]);
}
