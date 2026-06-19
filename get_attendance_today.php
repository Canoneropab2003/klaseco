<?php
// api/get_attendance_today.php
declare(strict_types=1);

require __DIR__ . '/supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

try {
    // ✅ Manila boundaries for "today"
    $tz = new DateTimeZone('Asia/Manila');
    $start = new DateTime('today', $tz);           // today 00:00:00
    $end   = (clone $start)->modify('+1 day');     // tomorrow 00:00:00

    // Since your column is timestamp WITHOUT time zone, store/compare plain strings
    $startStr = $start->format('Y-m-d H:i:s');
    $endStr   = $end->format('Y-m-d H:i:s');

    // Optional room filter: ?room=A301
    $roomCode = isset($_GET['room']) ? trim((string)$_GET['room']) : '';

    // Optional limit (default 200)
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 200;
    if ($limit <= 0) $limit = 200;
    if ($limit > 1000) $limit = 1000; // safety

    // 1) Rows (FAST)
    $sqlRows = "
        SELECT
            a.id,
            a.teacher_id,
            a.rfid,
            a.status,
            a.room_code,
            a.swipe_ts,
            to_char(a.swipe_ts, 'HH12:MI AM') AS swipe_ts_human,
            COALESCE(NULLIF(a.teacher_name,''), t.name) AS name,
            COALESCE(NULLIF(a.program,''), t.program)  AS program
        FROM attendance a
        JOIN teachers t ON t.id = a.teacher_id
        WHERE a.swipe_ts >= :start_ts
          AND a.swipe_ts <  :end_ts
          AND (:room_code = '' OR a.room_code = :room_code)
        ORDER BY a.swipe_ts DESC, a.id DESC
        LIMIT $limit
    ";

    $stmtRows = $pdo->prepare($sqlRows);
    $stmtRows->execute([
        ':start_ts'  => $startStr,
        ':end_ts'    => $endStr,
        ':room_code' => $roomCode,
    ]);
    $rows = $stmtRows->fetchAll(PDO::FETCH_ASSOC);

    // 2) Counts (FAST aggregate using same index-friendly range)
    $sqlCount = "
        SELECT
          SUM(CASE WHEN lower(a.status)='in'  THEN 1 ELSE 0 END) AS in_count,
          SUM(CASE WHEN lower(a.status)='out' THEN 1 ELSE 0 END) AS out_count
        FROM attendance a
        WHERE a.swipe_ts >= :start_ts
          AND a.swipe_ts <  :end_ts
          AND (:room_code = '' OR a.room_code = :room_code)
    ";

    $stmtCount = $pdo->prepare($sqlCount);
    $stmtCount->execute([
        ':start_ts'  => $startStr,
        ':end_ts'    => $endStr,
        ':room_code' => $roomCode,
    ]);
    $counts = $stmtCount->fetch(PDO::FETCH_ASSOC) ?: ['in_count'=>0,'out_count'=>0];

    echo json_encode([
        'ok' => true,
        'today_range' => [
            'start' => $startStr,
            'end'   => $endStr,
            'tz'    => 'Asia/Manila',
        ],
        'rows' => $rows,
        'today_counts' => [
            'in'  => (int)($counts['in_count'] ?? 0),
            'out' => (int)($counts['out_count'] ?? 0),
        ],
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'  => false,
        'msg' => 'Failed to load today attendance: ' . $e->getMessage(),
    ]);
}
