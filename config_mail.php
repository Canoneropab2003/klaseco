<?php
define('APP_ADMIN_EMAIL', 'klasecosystem@gmail.com');
define('APP_GMAIL_USER',  'klasecosystem@gmail.com');
define('APP_GMAIL_PASS',  'hqtynkvvefzjugzw');
define('APP_SENDER_NAME', 'Classroom Monitoring');

/**
 * Validates that mail credentials are set and not empty.
 * This allows teachers_save.php to proceed with the PHPMailer block.
 */
function mail_ready() {
    return defined('APP_GMAIL_USER') && defined('APP_GMAIL_PASS') 
           && APP_GMAIL_USER !== '' && APP_GMAIL_PASS !== '';
}