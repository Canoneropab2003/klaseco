<?php
// api/maintenance_requests_list.php
declare(strict_types=1);

// Use auth helpers that return JSON instead of redirecting to login.php
require __DIR__ . '/../auth.php';
require_auth_json(); 

require __DIR__ . '/supabase_conn.php';

// ✅ ADDED: Clear buffer to prevent accidental text from breaking JSON
if (ob_get_length()) ob_clean(); 
header('Content-Type: application/json; charset=utf-8');

try {
  $uid  = (int)($_SESSION['uid'] ?? 0);
  $role = (string)($_SESSION['role'] ?? '');

  // Roles
  $isAdmin = in_array($role, ['admin', 'maint_head', 'maintenance_head'], true);
  $isStaff = in_array($role, ['maint_staff', 'maintenance_staff'], true);

  if (!$uid || (!$isAdmin && !$isStaff)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'msg' => 'Unauthorized']);
    exit;
  }

  // Filters
  $id       = (int)($_GET['id'] ?? 0);
  $status   = isset($_GET['status'])   ? trim((string)$_GET['status'])   : '';
  $priority = isset($_GET['priority']) ? trim((string)$_GET['priority']) : '';
  $search   = isset($_GET['search'])   ? trim((string)$_GET['search'])   : '';

  $params = [];
  $where  = [];

  // ✅ Staff only sees assigned tasks
  if ($isStaff) {
    $where[] = "mr.assigned_to_id = :sid";
    $params[':sid'] = $uid;
  }

  // ✅ If you still want "today only", keep this line.
  // BUT it will hide older tasks from staff.
  // $where[] = "mr.created_at::date = CURRENT_DATE";

  if ($id > 0) {
    $where[] = "mr.id = :id";
    $params[':id'] = $id;
  }

  if ($status !== '') {
    $where[] = "lower(mr.status) = lower(:status)";
    $params[':status'] = $status;
  }

  if ($priority !== '') {
    $where[] = "lower(mr.priority) = lower(:priority)";
    $params[':priority'] = $priority;
  }

  if ($search !== '') {
    $where[] = "(
      lower(mr.issue_title) LIKE lower(:search) OR
      lower(mr.room_code)   LIKE lower(:search) OR
      lower(mr.reported_by) LIKE lower(:search) OR
      lower(COALESCE(mu.name, mr.assigned_to_name)) LIKE lower(:search)
    )";
    $params[':search'] = '%' . $search . '%';
  }

  $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

  // ✅ Include work_notes + proof url so modal can retrieve them
  $sql = "
    SELECT
      mr.id,
      mr.issue_title,
      mr.room_code,
      mr.priority,
      mr.status,
      mr.description,
      mr.reported_by,
      mr.assigned_to_id,
      COALESCE(mu.name, mr.assigned_to_name) AS assigned_to_name,
      mr.work_notes,
      COALESCE(mr.proof_image_url, mr.proof_url) AS proof_image_url,
      mr.proof_uploaded_at,
      mr.created_at,
      mr.updated_at
    FROM maintenance_requests mr
    LEFT JOIN maintenance_users mu
      ON mu.id = mr.assigned_to_id
    $whereSql
    ORDER BY mr.created_at DESC, mr.id DESC
  ";

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['ok' => true, 'rows' => $rows]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'ok' => false,
    'msg' => 'Failed to load maintenance requests',
    'error' => $e->getMessage()
  ]);
}
