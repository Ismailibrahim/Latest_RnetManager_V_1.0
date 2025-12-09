<?php
// Simple test to verify the signups endpoint is accessible
$ch = curl_init('http://localhost:8000/api/v1/health');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    echo "✓ Backend server is running on http://localhost:8000\n";
    echo "Response: " . substr($response, 0, 100) . "\n";
} else {
    echo "✗ Backend server is not accessible (HTTP $httpCode)\n";
    echo "Make sure to run: cd backend && php artisan serve\n";
}
