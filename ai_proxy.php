<?php
declare(strict_types=1);
require_once 'supabase_conn.php'; // Uses your provided Supabase connection

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Groq Credentials
define('GROQ_API_KEY', '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');
define('AI_MODEL', 'llama-3.1-8b-instant');

try {
    // 1. FETCH ALL CORE DATA
    $activeTeachers = $pdo->query("SELECT name, program, phone FROM teachers WHERE status = 'Active'")->fetchAll(PDO::FETCH_ASSOC);
    
    $attendanceTodayCount = $pdo->query("SELECT COUNT(DISTINCT teacher_id) as present FROM attendance WHERE DATE(swipe_ts AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') = CURRENT_DATE AND status = 'IN'")->fetch(PDO::FETCH_ASSOC);

    $maintStaff = $pdo->query("SELECT name FROM maintenance_users WHERE status = 'active'")->fetchAll(PDO::FETCH_ASSOC);
    $openMaint = $pdo->query("SELECT id FROM maintenance_requests WHERE status != 'resolved'")->fetchAll(PDO::FETCH_ASSOC);
    
    $adminStaff = $pdo->query("SELECT name, position FROM admins WHERE role = 'staff'")->fetchAll(PDO::FETCH_ASSOC);

    // FETCH CLASS SCHEDULES
    $sqlSchedules = "
      SELECT days, start_time, end_time, teacher_name, subject_code, room 
      FROM class_schedules 
      ORDER BY created_at ASC, id ASC
    ";
    $schedules = $pdo->query($sqlSchedules)->fetchAll(PDO::FETCH_ASSOC);

    /**
     * 2. INTELLIGENT ATTENDANCE SESSION LOGIC (NEW INTEGRATION)
     * Group by teacher, room, and subject_code to pair IN with the corresponding OUT
     */
    $sessionSql = "
      WITH ordered AS (
        SELECT a.*, ROW_NUMBER() OVER (
            PARTITION BY a.teacher_id, a.room_code, a.subject_code, a.swipe_ts::date 
            ORDER BY a.swipe_ts
        ) AS rn FROM attendance a
        WHERE a.swipe_ts::date = CURRENT_DATE
      ),
      sessions AS (
        SELECT i.teacher_name, i.room_code, i.subject_code, i.swipe_ts AS time_in,
          (SELECT o.swipe_ts FROM ordered o WHERE o.teacher_id = i.teacher_id AND o.room_code = i.room_code 
           AND o.subject_code = i.subject_code AND o.swipe_ts::date = i.swipe_ts::date 
           AND lower(o.status) = 'out' AND o.rn = i.rn + 1) AS time_out
        FROM ordered i WHERE lower(i.status) = 'in'
      )
      SELECT teacher_name, room_code, subject_code, 
             to_char(time_in, 'HH12:MI AM') AS t_in, 
             to_char(time_out, 'HH12:MI AM') AS t_out 
      FROM sessions ORDER BY time_in DESC LIMIT 20
    ";
    $recentSessions = $pdo->query($sessionSql)->fetchAll(PDO::FETCH_ASSOC);

    // 3. INTELLIGENT ANALYTICS (Pre-calculating for the AI)
    $totalActive = count($activeTeachers);
    $presentCount = (int)($attendanceTodayCount['present'] ?? 0);
    $absentCount = $totalActive - $presentCount;
    $attendanceRate = ($totalActive > 0) ? round(($presentCount / $totalActive) * 100, 1) : 0;

    // 4. CONSTRUCT THE KNOWLEDGE SNAPSHOT
    $snapshot = "SYSTEM SNAPSHOT (Asia/Manila Time):\n";
    $snapshot .= "- Attendance Rate Today: $attendanceRate%\n";
    $snapshot .= "- Summary: $presentCount Present | $absentCount Absent | $totalActive Total Active\n";
    
    $snapshot .= "\nRECENT ATTENDANCE SESSIONS (Live Today):\n";
    foreach ($recentSessions as $s) {
        $snapshot .= "• " . $s['teacher_name'] . ": " . $s['subject_code'] . " in " . $s['room_code'] . " [IN: " . $s['t_in'] . " | OUT: " . ($s['t_out'] ?? 'STILL IN') . "]\n";
    }

    $snapshot .= "\nTEACHER LIST (Active Only):\n";
    foreach ($activeTeachers as $t) { $snapshot .= "• " . $t['name'] . " (" . $t['program'] . ") - " . $t['phone'] . "\n"; }
    
    $snapshot .= "\nMAINTENANCE:\n- Staff: " . implode(', ', array_column($maintStaff, 'name')) . "\n- Pending Requests: " . count($openMaint) . "\n";
    
    $snapshot .= "\nADMIN STAFF:\n";
    foreach ($adminStaff as $s) { $snapshot .= "• " . $s['name'] . " (" . $s['position'] . ")\n"; }

    $snapshot .= "\nCLASS SCHEDULES:\n";
    foreach ($schedules as $sch) { 
        $snapshot .= "• " . $sch['teacher_name'] . ": " . $sch['subject_code'] . " in " . $sch['room'] . " [" . $sch['days'] . " " . $sch['start_time'] . "-" . $sch['end_time'] . "]\n"; 
    }

} catch (Exception $e) {
    $snapshot = "Error: Database link unstable. Please check Supabase connection.";
}

// 5. THE INTELLIGENT SYSTEM PROMPT
$SYSTEM_PROMPT = "You are KLASECO AI, the smart companion for the University of Bohol's classroom system.

GOAL: Provide instant, data-driven insights to administrators.

KNOWLEDGE SNAPSHOT:
$snapshot

RULES:
- When asked 'Who is here?', list the names of teachers currently marked as 'STILL IN' in the RECENT SESSIONS.
- If asked 'Who is absent?', compare the Teacher List against those who have checked in today.
- If a session has no OUT time, report that teacher as 'Currently in class'.
- Use the CLASS SCHEDULES to tell the admin where teachers should be.
- Use **bold** for key metrics, names, and subject codes.
- Proactively suggest maintenance follow-ups if 'Pending Requests' is greater than 0.
- Tone: Professional, direct, and intelligent. No filler words.";

// 6. EXECUTE AI REQUEST (Updated with better error handling)
$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

$payload = [
    'model' => AI_MODEL,
    'messages' => array_merge([['role' => 'system', 'content' => $SYSTEM_PROMPT]], $body['messages'] ?? []),
    'temperature' => 0.2,
    'max_tokens' => 800
];

$ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json', 
        'Authorization: Bearer ' . GROQ_API_KEY
    ],
    CURLOPT_TIMEOUT => 30, // Added timeout to prevent hanging
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$data = json_decode((string)$response, true);
curl_close($ch);

// This section will now tell you if the API key is wrong or if there is a quota issue
if ($httpCode !== 200) {
    $errorMsg = $data['error']['message'] ?? "HTTP Error $httpCode. Check your Groq quota or API Key.";
    echo json_encode(['content' => [['type' => 'text', 'text' => "⚠️ Admin, I hit a snag: $errorMsg"]]]);
    exit;
}

$replyText = $data['choices'][0]['message']['content'] ?? "System error. Please verify API configuration.";

echo json_encode(['content' => [['type' => 'text', 'text' => $replyText]]]);