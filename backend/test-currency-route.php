<?php

/**
 * Diagnostic script to test currency route registration
 * Run: php test-currency-route.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

echo "Testing Currency Route Registration...\n\n";

// Test 1: Check if CurrencyController class exists
echo "1. Checking CurrencyController class...\n";
if (class_exists('App\Http\Controllers\Api\V1\CurrencyController')) {
    echo "   ✓ CurrencyController class exists\n";
} else {
    echo "   ✗ CurrencyController class NOT FOUND\n";
    exit(1);
}

// Test 2: Check if Currency model exists
echo "2. Checking Currency model...\n";
if (class_exists('App\Models\Currency')) {
    echo "   ✓ Currency model exists\n";
} else {
    echo "   ✗ Currency model NOT FOUND\n";
    exit(1);
}

// Test 3: Check if CurrencyPolicy exists
echo "3. Checking CurrencyPolicy...\n";
if (class_exists('App\Policies\CurrencyPolicy')) {
    echo "   ✓ CurrencyPolicy exists\n";
} else {
    echo "   ✗ CurrencyPolicy NOT FOUND\n";
    exit(1);
}

// Test 4: Try to instantiate CurrencyController
echo "4. Testing CurrencyController instantiation...\n";
try {
    $controller = new \App\Http\Controllers\Api\V1\CurrencyController();
    echo "   ✓ CurrencyController can be instantiated\n";
} catch (\Exception $e) {
    echo "   ✗ Error instantiating CurrencyController: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    exit(1);
}

// Test 5: Check routes file syntax
echo "5. Checking routes/api.php syntax...\n";
$output = [];
$returnVar = 0;
exec('php -l routes/api.php 2>&1', $output, $returnVar);
if ($returnVar === 0) {
    echo "   ✓ routes/api.php syntax is valid\n";
} else {
    echo "   ✗ routes/api.php has syntax errors:\n";
    foreach ($output as $line) {
        echo "      " . $line . "\n";
    }
    exit(1);
}

// Test 6: Try to load routes
echo "6. Testing route registration...\n";
try {
    $kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
    $router = $app->make('router');
    
    // Count routes before
    $routesBefore = count($router->getRoutes());
    
    // Load routes
    $app->loadRoutesFrom(__DIR__ . '/routes/api.php');
    
    // Count routes after
    $routesAfter = count($router->getRoutes());
    
    echo "   Routes before: $routesBefore\n";
    echo "   Routes after: $routesAfter\n";
    
    // Check if currencies route exists
    $currenciesRoute = $router->getRoutes()->getByName('api.v1.currencies.index');
    if ($currenciesRoute) {
        echo "   ✓ currencies route is registered\n";
        echo "   Route URI: " . $currenciesRoute->uri() . "\n";
    } else {
        echo "   ✗ currencies route NOT FOUND in registered routes\n";
    }
    
    $testRoute = $router->getRoutes()->getByName('api.v1.currencies.test');
    if ($testRoute) {
        echo "   ✓ currencies-test route is registered\n";
        echo "   Route URI: " . $testRoute->uri() . "\n";
    } else {
        echo "   ✗ currencies-test route NOT FOUND in registered routes\n";
    }
    
} catch (\Exception $e) {
    echo "   ✗ Error loading routes: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    exit(1);
}

echo "\n✓ All tests passed! Routes should be working.\n";

