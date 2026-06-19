<?php
// api/maintenance_requests_save.php
declare(strict_types=1);

require __DIR__ . '/supabase_conn.php';

// ✅ Ensure no accidental output before headers
if (ob_get_length()) ob_clean();
header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Try reading from php://input
    $rawBody = file_get_contents('php://input');
    $data = json_decode($rawBody, true);

    // 2. FALLBACK: check $_POST (common if server redirects JSON body to form body)
    if (!is_array($data) || empty($data)) {
        $data = !empty($_POST) ? $_POST : $_REQUEST;
    }

    if (!is_array($data) || empty($data)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'msg' => 'No data received. Body may have been lost during server redirect.']);
        exit;
    }

    // Extract fields from the unified $data variable
    $id             = isset($data['id']) ? (int)$data['id'] : 0;
    $issueTitle     = trim((string)($data['issue_title'] ?? ''));
    $roomCode       = trim((string)($data['room_code'] ?? ''));
    $priority       = trim((string)($data['priority'] ?? ''));
    $status         = trim((string)($data['status'] ?? ''));
    $assignedId     = isset($data['assigned_to_id']) ? (int)$data['assigned_to_id'] : 0;
    $assignedName   = trim((string)($data['assigned_to_name'] ?? ''));
    $description    = trim((string)($data['description'] ?? ''));
    $reportedBy     = trim((string)($data['reported_by'] ?? ''));
    $workNotes      = trim((string)($data['work_notes'] ?? ''));

    if ($id <= 0) {
    if ($issueTitle === '' || $roomCode === '' || $priority === '' || $status === '') {
        http_response_code(400);
        echo json_encode([
            'ok'  => false,
            'msg' => 'Missing required fields for new request.'
        ]);
        exit;
    }
} else {
    // For updates, we at least need ID and Status
    if ($status === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'msg' => 'Status is required for updates.']);
        exit;
    }
}

    $allowedPriority = ['low','medium','high'];
    $allowedStatus   = ['pending','in progress','resolved'];

    if (!in_array(strtolower($priority), $allowedPriority, true)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'msg' => 'Invalid priority.']);
        exit;
    }
    if (!in_array(strtolower($status), $allowedStatus, true)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'msg' => 'Invalid status.']);
        exit;
    }

    // Normalize
    $priority = strtolower($priority);
    $status   = strtolower($status);

    if ($reportedBy === '') {
        $reportedBy = 'KLASECO Facilities Supervisor';
    }

    // If assignedToId given but no name, look it up
    if ($assignedId > 0 && $assignedName === '') {
        $sqlTech = "SELECT name FROM maintenance_users WHERE id = :id AND status = 'active'";
        $stmtT   = $pdo->prepare($sqlTech);
        $stmtT->execute([':id' => $assignedId]);
        $rowT    = $stmtT->fetch(PDO::FETCH_ASSOC);
        if ($rowT) {
            $assignedName = $rowT['name'];
        }
    }

    if ($id > 0) {
        // ✅ FIX 1: Allow partial data for updates (Status is mandatory, others optional)
        if ($status === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'msg' => 'Status is required for updates.']);
            exit;
        }

        // ✅ FIX 2: Use COALESCE to preserve existing data and fix the :description error
        $sql = "
          UPDATE maintenance_requests
          SET
            issue_title       = COALESCE(NULLIF(:issue_title, ''), issue_title),
            room_code         = COALESCE(NULLIF(:room_code, ''), room_code),
            priority          = COALESCE(NULLIF(:priority, ''), priority),
            status            = :status,
            assigned_to_id    = COALESCE(:assigned_to_id, assigned_to_id),
            assigned_to_name  = COALESCE(:assigned_to_name, assigned_to_name),
            description       = COALESCE(NULLIF(:description, ''), description),
            work_notes        = :work_notes,
            reported_by       = COALESCE(NULLIF(:reported_by, ''), reported_by),
            updated_at        = NOW()
          WHERE id = :id
          RETURNING *
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
          ':id'               => $id,
          ':issue_title'      => $issueTitle,
          ':room_code'        => $roomCode,
          ':priority'         => $priority,
          ':status'           => $status,
          ':assigned_to_id'   => $assignedId ?: null,
          ':assigned_to_name' => $assignedName ?: null,
          ':description'      => $description, // Now matches a placeholder in SET
          ':work_notes'       => $workNotes,
          ':reported_by'      => $reportedBy,
        ]);
    } else {
        // INSERT
        $sql = "
          INSERT INTO maintenance_requests
            (issue_title, room_code, priority, status,
             assigned_to_id, assigned_to_name, description, reported_by)
          VALUES
            (:issue_title, :room_code, :priority, :status,
             :assigned_to_id, :assigned_to_name, :description, :reported_by)
          RETURNING *
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
          ':issue_title'      => $issueTitle,
          ':room_code'        => $roomCode,
          ':priority'         => $priority,
          ':status'           => $status,
          ':assigned_to_id'   => $assignedId ?: null,
          ':assigned_to_name' => $assignedName ?: null,
          ':description'      => $description ?: null,
          ':reported_by'      => $reportedBy,
        ]);
    }

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'ok'   => true,
        'row'  => $row,
        'msg'  => $id > 0 ? 'Maintenance request updated.' : 'Maintenance request created.'
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'  => false,
        'msg' => 'Server error: ' . $e->getMessage()
    ]);
}