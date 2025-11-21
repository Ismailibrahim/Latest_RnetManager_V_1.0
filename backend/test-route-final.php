<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

echo "=== Final Route Test ===\n\n";

// Test route matching
$request = \Illuminate\Http\Request::create('/api/v1/currencies-test', 'GET');
$router = $app->make('router');

try {
    $route = $router->getRoutes()->match($request);
    echo "✓ Route matched!\n";
    echo "  Name: " . $route->getName() . "\n";
    echo "  URI: " . $route->uri() . "\n";
    
    // Test the actual response
    $kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
    $response = $kernel->handle($request);
    echo "\n✓ HTTP Response:\n";
    echo "  Status: " . $response->getStatusCode() . "\n";
    echo "  Body: " . $response->getContent() . "\n";
    
    if ($response->getStatusCode() == 200) {
        echo "\n✅ ROUTE IS WORKING IN CODE!\n";
        echo "The server just needs to be restarted to pick up the changes.\n";
    }
} catch (\Symfony\Component\Routing\Exception\ResourceNotFoundException $e) {
    echo "✗ Route NOT FOUND\n";
    echo "Error: " . $e->getMessage() . "\n";
    
    // List all v1 routes
    echo "\nAll registered /api/v1 routes:\n";
    foreach ($router->getRoutes() as $route) {
        $uri = $route->uri();
        if (strpos($uri, 'v1') !== false) {
            echo "  - " . ($route->getName() ?? 'unnamed') . ": $uri\n";
        }
    }
}

