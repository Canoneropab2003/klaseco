<?php
$ch = curl_init("https://api.supabase.com");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_exec($ch);

if (curl_errno($ch)) {
    echo "CURL ERROR: " . curl_error($ch);
} else {
    echo "OK - Connected to Supabase";
}
curl_close($ch);
