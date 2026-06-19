<?php
// api/admin_staff_delete.php
session_start();

require __DIR__ . '/../auth.php';
require_role('admin');

require __DIR__ . '/../supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

$data = $_POST;
if (empty($data)) {
    $json = json_decode(file_get_contents('php://input'), true);
    if (is_array($json)) {
        $data = $json;
    }
}

try {
    $id = isset($data['id']) ? (int)$data['id'] : 0;
    if ($id <= 0) {
        throw new Exception('Invalid admin staff ID.');
    }

    $stmt = $pdo->prepare("DELETE FROM admins WHERE id = :id");
    $stmt->execute([':id' => $id]);

    echo json_encode([
        'ok'  => true,
        'msg' => 'Admin staff deleted.',
    ]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'ok'    => false,
        'msg'   => 'Failed to delete admin staff.',
        'error' => $e->getMessage(),
    ]);
}
