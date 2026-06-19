<?php
// Force Manila Timezone
date_default_timezone_set('Asia/Manila'); 

// Create a DateTime object to be precise
$now = new DateTime();
$currentTime = $now->format('H:i');
$currentHour = (int)$now->format('H');
$currentMin = (int)$now->format('i');

$totalMinutes = ($currentHour * 60) + $currentMin;

// 7:00 AM = 420 mins | 8:30 PM = 1230 mins
$isWithinTimeRange = ($totalMinutes >= 420 && $totalMinutes <= 1230);

header('Content-Type: application/json');
echo json_encode([
    "server_time_manila" => $currentTime,
    "total_minutes" => $totalMinutes,
    "is_active_window" => $isWithinTimeRange
]);
?>