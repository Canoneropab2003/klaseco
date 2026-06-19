<?php
// api/hardware_update_status.php
header('Content-Type: application/json');

require __DIR__ . '/supabase_conn.php'; // your existing PDO connection

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Invalid JSON"]);
    exit;
}

$deviceKey = $data['device_key'] ?? null;
$roomCode  = $data['room_code'] ?? null;
$status    = $data['status'] ?? null;

if (!$deviceKey || !in_array($status, ['on', 'off'], true)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Missing or invalid fields"]);
    exit;
}

try {
    // We only filter by device_key because it's UNIQUE
    $sql = "UPDATE public.hardware_devices
            SET status = :status,
                room_code = COALESCE(:room_code, room_code),
                updated_at = NOW()
            WHERE device_key = :device_key
            RETURNING id, device_key, room_code, status, updated_at";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':status'     => $status,
        ':device_key' => $deviceKey,
        ':room_code'  => $roomCode
    ]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "error"   => "Device not found for key: $deviceKey",
        ]);
        exit;
    }

    echo json_encode([
        "success" => true,
        "data"    => $row
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error"   => "DB error: " . $e->getMessage()
    ]);
}
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

