<?php
// api/ai_handler.php
header('Content-Type: application/json; charset=utf-8');

// 1. CONFIGURATION
$apiKey = "AIzaSyD04VQZRE2825Z8VDM0vPlDsvfxE_dCNAM"; 
$apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $apiKey;

// 2. THE RECEIVER
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Try to get message from JSON first, then $_POST
$userMessage = '';
if (isset($data['message'])) {
    $userMessage = trim((string)$data['message']);
} elseif (isset($_POST['message'])) {
    $userMessage = trim((string)$_POST['message']);
}

if (empty($userMessage)) {
    // This is what you see in your screenshot
    echo json_encode([
        "error" => ["message" => "Raw input was: " . ($json ?: "totally empty")]
    ]);
    exit;
}

// 3. DATABASE CONTEXT GATHERING
require_once __DIR__ . '/supabase_conn.php';

try {
    // Get unique names of teachers present today
    $presentStmt = $pdo->query("SELECT DISTINCT teacher_name FROM attendance WHERE swipe_ts::date = CURRENT_DATE AND lower(status) = 'in'");
    $presentList = $presentStmt->fetchAll(PDO::FETCH_COLUMN);
    $presentCount = count($presentList);

    // Get Absent Teachers (Active teachers who have not swiped IN today)
    // We use teacher_id for the subquery to ensure accuracy across tables
    $absentStmt = $pdo->query("
        SELECT name FROM teachers 
        WHERE status = 'Active' 
        AND teacher_id NOT IN (
            SELECT teacher_id::text FROM attendance WHERE swipe_ts::date = CURRENT_DATE
        )
    ");
    $absentList = $absentStmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Get top 5 pending maintenance requests
    $maintStmt = $pdo->query("SELECT issue_title, room_code FROM maintenance_requests WHERE status != 'resolved' LIMIT 5");
    $maintList = $maintStmt->fetchAll(PDO::FETCH_ASSOC);
    $maintSummary = array_map(fn($m) => $m['issue_title'] . " in " . $m['room_code'], $maintList);

    // Build the system context string
    $context = "Today is " . date('l, Y-m-d') . ". ";
    $context .= "Present: $presentCount (" . implode(', ', $presentList) . "). ";
    $context .= "Absent: " . implode(', ', $absentList) . ". ";
    $context .= "Open Maintenance: " . implode('; ', $maintSummary) . ".";

} catch (Exception $e) {
    $context = "System database context is currently unavailable.";
}

// 4. PREPARE THE BRAIN (System Instructions)
$systemInstruction = "You are the KLASECO AI Assistant for the University of Bohol. 
Help administrators manage smart classrooms using this live data: $context. 
Rules:
1. When asked about attendance or who is absent, list names clearly from the provided list.
2. For maintenance queries, specify the room codes and issues.
3. Keep responses concise, helpful, and professional.
4. If the requested information isn't in the data, politely state that you don't have that record yet.";

$payload = [
    "contents" => [
        ["role" => "user", "parts" => [["text" => $systemInstruction . "\n\nUser Question: " . $userMessage]]]
    ],
    "generationConfig" => [
        "temperature" => 0.7,
        "maxOutputTokens" => 400
    ]
];

// 5. SEND TO GEMINI API
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    // Handle connection errors
    echo json_encode([
        "error" => ["message" => "cURL Error: " . curl_error($ch)]
    ]);
} elseif ($httpCode !== 200) {
    // Handle API-side errors (Invalid key, quota reached, etc.)
    echo json_encode([
        "error" => ["message" => "API Error (Status $httpCode): " . $response]
    ]);
} else {
    // Success - pass the Gemini JSON back to the frontend
    echo $response;
}

curl_close($ch);