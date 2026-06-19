<?php
declare(strict_types=1);

require __DIR__ . '/../auth.php';
require_auth_json();

require __DIR__ . '/supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

$uid  = (int)($_SESSION['uid'] ?? 0);
$role = (string)($_SESSION['role'] ?? '');

if ($uid <= 0) {
  http_response_code(401);
  echo json_encode(["ok"=>false,"error"=>"Not authenticated"]);
  exit;
}

try {
  if (in_array($role, ['maint_head','maint_staff'], true)) {
    // Maintenance users
    $stmt = $pdo->prepare("
      SELECT
        id,
        maint_id AS staff_id,
        name,
        email,
        username,
        role,
        avatar_url,
        created_at,
        updated_at,
        status AS account_status,
        last_login_at -- ✅ Changed from NULL::timestamptz
      FROM public.maintenance_users
      WHERE id = :id
      LIMIT 1
    ");
  } else {
    // Admin / Academic / Staff (Already fetching last_login_at)
    $stmt = $pdo->prepare("
      SELECT
        id,
        staff_id,
        name,
        email,
        username,
        role,
        avatar_url,
        created_at,
        account_status,
        last_login_at
      FROM public.admins
      WHERE id = :id
      LIMIT 1
    ");
  }

  $stmt->execute([":id"=>$uid]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$user) {
    http_response_code(404);
    echo json_encode(["ok"=>false,"error"=>"Account not found"]);
    exit;
  }

  echo json_encode(["ok"=>true,"data"=>$user]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["ok"=>false,"error"=>"Server error"]);
}
