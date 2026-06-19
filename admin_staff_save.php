<?php
// api/admin_staff_save.php

declare(strict_types=1);

require __DIR__ . '/../auth.php';
require_role_json('admin'); // only admin can manage admin staff
require __DIR__ . '/../supabase_conn.php'; // provides $pdo

// ✅ ADDED (ONLY): mail config (must NOT output anything)
require __DIR__ . '/../config_mail.php';

nocache_headers();
header('Content-Type: application/json; charset=utf-8');

/* // ✅ ADDED (ONLY): mail helpers (non-breaking)
function mail_ready(): bool {
  return defined('APP_GMAIL_USER') && APP_GMAIL_USER &&
         defined('APP_GMAIL_PASS') && APP_GMAIL_PASS;
} */

/**
 * ✅ ADDED (ONLY): Send email after save (NON-BLOCKING)
 * - Returns true if sent, false otherwise
 * - NEVER echoes/prints
 * - NEVER throws to caller (we catch inside)
 */
function send_admin_staff_email(string $mode, array $data): bool {
  // mode: 'insert' | 'update'
  if (!in_array($mode, ['insert', 'update'], true)) return false;
  if (!mail_ready()) return false;

  $base = realpath(__DIR__ . '/../phpmailer/src');
  $has_phpmailer = $base
    && file_exists($base . '/PHPMailer.php')
    && file_exists($base . '/SMTP.php')
    && file_exists($base . '/Exception.php');

  if (!$has_phpmailer) {
    error_log('[admin_staff_save.php][mail] PHPMailer not found');
    return false;
  }

  require_once $base . '/PHPMailer.php';
  require_once $base . '/SMTP.php';
  require_once $base . '/Exception.php';

  try {
    $name     = (string)($data['name'] ?? '');
    $email    = (string)($data['email'] ?? '');
    $username = (string)($data['username'] ?? '');
    $staff_id = (string)($data['staff_id'] ?? '');
    $position = (string)($data['position'] ?? '');

    if ($email === '') return false;

    $fromName = defined('APP_SENDER_NAME') ? APP_SENDER_NAME : 'KLASECO';

    $subject = ($mode === 'insert')
      ? 'KLASECO — Admin Staff Account Activated'
      : 'KLASECO — Admin Staff Account Updated';

    $title = ($mode === 'insert') ? 'Welcome to KLASECO!' : 'Account Updated';

    $bodyCopy = ($mode === 'insert')
      ? sprintf(
          'Hello %s,<br><br>
           Welcome to KLASECO — University of Bohol.<br>
           This email confirms that your Admin Staff account has been activated by the administrator and is now ready for use.<br><br>
           If you did not make this request, please ignore this message or notify the administrator immediately.',
          htmlspecialchars($name, ENT_QUOTES, 'UTF-8')
        )
      : sprintf(
          'Hello %s,<br><br>
           This email confirms that your Admin Staff account information has been updated by the administrator.<br><br>
           If you did not request or expect this change, please contact the administrator immediately.',
          htmlspecialchars($name, ENT_QUOTES, 'UTF-8')
        );

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
              Admin Staff • Automated Notification
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
                <b>Staff ID:</b> '.htmlspecialchars($staff_id !== '' ? $staff_id : '—', ENT_QUOTES, "UTF-8").'<br/>
                <b>Position:</b> '.htmlspecialchars($position !== '' ? $position : '—', ENT_QUOTES, "UTF-8").'<br/>
                <b>Username:</b> '.htmlspecialchars($username !== '' ? $username : '—', ENT_QUOTES, "UTF-8").'<br/>
                '.(!empty($data['password']) ? '
                <p style="margin:8px 0 0;color:#334155;font-size:14px;line-height:1.8;">
                <b>Temporary Password:</b>
                <span style="background:#f1f5f9;padding:4px 8px;border-radius:6px;
                            font-family:monospace;font-size:13px;">
                    '.htmlspecialchars($data['password'], ENT_QUOTES, "UTF-8").'
                </span>
                </p>
                <p style="color:#b91c1c;font-size:12px;margin-top:6px;">
                Please change your password immediately after logging in.
                </p>
                ' : '').'
              </p>
            </div>

            <!-- Login Button (insert only) -->
            '.($mode === 'insert' ? '
            <div style="text-align:center;margin:20px 0 4px;">
              <a href="https://klaseco.com/login?role=admin"
                 style="display:inline-block;background:linear-gradient(135deg,#0b2241,#163a60);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:10px;letter-spacing:.3px;box-shadow:0 4px 14px rgba(11,34,65,.35);">
                🔐 Log In to KLASECO
              </a>
              <p style="margin:8px 0 0;color:#94a3b8;font-size:11px;">
                <a href="https://klaseco.com/login?role=admin" style="color:#94a3b8;">https://klaseco.com/login?role=admin</a>
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
    error_log('[admin_staff_save.php][mail] ' . $e->getMessage());
    return false;
  }
}

