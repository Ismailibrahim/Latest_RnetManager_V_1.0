<?php
/**
 * Direct database check - bypasses Laravel to avoid output buffering issues
 */

$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) {
    die("ERROR: .env file not found\n");
}

// Parse .env file manually to handle syntax errors better
$env = [];
$lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $lineNum => $line) {
    $line = trim($line);
    // Skip comments and empty lines
    if (empty($line) || $line[0] === '#') {
        continue;
    }
    
    // Handle lines with = sign
    if (strpos($line, '=') !== false) {
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        
        // Remove quotes if present
        if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
            (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
            $value = substr($value, 1, -1);
        }
        
        $env[$key] = $value;
    }
}

$dbHost = $env['DB_HOST'] ?? '127.0.0.1';
$dbPort = $env['DB_PORT'] ?? '3306';
$dbDatabase = $env['DB_DATABASE'] ?? '';
$dbUsername = $env['DB_USERNAME'] ?? 'root';
$dbPassword = $env['DB_PASSWORD'] ?? '';

if (empty($dbDatabase)) {
    echo "WARNING: DB_DATABASE not found in .env, trying to use Laravel config...\n";
    // Try to bootstrap Laravel to get config
    try {
        require __DIR__ . '/vendor/autoload.php';
        $app = require_once __DIR__ . '/bootstrap/app.php';
        $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        $dbDatabase = config('database.connections.mysql.database');
        $dbHost = config('database.connections.mysql.host', $dbHost);
        $dbPort = config('database.connections.mysql.port', $dbPort);
        $dbUsername = config('database.connections.mysql.username', $dbUsername);
        $dbPassword = config('database.connections.mysql.password', $dbPassword);
    } catch (\Exception $e) {
        die("ERROR: Could not determine database configuration. Please check your .env file.\n");
    }
    
    if (empty($dbDatabase)) {
        die("ERROR: DB_DATABASE not set\n");
    }
}

try {
    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbDatabase};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUsername, $dbPassword, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_OBJ,
    ]);
    
    echo "==========================================\n";
    echo "Checking Currency Columns\n";
    echo "==========================================\n\n";
    
    // Check tenant_units
    echo "1. tenant_units.currency: ";
    $stmt = $pdo->query("SHOW COLUMNS FROM tenant_units WHERE Field = 'currency'");
    $result = $stmt->fetch();
    if ($result) {
        echo "EXISTS (Type: {$result->Type})\n";
        $tenantExists = true;
    } else {
        echo "NOT FOUND\n";
        $tenantExists = false;
    }
    
    // Check financial_records
    echo "2. financial_records.currency: ";
    $stmt = $pdo->query("SHOW COLUMNS FROM financial_records WHERE Field = 'currency'");
    $result = $stmt->fetch();
    if ($result) {
        echo "EXISTS (Type: {$result->Type})\n";
        $financialExists = true;
    } else {
        echo "NOT FOUND\n";
        $financialExists = false;
    }
    
    echo "\n==========================================\n";
    if ($tenantExists && $financialExists) {
        echo "SUCCESS: Both columns exist!\n";
        exit(0);
    } else {
        echo "WARNING: Some columns missing\n";
        exit(1);
    }
    
} catch (PDOException $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
