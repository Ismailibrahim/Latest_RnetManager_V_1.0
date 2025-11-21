<?php

/**
 * Verification script for currency routes
 * Run: php verify-currency-routes.php
 */

require __DIR__ . '/vendor/autoload.php';

echo "=== Currency Routes Verification ===\n\n";

// Check 1: CurrencyController
echo "1. Checking CurrencyController...\n";
if (class_exists('App\Http\Controllers\Api\V1\CurrencyController')) {
    echo "   ✓ CurrencyController class exists\n";
} else {
    echo "   ✗ CurrencyController class NOT FOUND\n";
    exit(1);
}

// Check 2: Currency Model
echo "2. Checking Currency model...\n";
if (class_exists('App\Models\Currency')) {
    echo "   ✓ Currency model exists\n";
} else {
    echo "   ✗ Currency model NOT FOUND\n";
    exit(1);
}

// Check 3: CurrencyPolicy
echo "3. Checking CurrencyPolicy...\n";
if (class_exists('App\Policies\CurrencyPolicy')) {
    echo "   ✓ CurrencyPolicy exists\n";
} else {
    echo "   ✗ CurrencyPolicy NOT FOUND\n";
    exit(1);
}

// Check 4: CurrencyResource
echo "4. Checking CurrencyResource...\n";
if (class_exists('App\Http\Resources\CurrencyResource')) {
    echo "   ✓ CurrencyResource exists\n";
} else {
    echo "   ✗ CurrencyResource NOT FOUND\n";
    exit(1);
}

// Check 5: Routes file syntax
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

// Check 6: Routes file contains currency routes
echo "6. Checking if routes file contains currency routes...\n";
$routesContent = file_get_contents(__DIR__ . '/routes/api.php');
if (strpos($routesContent, 'currencies-test') !== false && strpos($routesContent, 'currencies') !== false) {
    echo "   ✓ Currency routes found in routes/api.php\n";
} else {
    echo "   ✗ Currency routes NOT FOUND in routes/api.php\n";
    exit(1);
}

// Check 7: CurrencyController import
echo "7. Checking CurrencyController import...\n";
if (strpos($routesContent, 'use App\Http\Controllers\Api\V1\CurrencyController;') !== false) {
    echo "   ✓ CurrencyController is imported in routes/api.php\n";
} else {
    echo "   ✗ CurrencyController import NOT FOUND\n";
    exit(1);
}

echo "\n=== All Checks Passed! ===\n";
echo "\nRoutes should be available at:\n";
echo "  - GET /api/v1/currencies-test (no auth required)\n";
echo "  - GET /api/v1/currencies (auth required)\n";
echo "\nMake sure to:\n";
echo "  1. Restart your Laravel server (php artisan serve)\n";
echo "  2. Clear browser cache if testing in browser\n";
echo "  3. Use proper authentication token for /api/v1/currencies\n";

