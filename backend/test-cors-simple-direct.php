<?php
/**
 * Direct PHP test for CORS headers
 * Run: php test-cors-simple-direct.php
 */

$url = 'http://localhost:8000/api/v1/admin/landlords';

// Create OPTIONS request
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'OPTIONS');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_NOBODY, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Origin: http://localhost:3000',
    'Access-Control-Request-Method: GET',
    'Access-Control-Request-Headers: Content-Type, Authorization',
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$headers = substr($response, 0, $headerSize);

curl_close($ch);

echo "=== CORS Test Results ===\n\n";
echo "URL: $url\n";
echo "Method: OPTIONS\n";
echo "Status Code: $httpCode\n\n";
echo "Response Headers:\n";
echo $headers . "\n\n";

// Check for CORS headers
$corsHeaders = [
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Methods',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Credentials',
];

echo "CORS Headers Check:\n";
foreach ($corsHeaders as $header) {
    if (stripos($headers, $header) !== false) {
        preg_match("/$header:\s*(.+)/i", $headers, $matches);
        echo "  ✅ $header: " . trim($matches[1] ?? 'found') . "\n";
    } else {
        echo "  ❌ $header: MISSING\n";
    }
}

