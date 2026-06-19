<?php
// api/maintenance_save.php
declare(strict_types=1);

require __DIR__ . '/../auth.php';
require_role('admin');
require __DIR__ . '/supabase_conn.php';

header('Content-Type: application/json; charset=utf-8');

// ✅ ADDED ONLY: mail config (must NOT output anything)
require __DIR__ . '/../config_mail.php';

// ✅ ADDED ONLY: mail_ready helper (safe)
if (!function_exists('mail_ready')) {
    function mail_ready(): bool {
        return defined('APP_GMAIL_USER') && APP_GMAIL_USER &&
               defined('APP_GMAIL_PASS') && APP_GMAIL_PASS;
    }
}

/**
 * ✅ ADDED ONLY: Send email after save (NON-BLOCKING)
 * - mode: 'insert' | 'update'
 * - NEVER echoes/prints
 * - NEVER throws outward (we catch inside)
 */
if (!function_exists('send_maintenance_email')) {
    function send_maintenance_email(string $mode, array $data): bool {
        if (!in_array($mode, ['insert', 'update'], true)) return false;
        if (!function_exists('mail_ready') || !mail_ready()) return false;

        $base = realpath(__DIR__ . '/../phpmailer/src');
        $has_phpmailer = $base
            && file_exists($base . '/PHPMailer.php')
            && file_exists($base . '/SMTP.php')
            && file_exists($base . '/Exception.php');

        if (!$has_phpmailer) {
            error_log('[maintenance_save.php][mail] PHPMailer not found');
            return false;
        }

        require_once $base . '/PHPMailer.php';
        require_once $base . '/SMTP.php';
        require_once $base . '/Exception.php';

        try {
            $maint_id  = (string)($data['maint_id'] ?? '');
            $name      = (string)($data['name'] ?? '');
            $role      = (string)($data['role'] ?? '');
            $email     = (string)($data['email'] ?? '');
            $phone     = (string)($data['phone'] ?? '');
            $username  = (string)($data['username'] ?? '');
            $password  = (string)($data['password'] ?? ''); // optional for update

            if ($email === '') return false;

            $fromName = defined('APP_SENDER_NAME') ? APP_SENDER_NAME : 'Classroom Monitoring';

            $subject = ($mode === 'insert')
                ? 'KLASECO — Maintenance Account Activated'
                : 'KLASECO — Maintenance Account Updated';

            $title = ($mode === 'insert') ? 'Welcome to KLASECO!' : 'Account Updated';

            $bodyCopy = ($mode === 'insert')
                ? sprintf(
                    'Hello %s,<br><br>
                     Thank you for registering as <b>%s</b> in the University of Bohol.<br>
                     We appreciate your commitment to keeping our learning spaces safe, clean, and efficient.<br><br>
                     This email confirms that your account has been activated by the administrator and is now ready for use.<br><br>
                     If you did not make this request, please ignore this message or notify the administrator immediately.',
                    htmlspecialchars($name, ENT_QUOTES, 'UTF-8'),
                    htmlspecialchars($role, ENT_QUOTES, 'UTF-8')
                  )
                : sprintf(
                    'Hello %s,<br><br>
                     This email confirms that your <b>%s</b> account information has been updated by the administrator.<br><br>
                     If you did not request or expect this change, please contact the administrator immediately.',
                    htmlspecialchars($name, ENT_QUOTES, 'UTF-8'),
                    htmlspecialchars($role, ENT_QUOTES, 'UTF-8')
                  );

            $passwordBlock = '';
            if ($password !== '') {
                $passwordBlock = '
                  <p style="margin:8px 0 0;color:#334155;font-size:14px;line-height:1.8;">
                    <b>Temporary Password:</b>
                    <span style="background:#f1f5f9;padding:4px 8px;border-radius:6px;font-family:monospace;font-size:13px;">
                      '.htmlspecialchars($password, ENT_QUOTES, "UTF-8").'
                    </span>
                  </p>
                  <p style="color:#b91c1c;font-size:12px;margin-top:6px;">
                    Please change your password immediately after logging in.
                  </p>';
            }

            $html = '
              <div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f3f6fb;padding:20px 14px;">
                <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e6ebf3;border-radius:16px;overflow:hidden;box-shadow:0 10px 28px rgba(2,6,23,.06);">
                  
                  <!-- Header -->
                  <div style="background:linear-gradient(135deg,#0b2241 0%,#0a1e39 60%,#081a31 100%);padding:18px 18px 14px;">
                    <div style="height:4px;background:#f97316;border-radius:999px 999px 0 0;margin:0 0 12px 0;"></div>
                    <h2 style="margin:0;color:#eaf2ff;font-size:20px;letter-spacing:.2px;text-align:justify;">
                      '.$title.'
                    </h2>
                    <p style="margin:8px 0 0;color:#c7d6ea;font-size:12px;line-height:1.6;text-align:justify;">
                      Maintenance Team • Automated Notification
                    </p>
                  </div>

                  <!-- Body -->
                  <div style="padding:18px;">
                    <p style="color:#334155;font-size:14px;line-height:1.9;margin:0 0 12px;text-align:justify;">
                      '.$bodyCopy.'
                    </p>

                    <!-- Account Details Card -->
                    <div style="background:#ffffff;border:1px solid #e6ebf3;border-radius:12px;padding:14px 16px;margin:14px 0 0;">
                      <div style="font-size:14px;color:#0f172a;margin:0 0 8px;font-weight:700;">Account Details</div>
                      <p style="margin:0;color:#334155;font-size:14px;line-height:1.8;text-align:justify;">
                        <b>Maintenance ID:</b> '.htmlspecialchars($maint_id !== '' ? $maint_id : '—', ENT_QUOTES, "UTF-8").'<br/>
                        <b>Role:</b> '.htmlspecialchars($role !== '' ? $role : '—', ENT_QUOTES, "UTF-8").'<br/>
                        <b>Username:</b> '.htmlspecialchars($username !== '' ? $username : '—', ENT_QUOTES, "UTF-8").'<br/>
                        <b>Phone:</b> '.htmlspecialchars($phone !== '' ? $phone : '—', ENT_QUOTES, "UTF-8").'
                      </p>
                      '.$passwordBlock.'
                      <p style="margin:10px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
                        (For security reasons, keep your login details private.)
                      </p>
                    </div>

                    '.($mode === 'insert' ? '
                    <!-- Login Button (insert only) -->
                    <div style="text-align:center;margin:20px 0 4px;">
                      <a href="https://klaseco.com/login?role=maintenance"
                         style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea6c0a);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:10px;letter-spacing:.3px;box-shadow:0 4px 14px rgba(249,115,22,.35);">
                        🔐 Log In to KLASECO
                      </a>
                      <p style="margin:8px 0 0;color:#94a3b8;font-size:11px;">
                        <a href="https://klaseco.com/login?role=maintenance" style="color:#94a3b8;">https://klaseco.com/login?role=maintenance</a>
                      </p>
                    </div>
                    ' : '').'

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
            $m->Subject = $subject;
            $m->Body    = $html;

            $m->send();
            return true;

        } catch (Throwable $e) {
            error_log('[maintenance_save.php][mail] ' . $e->getMessage());
            return false;
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'msg' => 'Method not allowed']);
    exit;
}

