<?php
/**
 * Direct CORS test - bypasses Laravel to test if server is reachable
 * Run: php test-cors-direct.php
 */

$url = 'http://localhost:8000/api/v1/settings/system';

echo "Testing direct CORS request to: $url\n\n";

// Test OPTIONS (preflight)
echo "1. Testing OPTIONS request...\n";
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => 'OPTIONS',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_HTTPHEADER => [
        'Origin: http://localhost:3000',
        'Access-Control-Request-Method: GET',
        'Access-Control-Request-Headers: Authorization, Content-Type',
    ],
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$headers = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);

echo "   Status: $httpCode\n";
echo "   Headers:\n";
foreach (explode("\r\n", $headers) as $header) {
    if (!empty($header)) {
        echo "     $header\n";
    }
}

if (strpos($headers, 'Access-Control-Allow-Origin') !== false) {
    echo "   ✓ CORS headers present\n";
} else {
    echo "   ✗ CORS headers MISSING\n";
}

curl_close($ch);

echo "\n2. Testing GET request (without auth)...\n";
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_HTTPHEADER => [
        'Origin: http://localhost:3000',
        'Accept: application/json',
    ],
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$headers = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);

echo "   Status: $httpCode\n";
echo "   Headers:\n";
foreach (explode("\r\n", $headers) as $header) {
    if (!empty($header)) {
        echo "     $header\n";
    }
}

if (strpos($headers, 'Access-Control-Allow-Origin') !== false) {
    echo "   ✓ CORS headers present\n";
} else {
    echo "   ✗ CORS headers MISSING\n";
}

echo "\n   Body (first 200 chars):\n";
echo "   " . substr($body, 0, 200) . "\n";

curl_close($ch);

echo "\n=== Test Complete ===\n";
