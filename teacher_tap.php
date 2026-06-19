<?php
// api/teacher_tap.php
declare(strict_types=1);

require __DIR__ . '/supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

try {
    // ✅ Ensure Manila time for swipe_ts
    date_default_timezone_set('Asia/Manila');

    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true) ?? [];

    $teacherId     = isset($data['teacher_id']) ? (int)$data['teacher_id'] : 0;
    $rfid          = trim($data['rfid'] ?? '');
    $fingerprintId = trim($data['fingerprint_id'] ?? '');
    $roomCode      = trim($data['room'] ?? '');
    $subjectCode   = trim($data['subject_code'] ?? ''); // ✅ New field from MainFunctions.js

    if ($teacherId <= 0 || $rfid === '' || $fingerprintId === '' || $roomCode === '' || $subjectCode === '') {
        http_response_code(400);
        echo json_encode([
            'ok'  => false,
            'msg' => 'Missing required fields (teacher_id, rfid, fingerprint_id, room, subject_code).'
        ]);
        exit;
    }

    // 1) Load teacher + validate RFID
    $sqlTeacher = "SELECT id, name, program, rfid FROM teachers WHERE id = :id LIMIT 1";
    $stmt = $pdo->prepare($sqlTeacher);
    $stmt->execute([':id' => $teacherId]);
    $teacher = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$teacher) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'msg' => 'Teacher not found.']);
        exit;
    }

    if (trim((string)$teacher['rfid']) !== $rfid) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'msg' => 'RFID mismatch.']);
        exit;
    }

    $teacherPkId = (int)$teacher['id'];
    $todayDate   = date('Y-m-d');

    // 2) Check if an attendance record already exists for this teacher + subject + today
    // We look for any record for this specific subject instance today.
    $sqlCheck = "
        SELECT id, status 
        FROM attendance 
        WHERE teacher_id = :teacher_id 
          AND subject_code = :subject_code 
          AND swipe_ts::date = :today
        ORDER BY swipe_ts DESC 
        LIMIT 1
    ";
    $stmtCheck = $pdo->prepare($sqlCheck);
    $stmtCheck->execute([
        ':teacher_id'   => $teacherPkId,
        ':subject_code' => $subjectCode,
        ':today'        => $todayDate
    ]);
    $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    $newStatus = 'IN'; // Default to IN if no record exists

    // 3) Apply Strict Once-Per-Subject Logic
    if ($existing) {
        if (strtolower((string)$existing['status']) === 'in') {
            // If they are currently IN, this tap becomes an OUT
            $newStatus = 'OUT';
        } else {
            // If they are already OUT, they have finished this subject's cycle. Block 3rd tap.
            http_response_code(403);
            echo json_encode([
                'ok'  => false,
                'msg' => "Attendance already completed for $subjectCode today."
            ]);
            exit;
        }
    }

    // 4) Insert the attendance row
    $swipeTs = date('Y-m-d H:i:s');
    $sqlInsert = "
        INSERT INTO attendance
          (teacher_id, rfid, status, swipe_ts, room_code, source, teacher_name, program, subject_code)
        VALUES
          (:teacher_id, :rfid, :status, :swipe_ts, :room_code, 'RFID+FP', :teacher_name, :program, :subject_code)
        RETURNING id, swipe_ts, status
    ";

    $stmtIns = $pdo->prepare($sqlInsert);
    $stmtIns->execute([
        ':teacher_id'   => $teacherPkId,
        ':rfid'         => $rfid,
        ':status'       => $newStatus,
        ':swipe_ts'     => $swipeTs,
        ':room_code'    => $roomCode,
        ':teacher_name' => $teacher['name'],
        ':program'      => $teacher['program'],
        ':subject_code' => $subjectCode
    ]);
    $ins = $stmtIns->fetch(PDO::FETCH_ASSOC);

    // 5) Fetch updated counts for the day
    $sqlCount = "
        SELECT
          SUM(CASE WHEN lower(status)='in'  THEN 1 ELSE 0 END) AS in_count,
          SUM(CASE WHEN lower(status)='out' THEN 1 ELSE 0 END) AS out_count
        FROM attendance
        WHERE teacher_id = :teacher_id
          AND swipe_ts::date = CURRENT_DATE
    ";
    $stmtCount = $pdo->prepare($sqlCount);
    $stmtCount->execute([':teacher_id' => $teacherPkId]);
    $counts = $stmtCount->fetch(PDO::FETCH_ASSOC) ?: ['in_count'=>0,'out_count'=>0];

    $swipeHuman = date('h:i A', strtotime((string)($ins['swipe_ts'] ?? $swipeTs)));

    echo json_encode([
        'ok' => true,
        'attendance' => [
            'id'             => $ins['id'] ?? null,
            'status'          => $ins['status'] ?? $newStatus,
            'swipe_ts_human'  => $swipeHuman,
            'subject_code'    => $subjectCode,
            'room_code'       => $roomCode
        ],
        'today_counts' => [
            'in'  => (int)$counts['in_count'],
            'out' => (int)$counts['out_count'],
        ],
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'  => false,
        'msg' => 'Server error: ' . $e->getMessage(),
    ]);
}