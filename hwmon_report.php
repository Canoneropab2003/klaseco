<?php
// api/hwmon_report.php
declare(strict_types=1);

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

require __DIR__ . "/supabase_conn.php";

$raw = file_get_contents("php://input");
$body = json_decode($raw, true);

if (!is_array($body)) {
  http_response_code(400);
  echo json_encode(["success" => false, "error" => "Invalid JSON body"]);
  exit;
}

// Expect: { room_code: "A301", devices: [ {device_key, device_label, device_type, monitor_status, power_state, last_error}, ... ] }
$room_code = strtoupper(trim((string)($body["room_code"] ?? "")));
$devices   = $body["devices"] ?? null;

if ($room_code === "" || !is_array($devices) || count($devices) === 0) {
  http_response_code(400);
  echo json_encode(["success" => false, "error" => "room_code and devices[] required"]);
  exit;
}

$allowedStatus = ["online","offline","error"];
$allowedPower  = ["on","off"];
$allowedType   = ["light","fan","dht22","ldr","pir"];

try {
  $pdo->beginTransaction();

  $sql = "
    INSERT INTO public.hardware_monitor_devices
      (room_code, device_key, device_label, device_type, monitor_status, power_state, last_active, last_error, is_active)
    VALUES
      (:room_code, :device_key, :device_label, :device_type, :monitor_status, :power_state,
       CASE WHEN :monitor_status = 'online' THEN now() ELSE NULL END,
       :last_error, true)
    ON CONFLICT (device_key) DO UPDATE SET
      room_code      = EXCLUDED.room_code,
      device_label   = EXCLUDED.device_label,
      device_type    = EXCLUDED.device_type,
      monitor_status = EXCLUDED.monitor_status,
      power_state    = EXCLUDED.power_state,
      last_error     = EXCLUDED.last_error,
      last_active    = CASE
                        WHEN EXCLUDED.monitor_status = 'online' THEN now()
                        ELSE public.hardware_monitor_devices.last_active
                      END,
      is_active      = true
    RETURNING device_key, monitor_status, power_state, last_active, last_error
  ";
  $stmt = $pdo->prepare($sql);

  $out = [];

  foreach ($devices as $d) {
    if (!is_array($d)) continue;

    $device_key   = trim((string)($d["device_key"] ?? ""));
    $device_label = trim((string)($d["device_label"] ?? $device_key));
    $device_type  = strtolower(trim((string)($d["device_type"] ?? "")));
    $status       = strtolower(trim((string)($d["monitor_status"] ?? "online")));
    $power_state  = strtolower(trim((string)($d["power_state"] ?? "off")));
    $last_error   = $d["last_error"] ?? null;

    if ($device_key === "" || $device_type === "") continue;

    if (!in_array($device_type, $allowedType, true)) $device_type = "light";
    if (!in_array($status, $allowedStatus, true)) $status = "online";
    if (!in_array($power_state, $allowedPower, true)) $power_state = "off";

    if ($last_error !== null) {
      $last_error = trim((string)$last_error);
      if ($last_error === "") $last_error = null;
    }

    $stmt->execute([
      ":room_code"      => $room_code,
      ":device_key"     => $device_key,
      ":device_label"   => $device_label,
      ":device_type"    => $device_type,
      ":monitor_status" => $status,
      ":power_state"    => $power_state,
      ":last_error"     => $last_error,
    ]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) $out[] = $row;
  }

  $pdo->commit();
  echo json_encode(["success" => true, "updated" => $out]);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
