<?php
// api/schedule_create.php
require __DIR__ . '/../auth.php';
require_role_json('admin_staff'); 

require __DIR__ . '/../supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

// ✅ ROBUST INPUT: Check both POST and php://input
$data = $_POST;
if (empty($data)) {
    $json = json_decode(file_get_contents('php://input'), true);
    if (is_array($json)) $data = $json;
}

$days        = trim((string)($data['days'] ?? ''));
$start_time  = trim((string)($data['start_time'] ?? ''));
$end_time    = trim((string)($data['end_time'] ?? ''));
$teacher     = trim((string)($data['teacher_name'] ?? ''));
$subject     = trim((string)($data['subject_code'] ?? ''));
$room        = trim((string)($data['room'] ?? ''));

// Basic validation
if ($days === '' || $start_time === '' || $end_time === '' || $teacher === '' || $subject === '' || $room === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'msg' => 'Please complete all required fields.']);
    exit;
}

try {
    // 1️⃣ RULE: UNIQUE SUBJECT CODE PER TEACHER
    $stmtSub = $pdo->prepare("SELECT id FROM class_schedules WHERE teacher_name = :t AND subject_code = :s LIMIT 1");
    $stmtSub->execute([':t' => $teacher, ':s' => $subject]);
    if ($stmtSub->fetch()) {
        echo json_encode(['ok' => false, 'msg' => "Error: $teacher is already assigned to $subject."]);
        exit;
    }

    // 2️⃣ RULE: STRICT TIME CONFLICT CHECK
    // Fetch all existing schedules for this specific teacher
    $stmtConflict = $pdo->prepare("SELECT days, start_time, end_time FROM class_schedules WHERE teacher_name = :t");
    $stmtConflict->execute([':t' => $teacher]);
    $existing = $stmtConflict->fetchAll(PDO::FETCH_ASSOC);

    $newStart = strtotime($start_time);
    $newEnd   = strtotime($end_time);
    $newDays  = str_split($days); // e.g. "MWF" -> ['M', 'W', 'F']

    foreach ($existing as $row) {
        $overlapDay = false;
        foreach ($newDays as $d) {
            // Check if any character in the new days string exists in the stored days string
            if (strpos($row['days'], $d) !== false) {
                $overlapDay = true;
                break;
            }
        }

        if ($overlapDay) {
            $oldStart = strtotime($row['start_time']);
            $oldEnd   = strtotime($row['end_time']);

            // Overlap formula: (StartA < EndB) AND (EndA > StartB)
            if ($newStart < $oldEnd && $newEnd > $oldStart) {
                echo json_encode([
                    'ok' => false, 
                    'msg' => "Error: Time conflict! Teacher is already scheduled on these days during this time."
                ]);
                exit;
            }
        }
    }

    // 3️⃣ IF NO CONFLICTS, PROCEED TO INSERT
    $sql = "
      INSERT INTO class_schedules
        (days, start_time, end_time, teacher_name, subject_code, room)
      VALUES
        (:days, :start_time, :end_time, :teacher_name, :subject_code, :room)
      RETURNING id, days, start_time, end_time, teacher_name, subject_code, room, created_at
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':days'         => $days,
        ':start_time'   => $start_time,
        ':end_time'     => $end_time,
        ':teacher_name' => $teacher,
        ':subject_code' => $subject,
        ':room'         => $room,
    ]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'ok'      => true,
        'msg'     => 'Class schedule created successfully.',
        'schedule'=> $row,
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'    => false,
        'msg'   => 'Failed to create class schedule.',
        'error' => $e->getMessage(),
    ]);
}