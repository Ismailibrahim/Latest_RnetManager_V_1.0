<?php

/**
 * Quick script to check the count of records in payment_methods table
 * 
 * Usage: php check-payment-methods-count.php
 */

// Load environment variables
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            if (!isset($_ENV[$key])) {
                $_ENV[$key] = $value;
                putenv("$key=$value");
            }
        }
    }
}

// Set default APP_URL if not set
if (!isset($_ENV['APP_URL']) || empty($_ENV['APP_URL'])) {
    $_ENV['APP_URL'] = 'http://localhost:8000';
    putenv('APP_URL=http://localhost:8000');
}

require __DIR__ . '/vendor/autoload.php';

// Bootstrap Laravel application
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\PaymentMethod;

echo "🔍 Checking Payment Methods Table\n";
echo str_repeat("=", 50) . "\n\n";

// Check if table exists
if (!Schema::hasTable('payment_methods')) {
    echo "❌ Table 'payment_methods' does not exist in the database.\n";
    echo "   Please run migrations first: php artisan migrate\n";
    exit(1);
}

// Get count using model
$count = PaymentMethod::count();

// Get all records
$methods = PaymentMethod::orderBy('sort_order')->orderBy('name')->get();

echo "📊 Total Records: {$count}\n\n";

if ($count > 0) {
    echo "📋 Payment Methods List:\n";
    echo str_repeat("-", 50) . "\n";
    printf("%-5s %-25s %-10s %-15s %-10s\n", "ID", "Name", "Active", "Supports Ref", "Sort Order");
    echo str_repeat("-", 50) . "\n";
    
    foreach ($methods as $method) {
        printf(
            "%-5s %-25s %-10s %-15s %-10s\n",
            $method->id,
            $method->name,
            $method->is_active ? 'Yes' : 'No',
            $method->supports_reference ? 'Yes' : 'No',
            $method->sort_order
        );
    }
    echo str_repeat("-", 50) . "\n";
} else {
    echo "⚠️  No payment methods found in the database.\n";
    echo "   You can seed the table by running: php artisan db:seed --class=PaymentMethodSeeder\n";
}

echo "\n" . str_repeat("=", 50) . "\n";

exit(0);

