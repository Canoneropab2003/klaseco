<?php
// api/schedule_check.php
require __DIR__ . '/../supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

// Set the correct timezone for the Philippines
date_default_timezone_set('Asia/Manila');

$room = $_GET['room_code'] ?? '';

if (empty($room)) {
    echo json_encode(['class_active' => false, 'error' => 'No room code provided']);
    exit;
}

try {
    $currentDay  = date('l'); 
    $currentTime = date('H:i:s');
    $currentHour = (int)date('H');
    
    $todayStart = date('Y-m-d 00:00:00');
    $todayEnd   = date('Y-m-d 23:59:59');

    /**
     * LOGIC:
     * 1. Find the VERY LATEST swipe for this room today.
     * 2. If the latest swipe is 'IN', the teacher is present.
     */
    $sql = "SELECT status, swipe_ts FROM attendance 
            WHERE room_code = :room 
            AND swipe_ts >= :start_ts 
            AND swipe_ts <= :end_ts 
            ORDER BY swipe_ts DESC 
            LIMIT 1";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':room'     => $room,
        ':start_ts' => $todayStart,
        ':end_ts'   => $todayEnd
    ]);

    $lastSwipe = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Check if the teacher is currently "In"
    $isTeacherIn = ($lastSwipe && strtolower($lastSwipe['status']) === 'in');

    // --- SCHEDULE VALIDATION (UPDATED FOR EARLY ENTRY) ---
    if ($isTeacherIn) {
        $dayMap = [
            'Monday'    => 'M',
            'Tuesday'   => 'T',
            'Wednesday' => 'W',
            'Thursday'  => 'H',
            'Friday'    => 'F',
            'Saturday'  => 'S',
            'Sunday'    => 'SUN'
        ];
        $shortDay = $dayMap[$currentDay] ?? '';

        // We find the LATEST end_time for this room today.
        // This allows the teacher to be early for the first class 
        // or stay through back-to-back classes.
        $schedSql = "SELECT end_time FROM class_schedules 
                     WHERE room = :room 
                     AND (days LIKE :fullDay OR days LIKE :shortDay)
                     ORDER BY (to_timestamp(end_time, 'FMHH12:MI AM')::time) DESC
                     LIMIT 1";
        
        $schedStmt = $pdo->prepare($schedSql);
        $schedStmt->execute([
            ':room'    => $room,
            ':fullDay' => '%' . $currentDay . '%',
            ':shortDay'=> '%' . $shortDay . '%'
        ]);
        
        $latestSchedule = $schedStmt->fetch(PDO::FETCH_ASSOC);

        if ($latestSchedule) {
            $endTime = $latestSchedule['end_time'];
            
            // Check if current time is PAST the end of the last scheduled class
            $checkPast = $pdo->prepare("SELECT :curr::time > (to_timestamp(:end, 'FMHH12:MI AM')::time)");
            $checkPast->execute([':curr' => $currentTime, ':end' => $endTime]);
            
            if ($checkPast->fetchColumn()) {
                // It is AFTER the class end time (e.g., 4:01 PM), so turn OFF
                $isTeacherIn = false;
            }
            // ELSE: It is before the end time (e.g., 3:25 PM), so leave it ON (Early entry allowed)
        }
    }

    // --- LIGHTS LOGIC (5:00 PM ONWARDS) ---
    $lightsActive = false;
    if ($isTeacherIn && $currentHour >= 17) {
        $lightsActive = true;
    }

    // --- FAN LOGIC (ADDED) ---
    // Fan turns on whenever teacher is present and it is class time
    $fanActive = $isTeacherIn;

    // --- SAFETY CURFEW ---
    if ($currentHour >= 21) {
        $isTeacherIn = false;
        $lightsActive = false; 
        $fanActive = false;
    }

    echo json_encode([
        'class_active'    => $isTeacherIn, 
        'lights_active'   => $lightsActive, 
        'light_on'        => $lightsActive, // Added to match your IDE "light_on" key
        'fan_active'      => $fanActive,    // Output for Fan relay
        'teacher_present' => $isTeacherIn,
        'server_time'     => $currentTime,
        'server_day'      => $currentDay,
        'room'            => $room,
        'last_action'     => $lastSwipe ? $lastSwipe['status'] : 'none'
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'class_active' => false, 
        'error'        => $e->getMessage()
    ]);
}