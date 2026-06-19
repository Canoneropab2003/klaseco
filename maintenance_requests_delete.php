<?php
// api/maintenance_requests_delete.php
declare(strict_types=1);

require __DIR__ . '/../auth.php';
require_auth_json(); // Ensure only logged-in users can delete

require __DIR__ . '/supabase_conn.php';

// ✅ CRITICAL: Clear buffer to ensure no warnings break the JSON output
if (ob_get_length()) ob_clean();
header('Content-Type: application/json; charset=utf-8');

try {
    /* ======================================================
       🚀 ROBUST DATA CAPTURE
    ====================================================== */
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);

    // Fallback if the redirect stripped the JSON body
    if (!is_array($data) || empty($data)) {
        $data = !empty($_POST) ? $_POST : $_REQUEST;
    }

    $id = isset($data['id']) ? (int)$data['id'] : 0;

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'msg' => 'Invalid or missing ID. Data may have been lost in redirect.']);
        exit;
    }

    $stmt = $pdo->prepare("DELETE FROM maintenance_requests WHERE id = :id");
    $stmt->execute([':id' => $id]);

    echo json_encode([
        'ok'  => true,
        'msg' => 'Maintenance request deleted.'
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'  => false,
        'msg' => 'Server error: ' . $e->getMessage()
    ]);
}