<?php
declare(strict_types=1);

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

require __DIR__ . '/supabase_conn.php';

$room = strtoupper(trim($_GET['room'] ?? ''));
if ($room === '') {
  http_response_code(400);
  echo json_encode(["success" => false, "error" => "Missing room"]);
  exit;
}

try {
  $stmt = $pdo->prepare("SELECT room_code, is_enabled FROM public.room_automation WHERE room_code = :room LIMIT 1");
  $stmt->execute([":room" => $room]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$row) {
    // auto-create if missing
    $ins = $pdo->prepare("INSERT INTO public.room_automation(room_code,is_enabled) VALUES(:room,false) RETURNING room_code,is_enabled");
    $ins->execute([":room" => $room]);
    $row = $ins->fetch(PDO::FETCH_ASSOC);
  }

  echo json_encode([
    "success" => true,
    "data" => [
      "room_code" => $row["room_code"],
      "is_enabled" => (bool)$row["is_enabled"]
    ]
  ]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
