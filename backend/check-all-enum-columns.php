<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "🔍 Scanning all database tables for ENUM columns...\n\n";

try {
    // Get all ENUM columns from all tables in the current database
    $enumColumns = DB::select("
        SELECT 
            TABLE_NAME,
            COLUMN_NAME,
            COLUMN_TYPE,
            IS_NULLABLE,
            COLUMN_DEFAULT,
            COLUMN_COMMENT
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND DATA_TYPE = 'enum'
        ORDER BY TABLE_NAME, COLUMN_NAME
    ");

    if (empty($enumColumns)) {
        echo "✅ No ENUM columns found in the database!\n";
        echo "   All columns are using VARCHAR or other types.\n";
        exit(0);
    }

    // Group by table
    $tables = [];
    foreach ($enumColumns as $column) {
        $tableName = $column->TABLE_NAME;
        if (!isset($tables[$tableName])) {
            $tables[$tableName] = [];
        }
        $tables[$tableName][] = $column;
    }

    // Generate report
    echo "═══════════════════════════════════════════════════════════════\n";
    echo "ENUM COLUMNS REPORT\n";
    echo "═══════════════════════════════════════════════════════════════\n\n";
    
    echo "Total ENUM columns found: " . count($enumColumns) . "\n";
    echo "Total tables with ENUM columns: " . count($tables) . "\n\n";

    foreach ($tables as $tableName => $columns) {
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "📋 Table: {$tableName}\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        
        foreach ($columns as $column) {
            echo "\n  Column: {$column->COLUMN_NAME}\n";
            echo "  ───────────────────────────────────────────────────────────\n";
            echo "  Type: {$column->COLUMN_TYPE}\n";
            echo "  Nullable: {$column->IS_NULLABLE}\n";
            echo "  Default: " . ($column->COLUMN_DEFAULT ?? 'NULL') . "\n";
            if ($column->COLUMN_COMMENT) {
                echo "  Comment: {$column->COLUMN_COMMENT}\n";
            }
            
            // Extract ENUM values
            preg_match("/enum\((.*)\)/i", $column->COLUMN_TYPE, $matches);
            if (isset($matches[1])) {
                $enumValues = str_replace("'", "", $matches[1]);
                $values = explode(',', $enumValues);
                echo "  Values: " . implode(', ', $values) . "\n";
            }
        }
        echo "\n";
    }

    // Summary table
    echo "\n═══════════════════════════════════════════════════════════════\n";
    echo "SUMMARY TABLE\n";
    echo "═══════════════════════════════════════════════════════════════\n\n";
    echo str_pad("Table Name", 40) . " | " . str_pad("Column Name", 30) . " | " . "ENUM Values\n";
    echo str_repeat("-", 40) . "-+-" . str_repeat("-", 30) . "-+-" . str_repeat("-", 50) . "\n";
    
    foreach ($enumColumns as $column) {
        preg_match("/enum\((.*)\)/i", $column->COLUMN_TYPE, $matches);
        $enumValues = isset($matches[1]) ? str_replace("'", "", $matches[1]) : 'N/A';
        
        // Truncate long enum values for display
        if (strlen($enumValues) > 50) {
            $enumValues = substr($enumValues, 0, 47) . '...';
        }
        
        echo str_pad($column->TABLE_NAME, 40) . " | " . 
             str_pad($column->COLUMN_NAME, 30) . " | " . 
             $enumValues . "\n";
    }

    // Check for potential migration candidates
    echo "\n═══════════════════════════════════════════════════════════════\n";
    echo "MIGRATION RECOMMENDATIONS\n";
    echo "═══════════════════════════════════════════════════════════════\n\n";
    
    $recommendations = [];
    foreach ($enumColumns as $column) {
        // Check if there's a corresponding payment_methods table for payment_method columns
        if ($column->COLUMN_NAME === 'payment_method') {
            $hasPaymentMethodsTable = DB::select("
                SELECT COUNT(*) as count 
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'payment_methods'
            ");
            
            if (!empty($hasPaymentMethodsTable) && $hasPaymentMethodsTable[0]->count > 0) {
                $recommendations[] = [
                    'table' => $column->TABLE_NAME,
                    'column' => $column->COLUMN_NAME,
                    'reason' => 'Consider migrating to VARCHAR to match payment_methods.name structure'
                ];
            }
        }
    }
    
    if (!empty($recommendations)) {
        foreach ($recommendations as $rec) {
            echo "⚠️  {$rec['table']}.{$rec['column']}: {$rec['reason']}\n";
        }
    } else {
        echo "No specific migration recommendations at this time.\n";
    }

    echo "\n✅ Report complete!\n";

} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

