<?php

/**
 * Force reload routes by clearing all caches and testing
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

echo "=== Force Reload Routes Test ===\n\n";

// Clear route cache
$router = $app->make('router');
$router->getRoutes()->refreshNameLookups();
$router->getRoutes()->refreshActionLookups();

// Test the route
$request = \Illuminate\Http\Request::create('/api/v1/currencies-test', 'GET');
$kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle($request);

echo "Route: /api/v1/currencies-test\n";
echo "Status: " . $response->getStatusCode() . "\n";
echo "Response: " . $response->getContent() . "\n\n";

// List all routes
echo "All registered routes with 'currencies':\n";
foreach ($router->getRoutes() as $route) {
    $uri = $route->uri();
    $name = $route->getName() ?? 'unnamed';
    if (strpos($uri, 'currencies') !== false || strpos($name, 'currencies') !== false) {
        echo "  - $name: $uri\n";
    }
}

