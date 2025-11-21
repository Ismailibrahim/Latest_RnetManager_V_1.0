<?php

/**
 * Generate comprehensive route report
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$router = $app->make('router');
$allRoutes = $router->getRoutes();

echo "=== Complete Route Report ===\n\n";

$routesByMethod = [];
$routesByPrefix = [];

foreach ($allRoutes as $route) {
    $methods = $route->methods();
    $uri = $route->uri();
    $name = $route->getName();
    
    foreach ($methods as $method) {
        if (!isset($routesByMethod[$method])) {
            $routesByMethod[$method] = [];
        }
        $routesByMethod[$method][] = [
            'uri' => $uri,
            'name' => $name,
            'method' => $method,
        ];
    }
    
    // Group by prefix
    if (strpos($uri, 'api/v1') !== false) {
        $prefix = 'api/v1';
    } elseif (strpos($uri, 'api') !== false) {
        $prefix = 'api';
    } else {
        $prefix = 'other';
    }
    
    if (!isset($routesByPrefix[$prefix])) {
        $routesByPrefix[$prefix] = [];
    }
    $routesByPrefix[$prefix][] = [
        'uri' => $uri,
        'name' => $name,
        'methods' => $methods,
    ];
}

echo "Total Routes: " . count($allRoutes) . "\n\n";

echo "=== Routes by Method ===\n";
foreach ($routesByMethod as $method => $routes) {
    echo "$method: " . count($routes) . " routes\n";
}
echo "\n";

echo "=== API v1 Routes ===\n";
if (isset($routesByPrefix['api/v1'])) {
    foreach ($routesByPrefix['api/v1'] as $route) {
        $methods = implode(', ', $route['methods']);
        $name = $route['name'] ? " ({$route['name']})" : "";
        echo "  $methods {$route['uri']}$name\n";
    }
} else {
    echo "  No API v1 routes found\n";
}
echo "\n";

echo "=== Other Routes ===\n";
if (isset($routesByPrefix['other'])) {
    foreach ($routesByPrefix['other'] as $route) {
        $methods = implode(', ', $route['methods']);
        $name = $route['name'] ? " ({$route['name']})" : "";
        echo "  $methods {$route['uri']}$name\n";
    }
} else {
    echo "  No other routes found\n";
}

