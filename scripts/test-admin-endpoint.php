<?php

/**
 * Quick test script to verify admin endpoint is accessible
 * Run: php test-admin-endpoint.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);

echo "Testing admin endpoint...\n\n";

// Test 1: CORS test endpoint (no auth)
echo "1. Testing CORS endpoint (no auth required)...\n";
$request = \Illuminate\Http\Request::create('/api/v1/cors-test', 'GET');
$request->headers->set('Origin', 'http://localhost:3000');
$response = $kernel->handle($request);
echo "   Status: " . $response->getStatusCode() . "\n";
echo "   CORS Headers:\n";
foreach (['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers'] as $header) {
    $value = $response->headers->get($header);
    echo "     $header: " . ($value ?: 'NOT SET') . "\n";
}
echo "\n";

// Test 2: Admin endpoint route exists
echo "2. Checking if admin route exists...\n";
$router = $app->make('router');
$adminRoute = $router->getRoutes()->getByName('api.v1.admin.landlords.index');
if ($adminRoute) {
    echo "   ✅ Route exists: " . $adminRoute->uri() . "\n";
    echo "   Methods: " . implode(', ', $adminRoute->methods()) . "\n";
} else {
    echo "   ❌ Route NOT FOUND!\n";
}
echo "\n";

// Test 3: Test OPTIONS preflight
echo "3. Testing OPTIONS preflight request...\n";
$optionsRequest = \Illuminate\Http\Request::create('/api/v1/admin/landlords', 'OPTIONS');
$optionsRequest->headers->set('Origin', 'http://localhost:3000');
$optionsRequest->headers->set('Access-Control-Request-Method', 'GET');
$optionsRequest->headers->set('Access-Control-Request-Headers', 'Authorization, Accept');
$optionsResponse = $kernel->handle($optionsRequest);
echo "   Status: " . $optionsResponse->getStatusCode() . "\n";
echo "   CORS Headers:\n";
foreach (['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers'] as $header) {
    $value = $optionsResponse->headers->get($header);
    echo "     $header: " . ($value ?: 'NOT SET') . "\n";
}
echo "\n";

// Test 4: Test actual GET request (will fail auth, but should get CORS headers)
echo "4. Testing GET request (will fail auth, but should have CORS headers)...\n";
$getRequest = \Illuminate\Http\Request::create('/api/v1/admin/landlords', 'GET');
$getRequest->headers->set('Origin', 'http://localhost:3000');
$getRequest->headers->set('Accept', 'application/json');
$getResponse = $kernel->handle($getRequest);
echo "   Status: " . $getResponse->getStatusCode() . "\n";
echo "   CORS Headers:\n";
foreach (['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers'] as $header) {
    $value = $getResponse->headers->get($header);
    echo "     $header: " . ($value ?: 'NOT SET') . "\n";
}
$content = $getResponse->getContent();
if ($content) {
    $data = json_decode($content, true);
    echo "   Response: " . ($data['message'] ?? 'Unknown') . "\n";
}
echo "\n";

echo "=== Test Complete ===\n";
echo "\nIf CORS headers are NOT SET, the middleware is not running correctly.\n";
echo "If route is NOT FOUND, check routes/api.php\n";

