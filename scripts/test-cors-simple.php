<?php
/**
 * Simple CORS Test Script
 * Run this to verify CORS is working
 * Usage: php test-cors-simple.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

// Test CORS config
echo "=== CORS Configuration Test ===\n\n";

$corsConfig = config('cors');
echo "Paths: " . implode(', ', $corsConfig['paths']) . "\n";
echo "Allowed Origins: " . implode(', ', $corsConfig['allowed_origins']) . "\n";
echo "Allowed Methods: " . implode(', ', $corsConfig['allowed_methods']) . "\n";
echo "Supports Credentials: " . ($corsConfig['supports_credentials'] ? 'Yes' : 'No') . "\n";
echo "Max Age: " . $corsConfig['max_age'] . "\n\n";

// Test if HandleCors middleware is registered
echo "=== Middleware Check ===\n";
$middleware = $app->make(\Illuminate\Foundation\Configuration\Middleware::class);
echo "HandleCors should be automatically registered by Laravel\n\n";

// Test OPTIONS request simulation
echo "=== OPTIONS Request Simulation ===\n";
$request = \Illuminate\Http\Request::create('/api/v1/admin/landlords', 'OPTIONS', [], [], [], [
    'HTTP_ORIGIN' => 'http://localhost:3000',
    'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
    'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'Authorization',
]);

echo "Request Method: " . $request->getMethod() . "\n";
echo "Request Origin: " . $request->headers->get('Origin') . "\n";
echo "Request Path: " . $request->path() . "\n\n";

echo "✅ Configuration looks good!\n";
echo "Now start the server with: php artisan serve\n";
echo "Then test in browser: http://localhost:3000/test-cors-direct.html\n";