try {
    // ---------------------------------------------------------
    // 1) Read input
    // ---------------------------------------------------------
    $id        = trim($_POST['id']        ?? '');
    $staff_id  = trim($_POST['staff_id']  ?? '');
    $name      = trim($_POST['name']      ?? '');
    $position  = trim($_POST['position']  ?? '');
    $email     = trim($_POST['email']     ?? '');
    $phone     = trim($_POST['phone']     ?? '');
    $username  = trim($_POST['username']  ?? '');
    $password  = trim($_POST['password']  ?? '');

    // Fallback for JSON
    if ($name === '' && $email === '') {
        $json = json_decode(file_get_contents('php://input'), true);
        if (is_array($json)) {
            $id       = trim((string)($json['id']       ?? ''));
            $staff_id = trim((string)($json['staff_id'] ?? ''));
            $name     = trim((string)($json['name']     ?? ''));
            $position = trim((string)($json['position'] ?? ''));
            $email    = trim((string)($json['email']    ?? ''));
            $phone    = trim((string)($json['phone']    ?? ''));
            $username = trim((string)($json['username'] ?? ''));
            $password = trim((string)($json['password'] ?? ''));
        }
    }

    // Define $isUpdate here so it can be used below
    $isUpdate = ($id !== '');
    $idInt = $isUpdate ? (int)$id : 0;

    // ✅ FIXED: Now $isUpdate is defined, so this check works!
    if ($isUpdate && ($password === '' || $password === '********')) {
        $password = '';
        $passwordHash = null; 
    }

    // Validate required fields
    if ($name === '' || $email === '' || $username === '') {
        echo json_encode(['ok' => false, 'msg' => 'Name, email, and username are required.']);
        exit;
    }

    // role is always staff for this module
    $role = 'staff';

    // -----------------------------
    // 2) Are we inserting or updating?
    // -----------------------------
    $isUpdate = ($id !== '');
    $idInt = $isUpdate ? (int)$id : 0;

    if ($isUpdate && $idInt <= 0) {
        echo json_encode([
            'ok'  => false,
            'msg' => 'Invalid record ID for update.',
        ]);
        exit;
    }

    if (!$isUpdate && $password === '') {
        echo json_encode([
            'ok'  => false,
            'msg' => 'Password is required for new admin staff.',
        ]);
        exit;
    }

    $passwordHash = null;
    if ($password !== '') {
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    }

    // -----------------------------
    // 3) Ensure record exists (update only)
    // -----------------------------
    if ($isUpdate) {
        $check = $pdo->prepare("SELECT id FROM admins WHERE id = :id LIMIT 1");
        $check->execute([':id' => $idInt]);
        $exists = $check->fetchColumn();

        if (!$exists) {
            echo json_encode([
                'ok'  => false,
                'msg' => 'Admin staff record not found. Please reload and try again.',
            ]);
            exit;
        }
    }

    // -----------------------------
    // 4) Uniqueness checks (MISSING LOGIC ✅)
    //    Avoids: duplicate key on UPDATE
    // -----------------------------
    // NOTE: your table has unique constraints on staff_id, email, username
    // We check them manually to return clean messages.
    // On update: exclude current row (id <> :id)

    // staff_id (nullable unique)
    if ($staff_id !== '') {
        if ($isUpdate) {
            $q = $pdo->prepare("SELECT 1 FROM admins WHERE staff_id = :staff_id AND id <> :id LIMIT 1");
            $q->execute([':staff_id' => $staff_id, ':id' => $idInt]);
        } else {
            $q = $pdo->prepare("SELECT 1 FROM admins WHERE staff_id = :staff_id LIMIT 1");
            $q->execute([':staff_id' => $staff_id]);
        }
        if ($q->fetchColumn()) {
            echo json_encode([
                'ok'  => false,
                'msg' => 'Staff ID already exists. Please use a different Staff ID.',
                'field' => 'staff_id',
            ]);
            exit;
        }
    }

    // email
    if ($isUpdate) {
        $q = $pdo->prepare("SELECT 1 FROM admins WHERE email = :email AND id <> :id LIMIT 1");
        $q->execute([':email' => $email, ':id' => $idInt]);
    } else {
        $q = $pdo->prepare("SELECT 1 FROM admins WHERE email = :email LIMIT 1");
        $q->execute([':email' => $email]);
    }
    if ($q->fetchColumn()) {
        echo json_encode([
            'ok'  => false,
            'msg' => 'Email already exists. Please use a different email.',
            'field' => 'email',
        ]);
        exit;
    }

    // username
    if ($isUpdate) {
        $q = $pdo->prepare("SELECT 1 FROM admins WHERE username = :username AND id <> :id LIMIT 1");
        $q->execute([':username' => $username, ':id' => $idInt]);
    } else {
        $q = $pdo->prepare("SELECT 1 FROM admins WHERE username = :username LIMIT 1");
        $q->execute([':username' => $username]);
    }
    if ($q->fetchColumn()) {
        echo json_encode([
            'ok'  => false,
            'msg' => 'Username already exists. Please use a different username.',
            'field' => 'username',
        ]);
        exit;
    }

    // -----------------------------
    // 5) UPDATE existing admin staff
    // -----------------------------
    if ($isUpdate) {
        if ($passwordHash !== null) {
            $sql = "
                UPDATE admins
                SET staff_id      = :staff_id,
                    name          = :name,
                    position      = :position,
                    email         = :email,
                    phone         = :phone,
                    username      = :username,
                    password_hash = :password_hash
                WHERE id = :id
            ";
        } else {
            $sql = "
                UPDATE admins
                SET staff_id      = :staff_id,
                    name          = :name,
                    position      = :position,
                    email         = :email,
                    phone         = :phone,
                    username      = :username
                WHERE id = :id
            ";
        }

        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':staff_id', $staff_id !== '' ? $staff_id : null, $staff_id !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':name',     $name,     PDO::PARAM_STR);
        $stmt->bindValue(':position', $position !== '' ? $position : null, $position !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':email',    $email,    PDO::PARAM_STR);
        $stmt->bindValue(':phone',    $phone !== '' ? $phone : null, $phone !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':username', $username, PDO::PARAM_STR);
        $stmt->bindValue(':id',       $idInt,    PDO::PARAM_INT);

        if ($passwordHash !== null) {
            $stmt->bindValue(':password_hash', $passwordHash, PDO::PARAM_STR);
        }

        $stmt->execute();

        // ✅ ADDED (ONLY): send email after successful UPDATE (non-blocking)
        send_admin_staff_email('update', [
          'name'     => $name,
          'email'    => $email,
          'username' => $username,
          'staff_id' => $staff_id,
          'position' => $position,
          'password' => $password !== '' ? $password : '',
        ]);

        echo json_encode([
            'ok'  => true,
            'msg' => 'Admin staff updated successfully.',
            'id'  => $idInt,
        ]);
        exit;
    }

    // -----------------------------
    // 6) INSERT new admin staff
    // -----------------------------
    $sql = "
        INSERT INTO admins
            (staff_id, name, position, email, phone, username, password_hash, role)
        VALUES
            (:staff_id, :name, :position, :email, :phone, :username, :password_hash, :role)
        RETURNING id
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':staff_id',      $staff_id !== '' ? $staff_id : null, $staff_id !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
    $stmt->bindValue(':name',          $name,          PDO::PARAM_STR);
    $stmt->bindValue(':position',      $position !== '' ? $position : null, $position !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
    $stmt->bindValue(':email',         $email,         PDO::PARAM_STR);
    $stmt->bindValue(':phone',         $phone !== '' ? $phone : null, $phone !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
    $stmt->bindValue(':username',      $username,      PDO::PARAM_STR);
    $stmt->bindValue(':password_hash', (string)$passwordHash,  PDO::PARAM_STR);
    $stmt->bindValue(':role',          $role,          PDO::PARAM_STR);

    $stmt->execute();
    $newId = $stmt->fetchColumn();

    // ✅ ADDED (ONLY): send email after successful INSERT (non-blocking)
    send_admin_staff_email('insert', [
      'name'     => $name,
      'email'    => $email,
      'username' => $username,
      'staff_id' => $staff_id,
      'position' => $position,
      'password' => $password,
    ]);

    echo json_encode([
        'ok'  => true,
        'msg' => 'Admin staff added successfully.',
        'id'  => $newId,
    ]);
    exit;

} catch (PDOException $e) {
    // ✅ Friendly unique-constraint handling (Postgres)
    if ($e->getCode() === '23505') {
        http_response_code(409);
        echo json_encode([
            'ok'  => false,
            'msg' => 'Duplicate value detected (Staff ID / Email / Username already exists).',
            'error' => $e->getMessage(),
        ]);
        exit;
    }

    http_response_code(500);
    echo json_encode([
        'ok'   => false,
        'msg'  => 'Database error while saving admin staff.',
        'error'=> $e->getMessage(),
    ]);
    exit;
}