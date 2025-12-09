<?php
/**
 * Test script to verify settings/system route is accessible
 * Run: php test-settings-route.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

echo "=== Testing Settings/System Route ===\n\n";

// Test 1: OPTIONS request (preflight)
echo "1. Testing OPTIONS request (CORS preflight)...\n";
$optionsRequest = Illuminate\Http\Request::create('/api/v1/settings/system', 'OPTIONS', [], [], [], [
    'HTTP_ORIGIN' => 'http://localhost:3000',
    'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
    'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'Authorization, Content-Type',
]);

try {
    $startTime = microtime(true);
    $response = $kernel->handle($optionsRequest);
    $duration = microtime(true) - $startTime;
    
    echo "   Status: " . $response->getStatusCode() . "\n";
    echo "   Duration: " . round($duration * 1000, 2) . "ms\n";
    echo "   CORS Headers:\n";
    foreach (['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers'] as $header) {
        $value = $response->headers->get($header);
        echo "     $header: " . ($value ?? 'NOT SET') . "\n";
    }
    echo "   ✓ OPTIONS request succeeded\n\n";
} catch (\Exception $e) {
    echo "   ✗ OPTIONS request failed: " . $e->getMessage() . "\n\n";
}

// Test 2: GET request without auth (should fail with 401)
echo "2. Testing GET request without authentication...\n";
$getRequest = Illuminate\Http\Request::create('/api/v1/settings/system', 'GET', [], [], [], [
    'HTTP_ACCEPT' => 'application/json',
    'HTTP_ORIGIN' => 'http://localhost:3000',
]);

try {
    $startTime = microtime(true);
    $response = $kernel->handle($getRequest);
    $duration = microtime(true) - $startTime;
    
    echo "   Status: " . $response->getStatusCode() . "\n";
    echo "   Duration: " . round($duration * 1000, 2) . "ms\n";
    if ($response->getStatusCode() === 401) {
        echo "   ✓ Correctly returned 401 (unauthorized)\n\n";
    } else {
        echo "   ⚠ Unexpected status code\n\n";
    }
} catch (\Exception $e) {
    echo "   ✗ GET request failed: " . $e->getMessage() . "\n";
    echo "   Duration: " . round((microtime(true) - $startTime) * 1000, 2) . "ms\n\n";
}

// Test 3: Check route registration
echo "3. Checking route registration...\n";
$router = $app->make('router');
$routes = $router->getRoutes();

$foundSettingsRoute = false;
foreach ($routes as $route) {
    $uri = $route->uri();
    if (strpos($uri, 'settings/system') !== false) {
        $foundSettingsRoute = true;
        echo "   Found route: " . ($route->getName() ?? 'unnamed') . "\n";
        echo "   URI: $uri\n";
        echo "   Methods: " . implode(', ', $route->methods()) . "\n";
        echo "   Middleware: " . implode(', ', $route->middleware()) . "\n";
    }
}

if (!$foundSettingsRoute) {
    echo "   ✗ No settings/system route found!\n";
}

echo "\n=== Test Complete ===\n";
