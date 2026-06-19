<?php
declare(strict_types=1);

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

require __DIR__ . '/supabase_conn.php';

// seconds since last_active before marking offline
$timeout = (int)($_GET["timeout"] ?? 15);
if ($timeout < 5) $timeout = 5;

try {
  $stmt = $pdo->prepare("
    UPDATE public.hardware_monitor_devices
    SET monitor_status = 'offline'
    WHERE is_active = true
      AND (last_active IS NULL OR last_active < now() - (:t || ' seconds')::interval)
      AND monitor_status <> 'offline'
  ");
  $stmt->execute([":t" => $timeout]);

  echo json_encode(["success" => true, "timeout" => $timeout]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
