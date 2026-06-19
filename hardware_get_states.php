<?php
// api/hardware_get_states.php
header("Content-Type: application/json");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

require __DIR__ . '/supabase_conn.php';

try {
    $sql = "SELECT device_key, status FROM public.hardware_devices ORDER BY device_key";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "data"    => $rows
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error"   => "DB error: " . $e->getMessage()
    ]);
}
