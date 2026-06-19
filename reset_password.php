<?php
// reset_password.php
require_once __DIR__ . '/api/supabase_conn.php';

$token = $_GET['token'] ?? '';
$email = $_GET['email'] ?? '';
$error = '';
$success = '';

// 1. Verify Token and Email exist in DB
$tables = ['admins', 'maintenance_users'];
$foundUser = null;
$foundTable = '';

if ($token && $email) {
    foreach ($tables as $table) {
        $stmt = $pdo->prepare("SELECT id, token_expiry FROM public.$table WHERE email = :e AND reset_token = :t LIMIT 1");
        $stmt->execute([':e' => $email, ':t' => $token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            // Check Expiry
            if (strtotime($user['token_expiry']) < time()) {
                $error = "This reset link has expired.";
            } else {
                $foundUser = $user;
                $foundTable = $table;
            }
            break;
        }
    }
    if (!$foundUser && !$error) {
        $error = "Invalid reset link.";
    }
} else {
    $error = "Missing reset information.";
}

// 2. Handle Password Update
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $foundUser) {
    $pass = $_POST['new_password'] ?? '';
    $conf = $_POST['confirm_password'] ?? '';

    if (strlen($pass) < 8) {
        $error = "Password must be at least 8 characters.";
    } elseif ($pass !== $conf) {
        $error = "Passwords do not match.";
    } else {
        $hash = password_hash($pass, PASSWORD_DEFAULT);
        // Update password and clear token
        $update = $pdo->prepare("UPDATE public.$foundTable SET password_hash = :h, reset_token = NULL, token_expiry = NULL WHERE id = :id");
        if ($update->execute([':h' => $hash, ':id' => $foundUser['id']])) {
            $success = "Password updated! You can now log in.";
        } else {
            $error = "Database error. Please try again.";
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KLASECO | Reset Password</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        :root {
            --primary-teal: #12909a;
            --secondary-teal: #0d6e76;
            --accent-cyan: #64e9f2;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: radial-gradient(circle at center, var(--primary-teal) 0%, var(--secondary-teal) 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .reset-container {
            width: 100%;
            max-width: 400px;
            background: #ffffff;
            padding: 50px 35px;
            border-radius: 45px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.25);
            text-align: center;
            box-sizing: border-box;
        }

        .logo-wrapper { margin-bottom: 25px; }
        .main-logo { width: 75px; height: auto; display: block; margin: 0 auto 10px auto; }
        .brand-name { font-weight: 800; color: var(--secondary-teal); text-transform: uppercase; letter-spacing: 3px; font-size: 1.1rem; margin: 0; }
        .brand-tagline { font-size: 0.65rem; color: #aaa; letter-spacing: 1px; text-transform: uppercase; display: block; margin-top: 4px; }

        h2 { color: #334155; font-size: 1.5rem; margin: 20px 0 10px 0; }
        p { color: #64748b; font-size: 0.85rem; line-height: 1.6; margin-bottom: 30px; }

        .input-group {
            position: relative;
            margin-bottom: 15px;
        }

        input {
            width: 100%;
            padding: 16px 50px 16px 24px;
            background-color: #f1f5f9;
            border: 2px solid transparent;
            border-radius: 30px;
            box-sizing: border-box;
            font-size: 0.95rem;
            color: #1e293b;
            outline: none;
            transition: all 0.2s ease;
        }

        input:focus {
            background-color: #fff;
            border-color: var(--accent-cyan);
            box-shadow: 0 0 0 4px rgba(100, 233, 242, 0.15);
        }

        .toggle-password {
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: #94a3b8;
            transition: color 0.3s;
        }

        .toggle-password:hover {
            color: var(--primary-teal);
        }

        button {
            width: 100%;
            padding: 16px;
            margin-top: 15px;
            background: var(--accent-cyan);
            color: #0d4a4e;
            border: none;
            border-radius: 30px;
            cursor: pointer;
            font-weight: 800;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            transition: 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        button:hover {
            filter: brightness(1.05);
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(100, 233, 242, 0.3);
        }

        /* Loading Spinner CSS */
        .spinner {
            display: none; /* Hidden by default */
            border: 3px solid rgba(13, 74, 78, 0.3);
            border-radius: 50%;
            border-top: 3px solid #0d4a4e;
            width: 18px;
            height: 18px;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        button:disabled {
            background: #cbd5e1;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .back-link {
            display: inline-block;
            margin-top: 30px;
            color: #94a3b8;
            text-decoration: none;
            font-size: 0.8rem;
            font-weight: 500;
        }

        .alert {
            padding: 10px;
            border-radius: 10px;
            margin-bottom: 15px;
            font-size: 0.85rem;
        }
        .error { background: #fee2e2; color: #b91c1c; }
        .success { background: #dcfce7; color: #15803d; }

        @media (max-width: 480px) {
            .reset-container {
                width: calc(100% - 40px); 
                margin: 20px auto; 
                padding: 40px 25px;
                border-radius: 35px;
            }
        }
    </style>
</head>
<body>
    <div class="reset-container">
        <div class="logo-wrapper">
            <img src="assets/img/logo.png" alt="Klaseco Logo" class="main-logo" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3413/3413535.png';">
            <h1 class="brand-name">KLASECO</h1>
            <span class="brand-tagline">Smart Classroom Portal</span>
        </div>

        <h2>Reset Password</h2>
        
        <?php if($error): ?>
            <div class="alert error"><?php echo $error; ?></div>
        <?php endif; ?>

        <?php if($success): ?>
            <div class="alert success"><?php echo $success; ?></div>
        <?php endif; ?>

        <?php if(!$success && $foundUser): ?>
            <p>Enter a new password for <br><strong><?php echo htmlspecialchars($email); ?></strong></p>

            <form method="POST" id="resetForm" onsubmit="return handleFormSubmit(this)">
                <div class="input-group">
                    <input type="password" name="new_password" id="new_password" placeholder="New Password" required>
                    <i class="fas fa-eye toggle-password" onclick="togglePassword('new_password', this)"></i>
                </div>
                <div class="input-group">
                    <input type="password" name="confirm_password" id="confirm_password" placeholder="Confirm Password" required>
                    <i class="fas fa-eye toggle-password" onclick="togglePassword('confirm_password', this)"></i>
                </div>
                <button type="submit" id="submitBtn">
                    <span class="spinner" id="btnSpinner"></span>
                    <span id="btnText">Update Password</span>
                </button>
            </form>
        <?php endif; ?>

        <a href="login.php" class="back-link">← Back to Login</a>
    </div>

    <script>
        // Form Submission Logic for Animation
        function handleFormSubmit(form) {
            const btn = document.getElementById('submitBtn');
            const spinner = document.getElementById('btnSpinner');
            const btnText = document.getElementById('btnText');

            // Disable button and show spinner
            btn.disabled = true;
            spinner.style.display = "inline-block";
            btnText.innerText = "Updating...";

            return true; // Allows form to submit to PHP
        }

        function togglePassword(inputId, icon) {
            const input = document.getElementById(inputId);
            if (input.type === "password") {
                input.type = "text";
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            } else {
                input.type = "password";
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }
        }

        // Pop box trigger on success
        <?php if($success): ?>
        Swal.fire({
            title: 'Success!',
            text: '<?php echo $success; ?>',
            icon: 'success',
            confirmButtonColor: '#12909a',
            confirmButtonText: 'Login Now'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = 'login.php';
            }
        });
        <?php endif; ?>
    </script>
</body>
</html>