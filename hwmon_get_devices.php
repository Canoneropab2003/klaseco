<?php
// api/hwmon_get_devices.php
header('Content-Type: application/json');

require __DIR__ . '/supabase_conn.php';

try {
  $sql = "SELECT id, room_code, device_key, device_label, device_type,
                 monitor_status, last_active, last_error
          FROM public.hardware_monitor_devices
          WHERE is_active = true
          ORDER BY room_code, device_type, device_label";
  $stmt = $pdo->query($sql);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $counts = ["online" => 0, "offline" => 0, "error" => 0];
  foreach ($rows as $r) {
    $s = strtolower($r["monitor_status"] ?? "offline");
    if (isset($counts[$s])) $counts[$s]++;
  }

  echo json_encode([
    "success" => true,
    "counts"  => $counts,
    "data"    => $rows
  ]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
