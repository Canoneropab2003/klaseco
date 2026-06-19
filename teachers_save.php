<?php
// api/teachers_save.php
require __DIR__ . '/../auth.php';
require_role_json('admin'); 

require __DIR__ . '/../supabase_conn.php'; 
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../config_mail.php';

// 2. Clear any accidental output/warnings from the buffer
if (ob_get_length()) ob_clean(); 
header('Content-Type: application/json; charset=utf-8');

function clean_str($v) {
    $trimmed = trim((string)($v ?? ''));
    return $trimmed === '' ? null : $trimmed; // Convert empty strings to NULL
}

/* ======================================================
   🚀 ROBUST INPUT HANDLING
====================================================== */
$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);

// Fallback for Namecheap 301 redirects that strip JSON bodies
if (!is_array($payload) || empty($payload)) {
    $payload = !empty($_POST) ? $_POST : $_REQUEST;
}

if (!is_array($payload)) {
    echo json_encode(['ok' => false, 'msg' => 'No data received. Body lost during redirect.']);
    exit;
}

// Extract and Nullify empty fields
$teacher_id = clean_str($payload['teacher_id'] ?? '');
$email      = clean_str($payload['email']      ?? '');
$name       = clean_str($payload['name']       ?? '');
$phone      = clean_str($payload['phone']      ?? '');
$program    = clean_str($payload['program']    ?? '');
$status     = clean_str($payload['status']     ?? 'Active');
$rfid       = clean_str($payload['rfid']       ?? '');
// Extract 3 unique IDs and Templates from the payload
$f_id1   = clean_str($payload['fingerprint_id'] ?? '');
$f_temp1 = clean_str($payload['fingerprint_template'] ?? '');
$f_id2   = clean_str($payload['fingerprint_id_2'] ?? '');
$f_temp2 = clean_str($payload['fingerprint_template_2'] ?? '');
$f_id3   = clean_str($payload['fingerprint_id_3'] ?? '');
$f_temp3 = clean_str($payload['fingerprint_template_3'] ?? '');

// ✅ ADDED ONLY: optional password for EMAIL display (does NOT store in DB)
$password_plain       = clean_str($payload['password']             ?? '');

if ($teacher_id === '' || $email === '' || $name === '' ||
    $phone === '' || $program === '' || $status === '' || $rfid === '') {
  http_response_code(422);
  echo json_encode(['ok' => false, 'msg' => 'Missing required fields']);
  exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(422);
  echo json_encode(['ok' => false, 'msg' => 'Valid email required']);
  exit;
}

if (!preg_match('/^\d{10}$/', $rfid)) {
  http_response_code(422);
  echo json_encode(['ok' => false, 'msg' => 'RFID must be exactly 10 digits']);
  exit;
}

// (optional) very soft sanity check: hex-ish string
if ($f_temp !== '' && !preg_match('/^[0-9A-Fa-f]+$/', $f_temp)) {
  // You can relax/remove this if needed
  // Not fatal, just warn or clean; here we just keep it as-is or you can null it:
  // $fingerprint_template = '';
}

$mode        = null;
$sent_email  = false;
$warn        = null;
$reason      = null;

// ✅ ADDED ONLY: store previous values (for update email summary if you want later)
$prev = null;

try {
    // 3. Detect mode for email logic
    $stmtCheck = $pdo->prepare("SELECT id FROM teachers WHERE teacher_id = :tid");
    $stmtCheck->execute([':tid' => $teacher_id]);
    $exists = (bool) $stmtCheck->fetchColumn();
    $mode = $exists ? 'update' : 'insert';

    // 4. UPSERT Logic using PostgreSQL ON CONFLICT
    $sql = "
        INSERT INTO teachers (
            teacher_id, email, name, phone, program, status, rfid, 
            fingerprint_id, fingerprint_template, 
            fingerprint_id_2, fingerprint_template_2,
            fingerprint_id_3, fingerprint_template_3,
            updated_at
        )
        VALUES (
            :tid, :email, :name, :phone, :program, :status, :rfid, 
            :fid1, :ftemp1, :fid2, :ftemp2, :fid3, :ftemp3, NOW()
        )
        ON CONFLICT (teacher_id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            program = EXCLUDED.program,
            status = EXCLUDED.status,
            rfid = EXCLUDED.rfid,
            fingerprint_id = EXCLUDED.fingerprint_id,
            fingerprint_template = EXCLUDED.fingerprint_template,
            fingerprint_id_2 = EXCLUDED.fingerprint_id_2,
            fingerprint_template_2 = EXCLUDED.fingerprint_template_2,
            fingerprint_id_3 = EXCLUDED.fingerprint_id_3,
            fingerprint_template_3 = EXCLUDED.fingerprint_template_3,
            updated_at = NOW()
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':tid'     => $teacher_id,
        ':email'   => $email,
        ':name'    => $name,
        ':phone'   => $phone,
        ':program' => $program,
        ':status'  => $status,
        ':rfid'    => $rfid,
        ':fid1'    => ($f_id1 !== null) ? (int)$f_id1 : null,
        ':ftemp1'  => $f_temp1,
        ':fid2'    => ($f_id2 !== null) ? (int)$f_id2 : null,
        ':ftemp2'  => $f_temp2,
        ':fid3'    => ($f_id3 !== null) ? (int)$f_id3 : null,
        ':ftemp3'  => $f_temp3
    ]);

    /* // 5. SUCCESS RESPONSE (Send this BEFORE email logic to prevent timeout issues)
    echo json_encode([
        'ok' => true, 
        'msg' => 'Teacher saved successfully.',
        'mode' => $mode
    ]); */

    

