<?php
/**
 * Direct script to make company_name nullable
 * Run this from Laragon Terminal: php fix-company-name-direct.php
 */

// Connect to database directly
$host = '127.0.0.1';
// Try common Laragon database names - update this to match your actual database name
$database = 'rentapp'; // Common names: rentapp, rent_application, rent_v2, rent
$username = 'root';
$password = ''; // Laragon default is empty, change if you set a password

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connected to database: $database\n\n";
    
    // Check current column definition
    echo "Checking current column definition...\n";
    $stmt = $pdo->query("SHOW COLUMNS FROM landlords WHERE Field = 'company_name'");
    $column = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($column) {
        echo "Current company_name column:\n";
        echo "  Type: {$column['Type']}\n";
        echo "  Null: {$column['Null']}\n";
        echo "  Default: " . ($column['Default'] ?? 'NULL') . "\n\n";
        
        if (strtoupper($column['Null']) === 'NO') {
            echo "⚠️  Column is NOT NULL. Making it nullable...\n";
            
            // Make it nullable
            $pdo->exec("ALTER TABLE landlords MODIFY COLUMN company_name VARCHAR(255) NULL");
            
            echo "✅ Successfully made company_name nullable!\n\n";
            
            // Verify
            $stmt = $pdo->query("SHOW COLUMNS FROM landlords WHERE Field = 'company_name'");
            $column = $stmt->fetch(PDO::FETCH_ASSOC);
            echo "Verification:\n";
            echo "  Type: {$column['Type']}\n";
            echo "  Null: {$column['Null']}\n";
            
            if (strtoupper($column['Null']) === 'YES') {
                echo "\n✅ SUCCESS! company_name is now nullable.\n";
            } else {
                echo "\n❌ ERROR: Column is still NOT NULL.\n";
                exit(1);
            }
        } else {
            echo "✅ Column is already nullable. No changes needed.\n";
        }
    } else {
        echo "❌ ERROR: company_name column not found in landlords table!\n";
        exit(1);
    }
    
} catch (PDOException $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    echo "\nPlease check:\n";
    echo "1. Database name is correct (currently: $database)\n";
    echo "2. MySQL is running in Laragon\n";
    echo "3. Database credentials are correct\n";
    exit(1);
}

