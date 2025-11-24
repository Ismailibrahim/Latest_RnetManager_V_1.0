<?php
/**
 * Test CORS Headers - Run this to verify CORS is working
 * Usage: php test-cors-now.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

echo "=== Testing CORS Configuration ===\n\n";

// Test 1: Check config
echo "1. Checking CORS config...\n";
$corsConfig = config('cors');
echo "   Paths: " . implode(', ', $corsConfig['paths']) . "\n";
echo "   Allowed Origins: " . implode(', ', $corsConfig['allowed_origins']) . "\n";
echo "   Allowed Methods: " . implode(', ', $corsConfig['allowed_methods']) . "\n";
echo "   Supports Credentials: " . ($corsConfig['supports_credentials'] ? 'Yes' : 'No') . "\n";
echo "\n";

// Test 2: OPTIONS request to admin endpoint
echo "2. Testing OPTIONS request to /api/v1/admin/landlords\n";
$request = Illuminate\Http\Request::create(
    '/api/v1/admin/landlords',
    'OPTIONS',
    [],
    [],
    [],
    [
        'HTTP_Origin' => 'http://localhost:3000',
        'HTTP_Access-Control-Request-Method' => 'GET',
        'HTTP_Access-Control-Request-Headers' => 'Authorization, Accept',
    ]
);

try {
    $response = $kernel->handle($request);
    echo "   Status: " . $response->getStatusCode() . "\n";
    
    $corsHeaders = [];
    foreach ($response->headers->all() as $key => $values) {
        if (str_starts_with(strtolower($key), 'access-control-')) {
            $corsHeaders[$key] = $values;
            echo "   ✅ $key: " . implode(', ', $values) . "\n";
        }
    }
    
    if (empty($corsHeaders)) {
        echo "   ❌ NO CORS HEADERS FOUND!\n";
        echo "   All response headers:\n";
        foreach ($response->headers->all() as $key => $values) {
            echo "      $key: " . implode(', ', $values) . "\n";
        }
    } else {
        echo "   ✅ CORS headers are present!\n";
    }
    
    $kernel->terminate($request, $response);
} catch (\Exception $e) {
    echo "   ❌ Error: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

echo "\n";

// Test 3: OPTIONS request to test endpoint
echo "3. Testing OPTIONS request to /api/v1/cors-options-test\n";
$request2 = Illuminate\Http\Request::create(
    '/api/v1/cors-options-test',
    'OPTIONS',
    [],
    [],
    [],
    [
        'HTTP_Origin' => 'http://localhost:3000',
    ]
);

try {
    $response2 = $kernel->handle($request2);
    echo "   Status: " . $response2->getStatusCode() . "\n";
    
    $corsHeaders2 = [];
    foreach ($response2->headers->all() as $key => $values) {
        if (str_starts_with(strtolower($key), 'access-control-')) {
            $corsHeaders2[$key] = $values;
            echo "   ✅ $key: " . implode(', ', $values) . "\n";
        }
    }
    
    if (empty($corsHeaders2)) {
        echo "   ❌ NO CORS HEADERS FOUND!\n";
    } else {
        echo "   ✅ CORS headers are present!\n";
    }
    
    $kernel->terminate($request2, $response2);
} catch (\Exception $e) {
    echo "   ❌ Error: " . $e->getMessage() . "\n";
}

echo "\n=== Test Complete ===\n";
echo "\nIf CORS headers are missing, check:\n";
echo "1. Is APP_ENV=local in .env?\n";
echo "2. Are caches cleared? (run: php artisan config:clear)\n";
echo "3. Is backend server restarted?\n";
echo "4. Check Laravel logs for 'CORS Middleware: RUNNING'\n";

