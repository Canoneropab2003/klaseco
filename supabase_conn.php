<?php
$host     = 'aws-1-ap-southeast-1.pooler.supabase.com'; 
$port     = '5432';
$dbname   = 'postgres';
$user     = 'postgres.lxdrkiqqqzfiqgnbufjo';
$password = 'Klaseco2025-2026';

$dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";

try {
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    // echo "Connected to Supabase!"; // you can remove this echo in production
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}
