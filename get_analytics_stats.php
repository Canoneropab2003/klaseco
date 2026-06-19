<?php
// api/get_analytics_stats.php
declare(strict_types=1);

/**
 * KLASECO Analytics API
 * Handles KPI data for teachers, maintenance, and attendance trends.
 * Synchronized for Asia/Manila Timezone.
 */

require_once __DIR__ . '/../auth.php'; 
// require_auth_json(); // Uncomment to enable security once testing is complete

require_once __DIR__ . '/supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

try {
    // 1. TIMEZONE & DATABASE SYNC
    // Ensures PHP and PostgreSQL are both operating on Manila time
    date_default_timezone_set('Asia/Manila');
    $pdo->exec("SET TIME ZONE 'Asia/Manila'");

    // 2. INPUT HANDLING
    $range = $_GET['range'] ?? 'today';
    $queryParams = [];
    $days_back = 0;
    $currentDayName = date('l'); // e.g., 'Tuesday'

    if ($range === '7d') {
        $dateFilter = "AND swipe_ts::date >= CURRENT_DATE - INTERVAL '7 days'";
        $days_back = 7;
    } elseif ($range === '30d') {
        $dateFilter = "AND swipe_ts::date >= CURRENT_DATE - INTERVAL '30 days'";
        $days_back = 30;
    } else {
        // Default: Today
        $todayStr = date('Y-m-d');
        $dateFilter = "AND swipe_ts::date = :today";
        $queryParams[':today'] = $todayStr;
        $days_back = 0;
    }

    // 3. TEACHER TOTALS (For Sidebar & KPIs)
    // Fetches registry counts for 'Today's Pulse' sidebar
    $teachers = $pdo->query("SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Active') as active,
        COUNT(*) FILTER (WHERE status != 'Active') as inactive
    FROM teachers")->fetch(PDO::FETCH_ASSOC);

    // 4. MAINTENANCE STATS
    $maintenance = $pdo->query("SELECT 
        COUNT(*) FILTER (WHERE status != 'resolved') as open_total,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_period
    FROM maintenance_requests")->fetch(PDO::FETCH_ASSOC);

    // 5. ATTENDANCE STATS (KPIs)
    // unique_present: Counts actual people to keep the % rate accurate
    // total_activity_logs: Counts every swipe (IN/OUT) for the system logs
    $stmtAtt = $pdo->prepare("SELECT 
        COUNT(DISTINCT teacher_id) FILTER (WHERE lower(status) = 'in') as unique_present,
        COUNT(DISTINCT teacher_id) FILTER (WHERE lower(status) = 'absent') as unique_absent,
        COUNT(*) as total_activity_logs
    FROM attendance 
    WHERE 1=1 $dateFilter");
    $stmtAtt->execute($queryParams);
    $attendance = $stmtAtt->fetch(PDO::FETCH_ASSOC);

    // 6. CALCULATE EXPECTED (From class_schedules)
    // Used for the "Expected" baseline on the charts
    $schedStmt = $pdo->prepare("SELECT COUNT(DISTINCT teacher_name) FROM class_schedules WHERE days LIKE :day");
    $schedStmt->execute([':day' => "%$currentDayName%"]);
    $expectedCount = (int)$schedStmt->fetchColumn();

    // 7. CHART DATA GENERATION
    // Uses generate_series to ensure every day in the range is represented
    $chartSql = "
        WITH date_range AS (
            SELECT generate_series(
                (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date - INTERVAL '$days_back days', 
                (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date, 
                '1 day'
            )::date AS day
        )
        SELECT 
            dr.day,
            COUNT(DISTINCT a.teacher_id) FILTER (WHERE lower(a.status) = 'in') as present,
            COUNT(DISTINCT a.teacher_id) FILTER (WHERE lower(a.status) = 'absent') as absent,
            $expectedCount as total 
        FROM date_range dr
        LEFT JOIN attendance a ON dr.day = a.swipe_ts::date
        GROUP BY dr.day
        ORDER BY dr.day ASC
    ";
    $chartData = $pdo->query($chartSql)->fetchAll(PDO::FETCH_ASSOC);

    // 8. FINAL JSON RESPONSE
    echo json_encode([
        'status'      => 'success',
        'teachers'    => $teachers,
        'maintenance' => $maintenance,
        'attendance'  => [
            'present_count' => (int)$attendance['unique_present'],
            'absent_count'  => (int)$attendance['unique_absent'],
            'total_records' => (int)$attendance['total_activity_logs'] 
        ],
        'chart'       => $chartData
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error', 
        'message' => 'KLASECO System Error: ' . $e->getMessage()
    ]);
}