/* ───────────────── Email (non-blocking) ─────────────────
   Only try if creds exist AND PHPMailer files are present.
   Any failure here will NOT affect the HTTP success.
---------------------------------------------------------------- */
if ($mode === 'insert' || $mode === 'update') {
  if (function_exists('mail_ready') && mail_ready()) {
    $base = realpath(__DIR__ . '/../phpmailer/src');
    $has_phpmailer = $base
      && file_exists($base . '/PHPMailer.php')
      && file_exists($base . '/SMTP.php')
      && file_exists($base . '/Exception.php');

    if ($has_phpmailer) {
      require_once $base . '/PHPMailer.php';
      require_once $base . '/SMTP.php';
      require_once $base . '/Exception.php';

      try {
        $fromName = defined('APP_SENDER_NAME') ? APP_SENDER_NAME : 'Classroom Monitoring';
        $subj = ($mode === 'insert')
          ? 'KLASECO — Teacher Account Activated'
          : 'KLASECO — Teacher Profile Updated';

        // ✅ ORIGINAL email HTML (kept; not removed)
        $html = '
          <div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:auto;padding:18px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
            <h2 style="color:#111827;font-size:18px;margin:0 0 8px;">' . ($mode === 'insert' ? 'Welcome!' : 'Profile Updated') . '</h2>
            <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 12px;">
              Hi <b>' . htmlspecialchars($name) . '</b>, ' . ($mode === 'insert'
                ? 'your teacher account has been created by the administrator.'
                : 'your teacher record has been updated by the administrator.') . '
            </p>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;">
              <div style="font-size:14px;color:#111827;margin:0 0 6px;"><b>Details</b></div>
              <p style="margin:0;color:#374151;font-size:14px;line-height:1.55;">
                <b>Teacher ID:</b> ' . htmlspecialchars($teacher_id) . '<br/>
                <b>RFID:</b> ' . htmlspecialchars($rfid) . '<br/>
                <b>Program:</b> ' . htmlspecialchars($program) . '<br/>
                <b>Status:</b> ' . htmlspecialchars($status) . '
              </p>
            </div>
          </div>';

        // ✅ ADDED ONLY: “Admin Staff style” email design (same design language)
        $title = ($mode === 'insert') ? 'Welcome to KLASECO!' : 'Profile Updated';

        $bodyCopy = ($mode === 'insert')
          ? sprintf(
              'Hello %s,<br><br>
               Thank you for registering as a <b>Teacher</b> in the University of Bohol.<br>
               This email confirms that your account has been activated by the administrator and is now ready for use.<br><br>
               If you did not make this request, please ignore this message or notify the administrator immediately.',
              htmlspecialchars($name, ENT_QUOTES, 'UTF-8')
            )
          : sprintf(
              'Hello %s,<br><br>
               This email confirms that your <b>Teacher</b> profile information has been updated by the administrator.<br><br>
               If you did not request or expect this change, please contact the administrator immediately.',
              htmlspecialchars($name, ENT_QUOTES, 'UTF-8')
            );

        $html_new = '
          <div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f3f6fb;padding:20px 14px;">
            <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e6ebf3;border-radius:16px;overflow:hidden;box-shadow:0 10px 28px rgba(2,6,23,.06);">
              
              <!-- Header -->
              <div style="background:linear-gradient(135deg,#0b2241 0%,#0a1e39 60%,#081a31 100%);padding:18px 18px 14px;">
                <div style="height:4px;background:#f97316;border-radius:999px 999px 0 0;margin:0 0 12px 0;"></div>
                <h2 style="margin:0;color:#eaf2ff;font-size:20px;letter-spacing:.2px;text-align:justify;">
                  '.$title.'
                </h2>
                <p style="margin:8px 0 0;color:#c7d6ea;font-size:12px;line-height:1.6;text-align:justify;">
                  Teachers • Automated Notification
                </p>
              </div>

              <!-- Body -->
              <div style="padding:18px;">
                <p style="color:#334155;font-size:14px;line-height:1.9;margin:0 0 12px;text-align:justify;">
                  '.$bodyCopy.'
                </p>

                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; margin:16px 0 0;">
                    <div style="background:#f8fafc; padding:10px 16px; border-bottom:1px solid #e2e8f0;">
                        <span style="font-size:13px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">
                            Account Credentials
                        </span>
                    </div>
                    <div style="padding:16px;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td style="padding:6px 0; font-size:14px; color:#64748b; width:100px;">Teacher ID</td>
                                <td style="padding:6px 0; font-size:14px; color:#1e293b; font-weight:600;">'.htmlspecialchars($teacher_id, ENT_QUOTES, "UTF-8").'</td>
                            </tr>
                            <tr>
                                <td style="padding:6px 0; font-size:14px; color:#64748b;">Program</td>
                                <td style="padding:6px 0; font-size:14px; color:#1e293b; font-weight:600;">'.htmlspecialchars($program, ENT_QUOTES, "UTF-8").'</td>
                            </tr>
                            <tr>
                                <td style="padding:6px 0; font-size:14px; color:#64748b;">RFID No.</td>
                                <td style="padding:6px 0; font-size:14px; color:#1e293b; font-family:monospace;">'.htmlspecialchars($rfid, ENT_QUOTES, "UTF-8").'</td>
                            </tr>
                            <tr>
                                <td style="padding:6px 0; font-size:14px; color:#64748b;">Status</td>
                                <td style="padding:6px 0;">
                                    <span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:12px; font-size:12px; font-weight:700;">
                                        '.htmlspecialchars($status, ENT_QUOTES, "UTF-8").'
                                    </span>
                                </td>
                            </tr>
                        </table>
                        
                        '.$passwordBlock.'
                    </div>
                </div>

                <!-- Footer note -->
                <p style="color:#8a97aa;font-size:12px;line-height:1.8;margin:16px 0 0;text-align:justify;">
                  This is an automated message from KLASECO. If you did not request this, please contact the administrator immediately.
                </p>
              </div>
            </div>

            <div style="max-width:600px;margin:10px auto 0;text-align:center;color:#8a97aa;font-size:11px;">
              © '.date('Y').' KLASECO • University of Bohol
            </div>
          </div>';

        // ✅ ADDED ONLY: use the new design (old $html above is kept; not removed)
        $html = $html_new;

        // ✅ ADDED ONLY: Plain-text fallback (AltBody)
        $alt = ($mode === 'insert')
          ? "Welcome to KLASECO, {$name}!\nYour Teacher account was activated.\nTeacher ID: {$teacher_id}\nRFID: {$rfid}\nProgram: {$program}\nPhone: {$phone}\nStatus: {$status}\n"
          : "Your KLASECO Teacher profile was updated, {$name}.\nTeacher ID: {$teacher_id}\nRFID: {$rfid}\nProgram: {$program}\nPhone: {$phone}\nStatus: {$status}\n";


        $m = new PHPMailer\PHPMailer\PHPMailer(true);
        $m->CharSet    = 'UTF-8';
        $m->isSMTP();
        $m->Host       = 'smtp.gmail.com';
        $m->SMTPAuth   = true;
        $m->Username   = APP_GMAIL_USER;
        $m->Password   = APP_GMAIL_PASS;
        $m->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $m->Port       = 587;

        $m->setFrom(APP_GMAIL_USER, $fromName);
        $m->addAddress($email);
        $m->addReplyTo(APP_GMAIL_USER, $fromName);
        $m->isHTML(true);
        $m->Subject = $subj;
        $m->Body    = $html;
        $m->AltBody = $alt;
        $m->send();

        $sent_email = true;
      } catch (Throwable $e) {
        error_log('[teachers_save.php][mail] ' . $e->getMessage());
        $warn   = 'email_failed';
        $reason = $e->getMessage();
      }
    } else {
      $warn   = 'email_disabled';
      $reason = 'PHPMailer not found';
    }
  } else {
    $warn   = 'email_disabled';
    $reason = 'Mail credentials missing or mail_ready() undefined';
  }
}
// ✅ ONLY ECHO SUCCESS AFTER EMAIL ATTEMPT
echo json_encode([
    'ok' => true, 
    'msg' => 'Teacher saved successfully.',
    'mode' => $mode,
    'email_sent' => $sent_email
]);
exit;

} catch (Throwable $e) {
    if (ob_get_length()) ob_clean(); // Wipe any partial JSON if an error occurred
    http_response_code(500);
    echo json_encode([
        'ok' => false, 
        'msg' => 'Database error: ' . $e->getMessage()
    ]);
    exit;
}