// Gather & trim fields
$id       = isset($_POST['id']) ? trim($_POST['id']) : '';
$maint_id = isset($_POST['maint_id']) ? trim($_POST['maint_id']) : '';
$name     = isset($_POST['name']) ? trim($_POST['name']) : '';
$role     = isset($_POST['role']) ? trim($_POST['role']) : '';
$email    = isset($_POST['email']) ? trim($_POST['email']) : '';
$phone    = isset($_POST['phone']) ? trim($_POST['phone']) : '';
$username = isset($_POST['username']) ? trim($_POST['username']) : '';
$password = isset($_POST['password']) ? (string)$_POST['password'] : '';

// Basic validation
if ($maint_id === '' || $name === '' || $role === '' || $email === '' || $username === '') {
    echo json_encode(['ok' => false, 'msg' => 'All fields except password are required.']);
    exit;
}

try {
    
    if ($id !== '' && ($password === '********' || $password === '')) {
        $password = '';
    }
    
    if ($id === '') {
        // INSERT (password is required here)
        if ($password === '') {
            echo json_encode(['ok' => false, 'msg' => 'Password is required for new maintenance accounts.']);
            exit;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);

        $sql = "
    INSERT INTO maintenance_users
        (maint_id, name, role, email, phone, username, password_hash)
    VALUES
        (:maint_id, :name, :role, :email, :phone, :username, :password_hash)
";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':maint_id'      => $maint_id,
            ':name'          => $name,
            ':role'          => $role,
            ':email'         => $email,
            ':phone'         => $phone,          // ✅ NEW
            ':username'      => $username,
            ':password_hash' => $hash,
        ]);

        // ✅ ADDED ONLY: send email after successful INSERT (non-blocking)
        if (function_exists('send_maintenance_email')) {
            send_maintenance_email('insert', [
                'maint_id'  => $maint_id,
                'name'      => $name,
                'role'      => $role,
                'email'     => $email,
                'phone'     => $phone,
                'username'  => $username,
                'password'  => $password,
            ]);
        }

        echo json_encode([
            'ok'  => true,
            'msg' => 'Maintenance account added.',
        ]);
    } else {
        // UPDATE (password optional: only update if not empty)
        if ($password !== '') {
            $hash = password_hash($password, PASSWORD_DEFAULT);

            $sql = "
    UPDATE maintenance_users
    SET
        maint_id      = :maint_id,
        name          = :name,
        role          = :role,
        email         = :email,
        phone         = :phone,          -- ✅ NEW
        username      = :username,
        password_hash = :password_hash,
        updated_at    = NOW()
    WHERE id = :id
";
            $params = [
                ':maint_id'      => $maint_id,
                ':name'          => $name,
                ':role'          => $role,
                ':email'         => $email,
                ':phone'         => $phone,          // ✅ NEW
                ':username'      => $username,
                ':password_hash' => $hash,
                ':id'            => (int)$id,
            ];

        } else {
            $sql = "
    UPDATE maintenance_users
    SET
        maint_id   = :maint_id,
        name       = :name,
        role       = :role,
        email      = :email,
        phone      = :phone,             -- ✅ NEW
        username   = :username,
        updated_at = NOW()
    WHERE id = :id
";
            $params = [
                ':maint_id' => $maint_id,
                ':name'     => $name,
                ':role'     => $role,
                ':email'    => $email,
                ':phone'    => $phone,              // ✅ NEW
                ':username' => $username,
                ':id'       => (int)$id,
            ];

        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // ✅ ADDED ONLY: send email after successful UPDATE (include password only if changed)
        if (function_exists('send_maintenance_email')) {
            send_maintenance_email('update', [
                'maint_id'  => $maint_id,
                'name'      => $name,
                'role'      => $role,
                'email'     => $email,
                'phone'     => $phone,
                'username'  => $username,
                'password'  => ($password !== '' ? $password : ''),
            ]);
        }

        echo json_encode([
            'ok'  => true,
            'msg' => 'Maintenance account updated.',
        ]);
    }
} catch (PDOException $e) {
    // Unique constraint handling + debug
    $msg = 'Database error.';

    if ($e->getCode() === '23505') {
        $detail = $e->getMessage();
        if (str_contains($detail, 'maintenance_users_email_key')) {
            $msg = 'Email is already registered for another maintenance account.';
        } elseif (str_contains($detail, 'maintenance_users_username_key')) {
            $msg = 'Username is already taken by another maintenance account.';
        }
    } else {
        // For debugging while developing – you can remove this line later if you want.
        $msg .= ' ' . $e->getMessage();
    }

    http_response_code(400);
    echo json_encode(['ok' => false, 'msg' => $msg]);
}