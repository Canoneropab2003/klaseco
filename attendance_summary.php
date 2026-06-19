<?php
// api/attendance_summary.php
declare(strict_types=1);

require __DIR__ . '/../auth.php';
require_auth_json(); 

require __DIR__ . '/supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

try {
    date_default_timezone_set('Asia/Manila');

    // =========================
    // INPUTS
    // =========================
    $room = trim((string)($_GET['room'] ?? '')); 
    $date = trim((string)($_GET['date'] ?? '')); 

    $where  = [];
    $params = [];

    if ($room !== '') {
        $where[] = "a.room_code = :room";
        $params[':room'] = $room;
    }

    if ($date !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        $where[] = "a.swipe_ts::date = :date";
        $params[':date'] = $date;
    }

    $whereSql = $where ? "WHERE " . implode(" AND ", $where) : "";

    /**
     * =========================
     * SESSION LOGIC (Updated for Subjects)
     * - Group by teacher, room, and subject_code
     * - Pair IN with the corresponding OUT for that specific subject
     * =========================
     */
    $sql = "
      WITH ordered AS (
        SELECT
          a.*,
          ROW_NUMBER() OVER (
            PARTITION BY a.teacher_id, a.room_code, a.subject_code, a.swipe_ts::date
            ORDER BY a.swipe_ts
          ) AS rn
        FROM attendance a
        $whereSql
      ),
      sessions AS (
        SELECT
          i.teacher_id,
          i.teacher_name,
          i.program,
          i.room_code,
          i.subject_code,
          i.swipe_ts AS time_in,
          (
            SELECT o.swipe_ts
            FROM ordered o
            WHERE o.teacher_id = i.teacher_id
              AND o.room_code = i.room_code
              AND o.subject_code = i.subject_code
              AND o.swipe_ts::date = i.swipe_ts::date
              AND lower(o.status) = 'out'
              AND o.rn = i.rn + 1
          ) AS time_out
        FROM ordered i
        WHERE lower(i.status) = 'in'
      )
      SELECT
        teacher_name,
        program,
        room_code,
        subject_code,
        to_char(time_in, 'YYYY-MM-DD') AS date,
        to_char(time_in, 'HH12:MI AM') AS time_in,
        to_char(time_out, 'HH12:MI AM') AS time_out
      FROM sessions
      ORDER BY date DESC, time_in DESC
      LIMIT 5000
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Final output (Matches your updated attendance.js)
    $out = array_map(function ($r) {
        return [
            "teacher_name" => $r["teacher_name"] ?: "—",
            "program"      => $r["program"] ?: "—",
            "room_code"    => $r["room_code"],
            "date"         => $r["date"],
            "time_in"      => $r["time_in"] ?: "",
            "time_out"     => $r["time_out"] ?: "—",
            "subject_code" => $r["subject_code"] ?: "—"
        ];
    }, $rows);

    echo json_encode(["ok" => true, "rows" => $out], JSON_UNESCAPED_SLASHES);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "ok"  => false,
        "msg" => "Server error: " . $e->getMessage()
    ]);
}