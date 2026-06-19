<?php
// api/hwmon_heartbeat.php
declare(strict_types=1);

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

require __DIR__ . '/supabase_conn.php';

$raw  = file_get_contents("php://input");
$body = json_decode($raw, true);

$device_key = trim((string)($body["device_key"] ?? ""));
$status     = strtolower(trim((string)($body["monitor_status"] ?? "online"))); // online/offline/error
$error      = $body["last_error"] ?? null;

if ($device_key === "") {
  http_response_code(400);
  echo json_encode(["success" => false, "error" => "device_key required"]);
  exit;
}

// ✅ allow only valid statuses
$allowed = ["online", "offline", "error"];
if (!in_array($status, $allowed, true)) {
  $status = "online";
}

// normalize error
if ($error !== null) {
  $error = trim((string)$error);
  if ($error === "") $error = null;
}

try {
  // ✅ only update last_active when ONLINE (because "online = ON state")
  if ($status === "online") {
    $sql = "
      UPDATE public.hardware_monitor_devices
      SET monitor_status = :status,
          last_active = now(),
          last_error = :err
      WHERE device_key = :key
    ";
  } else {
    $sql = "
      UPDATE public.hardware_monitor_devices
      SET monitor_status = :status,
          last_error = :err
      WHERE device_key = :key
    ";
  }

  $stmt = $pdo->prepare($sql);
  $stmt->execute([
    ":status" => $status,
    ":err"    => $error,
    ":key"    => $device_key
  ]);

  // ✅ if device_key not found, return helpful error
  if ($stmt->rowCount() === 0) {
    http_response_code(404);
    echo json_encode([
      "success" => false,
      "error" => "device_key not found in hardware_monitor_devices: {$device_key}"
    ]);
    exit;
  }

  echo json_encode(["success" => true, "device_key" => $device_key, "monitor_status" => $status]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
