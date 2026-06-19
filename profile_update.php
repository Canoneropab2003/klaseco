<?php
declare(strict_types=1);

require __DIR__ . '/../auth.php';
require_auth_json();

require __DIR__ . '/supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

function fail(int $c, string $m){
  http_response_code($c);
  echo json_encode(["ok"=>false,"error"=>$m]);
  exit;
}

$uid  = (int)($_SESSION['uid'] ?? 0);
$role = (string)($_SESSION['role'] ?? '');

if ($uid <= 0) fail(401, "Not authenticated");

$isMaint = in_array($role, ['maint_head','maint_staff'], true);
$table   = $isMaint ? "public.maintenance_users" : "public.admins";

$name     = trim($_POST['name'] ?? '');
$email    = trim($_POST['email'] ?? '');
$username = trim($_POST['username'] ?? '');

if ($name === '') fail(422, "Name is required");

/* =======================
   Avatar upload
======================= */
$avatarUrl = null;

if (!empty($_FILES['avatar']) && $_FILES['avatar']['error'] !== UPLOAD_ERR_NO_FILE) {
  if ($_FILES['avatar']['error'] !== UPLOAD_ERR_OK) fail(400, "Upload error");

  $allowed = ["image/jpeg"=>"jpg","image/png"=>"png","image/webp"=>"webp"];
  $mime = mime_content_type($_FILES['avatar']['tmp_name']);
  if (!isset($allowed[$mime])) fail(422, "Invalid image type");

  if ($_FILES['avatar']['size'] > 2*1024*1024) fail(422, "Max 2MB");

  $dir = __DIR__ . '/../uploads';
  if (!is_dir($dir)) mkdir($dir, 0755, true);

  $file = "avatar_" . ($isMaint?'maint':'admin') . "_{$uid}_" . bin2hex(random_bytes(4)) . "." . $allowed[$mime];
  move_uploaded_file($_FILES['avatar']['tmp_name'], "$dir/$file");
  $avatarUrl = "uploads/$file";
}

/* =======================
   Build update
======================= */
$fields = ["name = :name"];
$params = [":name"=>$name, ":id"=>$uid];

if ($email !== '')    { $fields[] = "email = :email"; $params[":email"] = $email; }
if ($username !== '') { $fields[] = "username = :username"; $params[":username"] = $username; }
if ($avatarUrl)       { $fields[] = "avatar_url = :avatar"; $params[":avatar"] = $avatarUrl; }

$sql = "UPDATE {$table} SET ".implode(", ", $fields)." WHERE id = :id RETURNING *";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);

echo json_encode(["ok"=>true,"data"=>$stmt->fetch(PDO::FETCH_ASSOC)]);
