<?php

/**
 * Direct route test - bypasses artisan
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

echo "Testing route registration...\n\n";

try {
    $kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
    $router = $app->make('router');
    
    // Try to find the route
    $testRoute = $router->getRoutes()->getByName('api.v1.currencies.test');
    
    if ($testRoute) {
        echo "✓ Route 'api.v1.currencies.test' is registered!\n";
        echo "  URI: " . $testRoute->uri() . "\n";
        echo "  Methods: " . implode(', ', $testRoute->methods()) . "\n";
        echo "  Full URL: http://localhost:8000/api/v1/currencies-test\n";
    } else {
        echo "✗ Route 'api.v1.currencies.test' NOT FOUND\n";
        echo "\nAll registered routes:\n";
        foreach ($router->getRoutes() as $route) {
            if (strpos($route->uri(), 'currencies') !== false || strpos($route->getName() ?? '', 'currencies') !== false) {
                echo "  - " . ($route->getName() ?? 'unnamed') . ": " . implode(',', $route->methods()) . " /" . $route->uri() . "\n";
            }
        }
    }
    
    // Test if we can actually call it
    echo "\nTesting route call...\n";
    $request = \Illuminate\Http\Request::create('/api/v1/currencies-test', 'GET');
    $response = $kernel->handle($request);
    
    echo "Response Status: " . $response->getStatusCode() . "\n";
    echo "Response Body: " . $response->getContent() . "\n";
    
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "\nStack trace:\n" . $e->getTraceAsString() . "\n";
}

