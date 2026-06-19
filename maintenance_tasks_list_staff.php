<?php
// api/maintenance_tasks_list_staff.php
declare(strict_types=1);

require __DIR__ . '/../auth.php';
require_role_json('maint_staff'); // Staff only
require __DIR__ . '/../supabase_conn.php';

if (ob_get_length()) ob_clean(); // Wipe accidental warnings
header('Content-Type: application/json; charset=utf-8');

try {
    // Ensure we use the standard session ID
    $staffId = (int)($_SESSION['uid'] ?? 0);

    if ($staffId <= 0) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'msg' => 'Missing staff session.']);
        exit;
    }

    $status   = isset($_GET['status']) ? trim((string)$_GET['status']) : '';
    $priority = isset($_GET['priority']) ? trim((string)$_GET['priority']) : '';
    $search   = isset($_GET['search']) ? trim((string)$_GET['search']) : '';

    $params = [':sid' => $staffId];
    $where  = ["mr.assigned_to_id = :sid"]; // Only show tasks assigned to this staff member

    if ($status !== '') {
        $where[] = "lower(mr.status) = lower(:status)";
        $params[':status'] = $status;
    }
    if ($priority !== '') {
        $where[] = "lower(mr.priority) = lower(:priority)";
        $params[':priority'] = $priority;
    }
    if ($search !== '') {
        $where[] = "(lower(mr.issue_title) LIKE lower(:search) OR lower(mr.room_code) LIKE lower(:search))";
        $params[':search'] = '%' . $search . '%';
    }

    $whereSql = 'WHERE ' . implode(' AND ', $where);

    $sql = "
        SELECT
            mr.id, mr.issue_title, mr.room_code, mr.priority, mr.status,
            mr.reported_by, mr.assigned_to_id, mr.assigned_to_name,
            mr.created_at, mr.updated_at, mr.work_notes,
            COALESCE(mr.proof_image_url, mr.proof_url) AS proof_image_url
        FROM public.maintenance_requests mr
        $whereSql
        ORDER BY mr.created_at DESC, mr.id DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['ok' => true, 'rows' => $rows]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'msg' => 'Server error loading tasks.', 'error' => $e->getMessage()]);
}