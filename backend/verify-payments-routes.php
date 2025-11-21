<?php

/**
 * Verify all routes used by payments/collect page
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$router = $app->make('router');

echo "=== Payments/Collect Page Routes Verification ===\n\n";

$requiredRoutes = [
    'api.v1.tenant-units.index' => 'GET /api/v1/tenant-units',
    'api.v1.payment-methods.index' => 'GET /api/v1/payment-methods',
    'api.v1.currencies.index' => 'GET /api/v1/currencies',
    'api.v1.payments.store' => 'POST /api/v1/payments',
    'api.v1.tenant-units.pending-charges' => 'GET /api/v1/tenant-units/{id}/pending-charges',
];

$allRoutes = $router->getRoutes();
$found = [];
$missing = [];

foreach ($requiredRoutes as $routeName => $description) {
    $route = $allRoutes->getByName($routeName);
    if ($route) {
        $found[] = [
            'name' => $routeName,
            'description' => $description,
            'uri' => $route->uri(),
            'methods' => implode(', ', $route->methods()),
        ];
    } else {
        $missing[] = $routeName;
    }
}

echo "Found Routes:\n";
foreach ($found as $route) {
    echo "  ✅ {$route['name']}\n";
    echo "     URI: {$route['uri']}\n";
    echo "     Methods: {$route['methods']}\n";
    echo "\n";
}

if (!empty($missing)) {
    echo "Missing Routes:\n";
    foreach ($missing as $name) {
        echo "  ❌ $name\n";
    }
    echo "\n";
}

// Also check for currencies route specifically
echo "Checking currencies route...\n";
$currenciesRoute = $allRoutes->getByName('api.v1.currencies.index');
if ($currenciesRoute) {
    echo "  ✅ Currencies route found: {$currenciesRoute->uri()}\n";
} else {
    echo "  ❌ Currencies route NOT found\n";
    
    // List all routes with 'currencies' in name or URI
    echo "\n  Searching for currency-related routes:\n";
    foreach ($allRoutes as $route) {
        $name = $route->getName() ?? '';
        $uri = $route->uri();
        if (strpos($name, 'currenc') !== false || strpos($uri, 'currenc') !== false) {
            echo "    - $name: $uri\n";
        }
    }
}

echo "\n";
echo "Checking payments route...\n";
$paymentsRoute = $allRoutes->getByName('api.v1.payments.store');
if ($paymentsRoute) {
    echo "  ✅ Payments store route found: {$paymentsRoute->uri()}\n";
} else {
    echo "  ❌ Payments store route NOT found\n";
    
    // List all routes with 'payment' in name or URI
    echo "\n  Searching for payment-related routes:\n";
    foreach ($allRoutes as $route) {
        $name = $route->getName() ?? '';
        $uri = $route->uri();
        if (strpos($name, 'payment') !== false || strpos($uri, 'payment') !== false) {
            echo "    - $name: $uri (" . implode(', ', $route->methods()) . ")\n";
        }
    }
}

echo "\n";
echo "Total routes registered: " . count($allRoutes) . "\n";
