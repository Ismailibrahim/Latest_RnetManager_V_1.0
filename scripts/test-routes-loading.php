<?php

echo "=== Testing Routes File Loading ===\n\n";

// First, check if routes file can be included
echo "1. Checking if routes/api.php can be included...\n";
try {
    $routesContent = file_get_contents(__DIR__ . '/routes/api.php');
    if (strpos($routesContent, 'currencies-test') !== false) {
        echo "   ✓ Route code found in file\n";
    } else {
        echo "   ✗ Route code NOT found in file\n";
    }
} catch (\Exception $e) {
    echo "   ✗ Error reading file: " . $e->getMessage() . "\n";
    exit(1);
}

// Try to load Laravel and see if routes are registered
echo "\n2. Loading Laravel application...\n";
try {
    require __DIR__ . '/vendor/autoload.php';
    $app = require_once __DIR__ . '/bootstrap/app.php';
    echo "   ✓ Application loaded\n";
    
    $router = $app->make('router');
    echo "   ✓ Router loaded\n";
    
    // Count total routes
    $totalRoutes = count($router->getRoutes());
    echo "   Total routes registered: $totalRoutes\n";
    
    // Check for v1 routes
    $v1Routes = 0;
    foreach ($router->getRoutes() as $route) {
        $uri = $route->uri();
        if (strpos($uri, 'v1') !== false) {
            $v1Routes++;
        }
    }
    echo "   V1 routes found: $v1Routes\n";
    
    if ($v1Routes == 0) {
        echo "\n   ⚠ WARNING: No v1 routes found! Routes file might not be loading.\n";
    }
    
    // Check specifically for currencies
    $currencyRoutes = 0;
    foreach ($router->getRoutes() as $route) {
        $uri = $route->uri();
        $name = $route->getName() ?? '';
        if (strpos($uri, 'currencies') !== false || strpos($name, 'currencies') !== false) {
            $currencyRoutes++;
            echo "   Found currency route: $name -> $uri\n";
        }
    }
    
    if ($currencyRoutes == 0) {
        echo "\n   ✗ NO currency routes registered!\n";
        echo "\n   This means the route definition is not being processed.\n";
        echo "   Possible causes:\n";
        echo "   1. Routes file has a fatal error preventing it from loading\n";
        echo "   2. Route is inside a conditional that's false\n";
        echo "   3. Route is being overridden or removed\n";
    }
    
} catch (\Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "\n   Stack trace:\n" . $e->getTraceAsString() . "\n";
}

