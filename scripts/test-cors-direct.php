<?php
/**
 * Direct CORS Test Script
 * Run this to test if CORS middleware is working
 * Usage: php test-cors-direct.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Simulate an OPTIONS request
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

echo "Testing OPTIONS request to /api/v1/admin/landlords\n";
echo "Origin: http://localhost:3000\n\n";

try {
    $response = $kernel->handle($request);
    
    echo "Response Status: " . $response->getStatusCode() . "\n";
    echo "Response Headers:\n";
    foreach ($response->headers->all() as $key => $values) {
        if (str_starts_with(strtolower($key), 'access-control-')) {
            echo "  $key: " . implode(', ', $values) . "\n";
        }
    }
    
    if ($response->headers->has('Access-Control-Allow-Origin')) {
        echo "\n✅ CORS headers are present!\n";
    } else {
        echo "\n❌ CORS headers are MISSING!\n";
    }
    
    $kernel->terminate($request, $response);
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

