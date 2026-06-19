<?php
// attendance_feed.php  (Supabase / PDO version)

require __DIR__ . '/supabase_conn.php';

if (!function_exists('nocache_headers')) {
  function nocache_headers(): void {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
  }
}
nocache_headers();
header('Content-Type: application/json; charset=utf-8');

$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 80;
if ($limit < 1 || $limit > 500) $limit = 80;

$scope = $_GET['scope'] ?? '';
$from  = $_GET['from']  ?? '';
$to    = $_GET['to']    ?? '';

$where  = '';
$params = [];

// Today’s logs
if ($scope === 'today') {
  $where = " WHERE a.swipe_ts::date = CURRENT_DATE ";
}
// Custom date range
elseif (preg_match('/^\d{4}-\d{2}-\d{2}$/', $from)) {
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) $to = $from;
  $where = " WHERE a.swipe_ts >= :from_start
             AND   a.swipe_ts <= :to_end ";
  $params[':from_start'] = $from . ' 00:00:00';
  $params[':to_end']     = $to   . ' 23:59:59';
}

$sql = "SELECT
          a.id,
          t.teacher_id             AS teacher_id,
          a.rfid,
          LOWER(a.status)          AS status,
          a.swipe_ts               AS swipe_ts,
          t.name,
          t.program
        FROM public.attendance a
        JOIN public.teachers t ON t.id = a.teacher_id
        $where
        ORDER BY a.swipe_ts DESC
        LIMIT :lim";

try {
  $stmt = $pdo->prepare($sql);

  foreach ($params as $k => $v) {
    $stmt->bindValue($k, $v);
  }
  $stmt->bindValue(':lim', (int)$limit, PDO::PARAM_INT);

  $stmt->execute();
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode([
    'ok'           => false,
    'error'        => 'Query failed',
    'error_detail' => $e->getMessage()
  ]);
  exit;
}

$data = [];
$in   = 0;
$out  = 0;

foreach ($rows as $r) {
  $status = strtolower($r['status'] ?? '');
  if ($status === 'in')  $in++;
  if ($status === 'out') $out++;

  $data[] = [
    'id'         => (int)$r['id'],
    'teacher_id' => $r['teacher_id'] ?? '',
    'rfid'       => $r['rfid'] ?? '',
    'status'     => $status,
    'swipe_ts'   => $r['swipe_ts'] ?? '',
    'name'       => $r['name'] ?? '',
    'program'    => $r['program'] ?? '',
  ];
}

echo json_encode([
  'ok'        => true,
  'data'      => $data,
  'count_in'  => $in,
  'count_out' => $out
]);
