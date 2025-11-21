<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$router = $app->make('router');

echo "=== Route Debug ===\n\n";

// Check what routes are actually registered
echo "All routes containing 'currencies':\n";
$found = false;
foreach ($router->getRoutes() as $route) {
    $uri = $route->uri();
    $name = $route->getName() ?? 'unnamed';
    if (strpos($uri, 'currencies') !== false || strpos($name, 'currencies') !== false) {
        echo "  Name: $name\n";
        echo "  URI: $uri\n";
        echo "  Methods: " . implode(', ', $route->methods()) . "\n";
        echo "  Full path would be: /api/$uri\n";
        echo "\n";
        $found = true;
    }
}

if (!$found) {
    echo "  NO CURRENCY ROUTES FOUND!\n\n";
    echo "Checking all v1 routes:\n";
    foreach ($router->getRoutes() as $route) {
        $uri = $route->uri();
        if (strpos($uri, 'v1') !== false) {
            echo "  - " . ($route->getName() ?? 'unnamed') . ": $uri\n";
        }
    }
}

// Try to match the route
echo "\n=== Trying to match /api/v1/currencies-test ===\n";
$request = \Illuminate\Http\Request::create('/api/v1/currencies-test', 'GET');
try {
    $route = $router->getRoutes()->match($request);
    echo "✓ Matched: " . $route->getName() . "\n";
} catch (\Exception $e) {
    echo "✗ Not matched: " . $e->getMessage() . "\n";
    
    // Try without /api prefix
    echo "\nTrying /v1/currencies-test (without /api):\n";
    $request2 = \Illuminate\Http\Request::create('/v1/currencies-test', 'GET');
    try {
        $route2 = $router->getRoutes()->match($request2);
        echo "✓ Matched: " . $route2->getName() . "\n";
    } catch (\Exception $e2) {
        echo "✗ Not matched: " . $e2->getMessage() . "\n";
    }
}

