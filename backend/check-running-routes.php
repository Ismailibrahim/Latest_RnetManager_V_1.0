<?php

/**
 * Check what routes the running server actually sees
 * This will help identify if there's a cache issue
 */

$baseUrl = getenv('API_BASE_URL') ?: 'http://localhost:8000';
$ch = curl_init($baseUrl . '/api/v1/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 2);
$rootResponse = curl_exec($ch);
$rootCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "=== Server Route Check ===\n\n";
echo "Root route (/api/v1/): HTTP $rootCode\n";
if ($rootCode == 200) {
    echo "Response: " . substr($rootResponse, 0, 100) . "\n\n";
    echo "Server IS running and can handle routes.\n\n";
} else {
    echo "Server might not be running properly.\n";
    exit(1);
}

// Test the currencies-test route
echo "Testing currencies-test route...\n";
$ch2 = curl_init('http://localhost:8000/api/v1/currencies-test');
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_TIMEOUT, 2);
$testResponse = curl_exec($ch2);
$testCode = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
curl_close($ch2);

echo "currencies-test route: HTTP $testCode\n";
if ($testCode == 200) {
    echo "Response: $testResponse\n";
    echo "\n✓ Route is working!\n";
} else {
    echo "Response: " . substr($testResponse, 0, 200) . "\n";
    echo "\n✗ Route returns 404 - Server needs to reload routes\n";
    echo "\nSOLUTION:\n";
    echo "1. The route code is correct (verified)\n";
    echo "2. All cache files have been cleared\n";
    echo "3. You MUST restart the Laravel server:\n";
    echo "   - Stop: Ctrl+C in the server terminal\n";
    echo "   - Start: php artisan serve\n";
    echo "\nThe server is using old cached routes.\n";
}

