<?php
declare(strict_types=1);

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

require __DIR__ . '/../auth.php';
require_role_json('maint_head');
require __DIR__ . '/supabase_conn.php';

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

$room = strtoupper(trim($data["room_code"] ?? ""));

// IMPORTANT: keep your filter_var (good), but accept boolean properly
$enabled = filter_var(
  $data["is_enabled"] ?? null,
  FILTER_VALIDATE_BOOLEAN,
  FILTER_NULL_ON_FAILURE
);

if ($room === '' || $enabled === null) {
  http_response_code(400);
  echo json_encode(["success" => false, "error" => "Missing or invalid room_code/is_enabled"]);
  exit;
}

try {
  $stmt = $pdo->prepare("
    insert into public.room_automation (room_code, is_enabled, updated_at)
    values (:room, :enabled, now())
    on conflict (room_code)
    do update set is_enabled = excluded.is_enabled, updated_at = now()
    returning room_code, is_enabled, updated_at
  ");

  // ✅ FORCE TYPES (this prevents false => '' issue)
  $stmt->bindValue(":room", $room, PDO::PARAM_STR);
  $stmt->bindValue(":enabled", $enabled, PDO::PARAM_BOOL);

  $stmt->execute();
  $row = $stmt->fetch(PDO::FETCH_ASSOC);

  echo json_encode(["success" => true, "data" => $row]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
