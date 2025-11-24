<?php
/**
 * Test CORS Headers Script
 * Run this to verify CORS headers are being set
 * Usage: php test-cors-headers.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

echo "=== Testing CORS Headers ===\n\n";

// Test 1: OPTIONS request to admin endpoint
echo "Test 1: OPTIONS request to /api/v1/admin/landlords\n";
$request1 = Illuminate\Http\Request::create(
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
    $response1 = $kernel->handle($request1);
    echo "Status: " . $response1->getStatusCode() . "\n";
    echo "Headers:\n";
    $corsHeaders = [];
    foreach ($response1->headers->all() as $key => $values) {
        if (str_starts_with(strtolower($key), 'access-control-')) {
            echo "  $key: " . implode(', ', $values) . "\n";
            $corsHeaders[$key] = $values;
        }
    }
    
    if (empty($corsHeaders)) {
        echo "\n❌ NO CORS HEADERS FOUND!\n";
    } else {
        echo "\n✅ CORS headers are present!\n";
    }
    
    $kernel->terminate($request1, $response1);
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 2: OPTIONS request to test endpoint
echo "Test 2: OPTIONS request to /api/v1/cors-options-test\n";
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
    echo "Status: " . $response2->getStatusCode() . "\n";
    echo "Headers:\n";
    $corsHeaders2 = [];
    foreach ($response2->headers->all() as $key => $values) {
        if (str_starts_with(strtolower($key), 'access-control-')) {
            echo "  $key: " . implode(', ', $values) . "\n";
            $corsHeaders2[$key] = $values;
        }
    }
    
    if (empty($corsHeaders2)) {
        echo "\n❌ NO CORS HEADERS FOUND!\n";
    } else {
        echo "\n✅ CORS headers are present!\n";
    }
    
    $kernel->terminate($request2, $response2);
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n=== Test Complete ===\n";

