<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$router = $app->make('router');

echo "=== All Registered Routes ===\n\n";

$allRoutes = $router->getRoutes();
echo "Total routes: " . count($allRoutes) . "\n\n";

echo "Routes containing 'v1':\n";
$v1Count = 0;
foreach ($allRoutes as $route) {
    $uri = $route->uri();
    $name = $route->getName() ?? 'unnamed';
    if (strpos($uri, 'v1') !== false) {
        $v1Count++;
        echo "  $v1Count. $name -> $uri\n";
        if ($v1Count >= 10) {
            echo "  ... (showing first 10)\n";
            break;
        }
    }
}

echo "\nRoutes containing 'currencies':\n";
$currencyCount = 0;
foreach ($allRoutes as $route) {
    $uri = $route->uri();
    $name = $route->getName() ?? 'unnamed';
    if (strpos($uri, 'currencies') !== false || strpos($name, 'currencies') !== false) {
        $currencyCount++;
        echo "  $currencyCount. $name -> $uri\n";
    }
}

if ($currencyCount == 0) {
    echo "  ❌ NO CURRENCY ROUTES FOUND!\n";
}

echo "\n=== Testing Route Match ===\n";
$request = \Illuminate\Http\Request::create('/api/v1/currencies-test', 'GET');
try {
    $route = $router->getRoutes()->match($request);
    echo "✅ Route matched: " . $route->getName() . "\n";
    echo "   URI: " . $route->uri() . "\n";
} catch (\Exception $e) {
    echo "❌ Route NOT matched: " . $e->getMessage() . "\n";
}

