<?php
// attendance_toggle.php  (Supabase / PDO version with extra-safe lookup)
require __DIR__ . '/supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

// Helper to send JSON error and stop
function json_fail($code, $msg, $extra = []) {
  http_response_code(400);
  echo json_encode(array_merge([
    'ok'         => false,
    'error_code' => $code,
    'error'      => $msg,
  ], $extra), JSON_PRETTY_PRINT);
  exit;
}

// Raw from POST
$rfid_raw    = $_POST['rfid']       ?? '';
$tid_raw     = $_POST['teacher_id'] ?? '';

// Digits-only versions (what scanner usually sends)
$rfid_digits = preg_replace('/\D+/', '', $rfid_raw);
$tid_digits  = preg_replace('/\D+/', '', $tid_raw);

// Optional: min_gap for “tap too soon”
$min_gap_ms  = (int)($_POST['min_gap_ms'] ?? 60000);

// Must have at least one identifier
if ($rfid_digits === '' && $tid_digits === '') {
  json_fail('NO_IDENTIFIER', 'Provide rfid or teacher_id', [
    'debug' => ['rfid_raw' => $rfid_raw, 'teacher_id_raw' => $tid_raw]
  ]);
}

// ⚠️ for now, DO NOT force exactly 10 digits (some readers send 8/12/etc)
if ($rfid_digits !== '' && strlen($rfid_digits) < 5) {
  json_fail('BAD_RFID', 'RFID too short', [
    'debug' => ['rfid_digits' => $rfid_digits]
  ]);
}

/* ------------------------------------------------------------------
   1) Look up teacher (get PK id) from Supabase
   ------------------------------------------------------------------ */

try {
  if ($tid_digits !== '') {
    // match digits-only teacher_id (e.g. "22-2124-474")
    $sql = "
      SELECT id, teacher_id, name, program, status, rfid
      FROM public.teachers
      WHERE regexp_replace(teacher_id, '\\D', '', 'g') = :tid_digits
      LIMIT 1
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':tid_digits' => $tid_digits]);

  } else {
    // match digits-only RFID (in case it has spaces or other chars in DB)
    $sql = "
      SELECT id, teacher_id, name, program, status, rfid
      FROM public.teachers
      WHERE regexp_replace(rfid, '\\D', '', 'g') = :rfid_digits
      LIMIT 1
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':rfid_digits' => $rfid_digits]);
  }

  $teacher = $stmt->fetch(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
  json_fail('DB_LOOKUP_ERROR', 'DB error while looking up teacher', [
    'debug' => $e->getMessage()
  ]);
}

if (!$teacher) {
  json_fail('NOT_FOUND', 'Teacher not found in database', [
    'debug' => [
      'rfid_raw'    => $rfid_raw,
      'rfid_digits' => $rfid_digits,
      'tid_raw'     => $tid_raw,
      'tid_digits'  => $tid_digits
    ]
  ]);
}

$teacher_pk = (int) $teacher['id'];
// Normalize RFID digits from DB as well
$rfid_db    = preg_replace('/\D+/', '', (string)$teacher['rfid']);

if ($rfid_db === '') {
  json_fail('TEACHER_NO_RFID', 'Teacher has no RFID saved in DB', [
    'debug' => $teacher
  ]);
}

// status must be Active
if (strtolower($teacher['status']) !== 'active') {
  json_fail('TEACHER_NOT_ACTIVE', 'Teacher is not active', [
    'debug' => [
      'teacher_id'     => $teacher['teacher_id'],
      'teacher_status' => $teacher['status']
    ]
  ]);
}

/* ------------------------------------------------------------------
   2) Cooldown – prevent super fast double taps
   ------------------------------------------------------------------ */

try {
  $sql  = "SELECT swipe_ts
           FROM public.attendance
           WHERE teacher_id = :tid
           ORDER BY swipe_ts DESC, id DESC
           LIMIT 1";
  $stmt = $pdo->prepare($sql);
  $stmt->execute([':tid' => $teacher_pk]);
  $last = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
  json_fail('DB_COOLDOWN_ERROR', 'DB error while checking cooldown', [
    'debug' => $e->getMessage()
  ]);
}

if ($last && $min_gap_ms > 0) {
  $last_ms = strtotime($last['swipe_ts']) * 1000;
  $now_ms  = (int)(microtime(true) * 1000);
  if ($now_ms - $last_ms < $min_gap_ms) {
    json_fail('TAP_TOO_SOON', 'Tap too soon', [
      'debug' => [
        'remaining_ms' => $min_gap_ms - ($now_ms - $last_ms),
        'last_swipe'   => $last['swipe_ts']
      ]
    ]);
  }
}

/* ------------------------------------------------------------------
   3) Determine next status (IN / OUT)
   ------------------------------------------------------------------ */

try {
  $sql  = "SELECT status
           FROM public.attendance
           WHERE teacher_id = :tid
           ORDER BY swipe_ts DESC, id DESC
           LIMIT 1";
  $stmt = $pdo->prepare($sql);
  $stmt->execute([':tid' => $teacher_pk]);
  $prev = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
  json_fail('DB_STATUS_ERROR', 'DB error while checking last status', [
    'debug' => $e->getMessage()
  ]);
}

$next     = (isset($prev['status']) && strtoupper($prev['status']) === 'IN') ? 'OUT' : 'IN';
$swipe_ts = date('Y-m-d H:i:s');
$source   = 'RFID';

/* ------------------------------------------------------------------
   4) Insert row into public.attendance
   ------------------------------------------------------------------ */

try {
  $sql  = "INSERT INTO public.attendance (teacher_id, rfid, status, swipe_ts, source)
           VALUES (:tid, :rfid, :status, :swipe_ts, :source)";
  $stmt = $pdo->prepare($sql);
  $stmt->execute([
    ':tid'      => $teacher_pk,
    ':rfid'     => $rfid_db,
    ':status'   => $next,
    ':swipe_ts' => $swipe_ts,
    ':source'   => $source
  ]);
} catch (PDOException $e) {
  json_fail('INSERT_FAILED', 'Insert into attendance failed', [
    'debug' => $e->getMessage()
  ]);
}

/* ------------------------------------------------------------------
   5) Success JSON (what tap.html expects)
   ------------------------------------------------------------------ */

echo json_encode([
  'ok'   => true,
  'data' => [
    'teacher_id' => $teacher['teacher_id'],
    'name'       => $teacher['name'],
    'program'    => $teacher['program'],
    'rfid'       => $rfid_db,
    'status'     => strtolower($next),  // 'in' | 'out'
    'swipe_ts'   => $swipe_ts,
  ]
], JSON_PRETTY_PRINT);
