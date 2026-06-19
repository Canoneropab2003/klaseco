<?php
// Run this ONCE to create the super admin
require __DIR__ . '/supabase_conn.php';

$staff_id = "00-0000-000";
$name     = "Administrator";
$position = "Admin";
$email    = "klasecosystem@gmail.com";
$phone    = "240-5235";
$username = "administrator";
$password = "@Admin123";
$role     = "admin";

// Hash password securely
$password_hash = password_hash($password, PASSWORD_DEFAULT);

try {
    $sql = "
        INSERT INTO admins
        (staff_id, name, position, email, phone, username, password_hash, role)
        VALUES
        (:staff_id, :name, :position, :email, :phone, :username, :password_hash, :role)
        RETURNING id;
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':staff_id'      => $staff_id,
        ':name'          => $name,
        ':position'      => $position,
        ':email'         => $email,
        ':phone'         => $phone,
        ':username'      => $username,
        ':password_hash' => $password_hash,
        ':role'          => $role
    ]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row && isset($row['id'])) {
        echo "Super Admin created successfully! Admin ID: " . $row['id'];
    } else {
        echo "Insert completed, but no ID returned.";
    }

} catch (PDOException $e) {
    echo "❌ ERROR: " . $e->getMessage();
}
