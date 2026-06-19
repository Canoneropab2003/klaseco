<?php
// api/teacher_auth.php
declare(strict_types=1);

require __DIR__ . '/supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true) ?? [];

    $type = strtolower(trim($data['type'] ?? ''));
    $code = trim($data['code'] ?? '');
    $room = trim($data['room'] ?? '');

    if ($type === '' || $code === '') {
        http_response_code(400);
        echo json_encode([
            'ok'  => false,
            'msg' => 'Missing type or code.'
        ]);
        exit;
    }

    if (!in_array($type, ['rfid', 'fingerprint'], true)) {
        http_response_code(400);
        echo json_encode([
            'ok'  => false,
            'msg' => 'Invalid type. Use "rfid" or "fingerprint".'
        ]);
        exit;
    }

    if ($type === 'rfid') {
        $sql = "
            SELECT
              id,
              teacher_id,
              email,
              name,
              phone,
              program,
              status,
              rfid,
              fingerprint_id
            FROM teachers
            WHERE rfid = :code
            LIMIT 1
        ";
    } else {
        // fingerprint
        $sql = "
            SELECT
              id,
              teacher_id,
              email,
              name,
              phone,
              program,
              status,
              rfid,
              fingerprint_id
            FROM teachers
            WHERE fingerprint_id = :code
            LIMIT 1
        ";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':code' => $code]);
    $teacher = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$teacher) {
        http_response_code(404);
        echo json_encode([
            'ok'     => false,
            'reason' => $type === 'rfid' ? 'rfid_not_found' : 'finger_not_found',
            'msg'    => $type === 'rfid' ? 'RFID not found.' : 'Fingerprint not found.'
        ]);
        exit;
    }

    echo json_encode([
        'ok'      => true,
        'type'    => $type,
        'teacher' => [
            'id'            => (int)$teacher['id'],
            'teacher_id'    => $teacher['teacher_id'],
            'name'          => $teacher['name'],
            'email'         => $teacher['email'],
            'phone'         => $teacher['phone'],
            'program'       => $teacher['program'],
            'status'        => $teacher['status'],
            'rfid'          => $teacher['rfid'],
            'fingerprint_id'=> $teacher['fingerprint_id'],
        ],
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'  => false,
        'msg' => 'Server error: ' . $e->getMessage(),
    ]);
}
