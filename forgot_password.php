<?php
declare(strict_types=1);

// ✅ Corrected paths for manual inclusion
require_once __DIR__ . '/phpmailer/src/Exception.php';
require_once __DIR__ . '/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/phpmailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Load configurations
require_once __DIR__ . '/../config_mail.php'; 
require_once __DIR__ . '/supabase_conn.php';
header('Content-Type: application/json; charset=utf-8');

$raw = file_get_contents("php://input");
$body = json_decode($raw, true);
$email = trim($body['email'] ?? '');

if (!$email) {
    echo json_encode(['ok' => false, 'msg' => 'Email address is required.']);
    exit;
}

// 2. Scan both databases for the email
$tables = ['admins', 'maintenance_users'];
$targetUser = null;
$targetTable = '';

foreach ($tables as $table) {
    $stmt = $pdo->prepare("SELECT id, name FROM public.$table WHERE email = :e LIMIT 1");
    $stmt->execute([':e' => $email]);
    if ($res = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $targetUser = $res;
        $targetTable = $table;
        break;
    }
}

if ($targetUser) {
    // 3. Generate secure token (expires in 1 hour)
    $token = bin2hex(random_bytes(32));
    $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));

    // 4. Save token to the specific table
    $upd = $pdo->prepare("UPDATE public.$targetTable SET reset_token = :t, token_expiry = :ex WHERE email = :e");
    $upd->execute([':t' => $token, ':ex' => $expiry, ':e' => $email]);

    // 5. Send Email using PHPMailer and your Config constants
    $mail = new PHPMailer(true);
    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = APP_GMAIL_USER; // 🔑 Uses klasecosystem@gmail.com
        $mail->Password   = APP_GMAIL_PASS; // 🔑 Uses your app password
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // Recipients
        $mail->setFrom(APP_GMAIL_USER, APP_SENDER_NAME);
        $mail->addAddress($email, $targetUser['name']);

        // Content
        $mail->isHTML(true);
        $mail->Subject = 'KLASECO | Reset Your Password';
        
        // Ensure this URL matches your live domain
        $resetLink = "https://www.klaseco.com/reset_password.php?token=$token&email=" . urlencode($email);
        
        $mail->Body = "
            <div style='font-family: Arial, sans-serif; padding: 20px; color: #333;'>
                <h2>Password Reset Request</h2>
                <p>Hello {$targetUser['name']},</p>
                <p>We received a request to reset your KLASECO account password. Click the button below to proceed:</p>
                <a href='{$resetLink}' style='display: inline-block; padding: 12px 24px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;'>Reset Password</a>
                <p>This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
                <hr>
                <p style='font-size: 0.8em;'>Classroom Monitoring System</p>
            </div>
        ";

        $mail->send();
        echo json_encode(['ok' => true, 'msg' => 'Reset link has been sent to your email.']);
    } catch (Exception $e) {
        echo json_encode(['ok' => false, 'msg' => "Mail could not be sent. Error: {$mail->ErrorInfo}"]);
    }
} else {
    echo json_encode(['ok' => false, 'msg' => 'No account found with that email address.']);
}