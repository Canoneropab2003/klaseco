<?php
// api/maintenance_delete.php
declare(strict_types=1);

require __DIR__ . '/../auth.php';
require_role_json('admin'); // Use JSON-safe auth for API calls
require __DIR__ . '/supabase_conn.php';

header('Content-Type: application/json; charset=utf-8');

/* ======================================================
   🚀 FIX FOR LIVE HOSTING: Robust Input Handling
====================================================== */
// 1. Try reading from standard $_POST first
$id = isset($_POST['id']) ? trim((string)$_POST['id']) : '';

// 2. FALLBACK: Read raw input if $_POST is empty (happens during 301 redirects)
if ($id === '') {
    $json = json_decode(file_get_contents('php://input'), true);
    if (is_array($json)) {
        $id = isset($json['id']) ? trim((string)$json['id']) : '';
    }
}

// Validation
if ($id === '' || !ctype_digit($id)) {
    http_response_code(400);
    echo json_encode([
        'ok'  => false,
        'msg' => 'Invalid maintenance record ID. Data may have been lost during redirect.',
        'debug_id_received' => $id // Helps verify what actually arrived
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare("DELETE FROM maintenance_users WHERE id = :id");
    $stmt->execute([':id' => (int)$id]);

    echo json_encode([
        'ok'  => true,
        'msg' => 'Maintenance account deleted.',
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'    => false,
        'msg'   => 'Failed to delete maintenance account.',
        'error' => $e->getMessage(),
    ]);
}