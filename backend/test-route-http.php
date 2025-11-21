<?php

/**
 * Test route via actual HTTP request
 */

$ch = curl_init('http://localhost:8000/api/v1/currencies-test');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "=== HTTP Test Results ===\n\n";
echo "URL: http://localhost:8000/api/v1/currencies-test\n";
echo "HTTP Code: $httpCode\n";

if ($error) {
    echo "Error: $error\n";
} else {
    echo "Response: " . substr($response, 0, 200) . "\n";
}

if ($httpCode == 404) {
    echo "\n=== 404 Error Detected ===\n";
    echo "Testing other routes to verify server is working...\n\n";
    
    // Test root route
    $ch2 = curl_init('http://localhost:8000/api/v1/');
    curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch2, CURLOPT_TIMEOUT, 5);
    $response2 = curl_exec($ch2);
    $httpCode2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
    curl_close($ch2);
    
    echo "Root route (/api/v1/): HTTP $httpCode2\n";
    if ($httpCode2 == 200) {
        echo "Server is running, but currencies-test route is not found!\n";
        echo "This means the route is NOT registered in the running server.\n";
    } else {
        echo "Server might not be running or there's a connection issue.\n";
    }
}

