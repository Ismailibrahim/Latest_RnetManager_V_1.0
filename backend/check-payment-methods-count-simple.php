<?php

/**
 * Simple script to check payment_methods count using direct database connection
 * This avoids Laravel bootstrapping issues
 */

// Load .env file
$envFile = __DIR__ . '/.env';
$dbConfig = [
    'host' => '127.0.0.1',
    'port' => '3306',
    'database' => 'rentapp',
    'username' => 'root',
    'password' => ''
];

if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue;
        
        if (preg_match('/^DB_HOST=(.+)$/i', $line, $matches)) {
            $value = trim($matches[1]);
            // Handle bash-style defaults ${VAR:-default}
            if (preg_match('/\$\{DB_HOST:-([^}]+)\}/', $value, $default)) {
                $dbConfig['host'] = $default[1];
            } elseif (strpos($value, '${') === false) {
                $dbConfig['host'] = $value;
            }
        }
        if (preg_match('/^DB_PORT=(.+)$/i', $line, $matches)) {
            $value = trim($matches[1]);
            if (preg_match('/\$\{DB_PORT:-([^}]+)\}/', $value, $default)) {
                $dbConfig['port'] = $default[1];
            } elseif (strpos($value, '${') === false) {
                $dbConfig['port'] = $value;
            }
        }
        if (preg_match('/^DB_DATABASE=(.+)$/i', $line, $matches)) {
            $value = trim($matches[1]);
            // Handle bash-style defaults ${VAR:-default}
            if (preg_match('/\$\{DB_DATABASE:-([^}]+)\}/', $value, $default)) {
                $dbConfig['database'] = $default[1];
            } elseif (strpos($value, '${') === false) {
                $dbConfig['database'] = $value;
            }
        }
        if (preg_match('/^DB_USERNAME=(.+)$/i', $line, $matches)) {
            $value = trim($matches[1]);
            if (preg_match('/\$\{DB_USERNAME:-([^}]+)\}/', $value, $default)) {
                $dbConfig['username'] = $default[1];
            } elseif (strpos($value, '${') === false) {
                $dbConfig['username'] = $value;
            }
        }
        if (preg_match('/^DB_PASSWORD=(.+)$/i', $line, $matches)) {
            $value = trim($matches[1]);
            if (preg_match('/\$\{DB_PASSWORD:-([^}]*)\}/', $value, $default)) {
                $dbConfig['password'] = $default[1];
            } elseif (strpos($value, '${') === false) {
                $dbConfig['password'] = $value;
            }
        }
    }
}

echo "🔍 Checking Payment Methods Table\n";
echo str_repeat("=", 50) . "\n\n";
echo "Database: {$dbConfig['database']} @ {$dbConfig['host']}:{$dbConfig['port']}\n\n";

try {
    // Connect to database
    $dsn = "mysql:host={$dbConfig['host']};port={$dbConfig['port']};dbname={$dbConfig['database']};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    // Check if table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'payment_methods'");
    if ($stmt->rowCount() === 0) {
        echo "❌ Table 'payment_methods' does not exist in the database.\n";
        echo "   Please run migrations first: php artisan migrate\n";
        exit(1);
    }
    
    // Get count
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM payment_methods");
    $count = $stmt->fetch()['count'];
    
    echo "📊 Total Records: {$count}\n\n";
    
    if ($count > 0) {
        // Get all records
        $stmt = $pdo->query("SELECT id, name, is_active, supports_reference, sort_order FROM payment_methods ORDER BY sort_order, name");
        $methods = $stmt->fetchAll();
        
        echo "📋 Payment Methods List:\n";
        echo str_repeat("-", 50) . "\n";
        printf("%-5s %-25s %-10s %-15s %-10s\n", "ID", "Name", "Active", "Supports Ref", "Sort Order");
        echo str_repeat("-", 50) . "\n";
        
        foreach ($methods as $method) {
            printf(
                "%-5s %-25s %-10s %-15s %-10s\n",
                $method['id'],
                $method['name'],
                $method['is_active'] ? 'Yes' : 'No',
                $method['supports_reference'] ? 'Yes' : 'No',
                $method['sort_order']
            );
        }
        echo str_repeat("-", 50) . "\n";
    } else {
        echo "⚠️  No payment methods found in the database.\n";
        echo "   You can seed the table by running: php artisan db:seed --class=PaymentMethodSeeder\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Database Error: " . $e->getMessage() . "\n";
    echo "\nPlease check:\n";
    echo "1. Database server is running\n";
    echo "2. Database credentials in .env file are correct\n";
    echo "3. Database '{$dbConfig['database']}' exists\n";
    exit(1);
}

echo "\n" . str_repeat("=", 50) . "\n";

