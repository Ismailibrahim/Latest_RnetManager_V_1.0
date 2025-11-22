<?php

// Check what routes the server actually has registered
$baseUrl = getenv('API_BASE_URL') ?: 'http://localhost:8000';
$ch = curl_init($baseUrl . '/api/v1/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 2);
$rootResponse = curl_exec($ch);
$rootCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "=== Server Route Check ===\n\n";
echo "Root route status: $rootCode\n";

if ($rootCode == 200) {
    echo "Server is running\n\n";
    
    // Test currencies-test
    echo "Testing /api/v1/currencies-test...\n";
    $ch2 = curl_init($baseUrl . '/api/v1/currencies-test');
    curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch2, CURLOPT_TIMEOUT, 2);
    $testResponse = curl_exec($ch2);
    $testCode = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
    curl_close($ch2);
    
    echo "Status: $testCode\n";
    echo "Response: " . substr($testResponse, 0, 200) . "\n";
    
    if ($testCode == 404) {
        echo "\n❌ Route still returns 404\n";
        echo "This means the route is NOT in the routes file that the server loaded.\n";
        echo "\nLet me verify the route is actually in the file...\n";
        
        $routesContent = file_get_contents(__DIR__ . '/routes/api.php');
        if (strpos($routesContent, 'currencies-test') !== false) {
            echo "✓ Route code IS in routes/api.php\n";
            echo "⚠ But server doesn't see it - server might be using a cached/old version\n";
        } else {
            echo "✗ Route code NOT found in routes/api.php\n";
        }
    } else {
        echo "\n✅ Route is working!\n";
    }
} else {
    echo "Server might not be running properly\n";
}

