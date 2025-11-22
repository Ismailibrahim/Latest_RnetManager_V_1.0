<?php

/**
 * Check migration status and run if needed
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "🔍 Checking migration status...\n\n";

// Check if migration is recorded
$migrationName = '2025_11_22_120000_change_financial_records_payment_method_to_string';
$exists = DB::table('migrations')
    ->where('migration', $migrationName)
    ->exists();

if ($exists) {
    echo "⚠️  Migration is already recorded in migrations table.\n";
    echo "This might mean it was run but didn't complete, or it was manually recorded.\n\n";
} else {
    echo "✅ Migration is NOT recorded - it should run.\n\n";
}

// Check current column type
if (Schema::hasTable('financial_records')) {
    try {
        $columnInfo = DB::select("
            SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'financial_records' 
            AND COLUMN_NAME = 'payment_method'
        ");

        if (!empty($columnInfo)) {
            $info = $columnInfo[0];
            echo "Current payment_method column:\n";
            echo "  Type: {$info->COLUMN_TYPE}\n";
            echo "  Nullable: {$info->IS_NULLABLE}\n";
            echo "  Default: " . ($info->COLUMN_DEFAULT ?? 'NULL') . "\n\n";
            
            if (str_contains(strtolower($info->COLUMN_TYPE), 'enum')) {
                echo "❌ Column is still ENUM - migration needs to run!\n";
                echo "\nRunning migration manually...\n\n";
                
                try {
                    DB::statement("ALTER TABLE `financial_records` MODIFY COLUMN `payment_method` VARCHAR(120) NULL DEFAULT NULL");
                    echo "✅ Column changed to VARCHAR(120)\n";
                    
                    // Check if index exists
                    $indexes = DB::select("
                        SHOW INDEXES FROM `financial_records` WHERE Column_name = 'payment_method'
                    ");
                    
                    if (empty($indexes)) {
                        Schema::table('financial_records', function ($table) {
                            try {
                                $table->index('payment_method', 'idx_financial_payment_method');
                                echo "✅ Index added\n";
                            } catch (\Exception $e) {
                                if (str_contains($e->getMessage(), 'Duplicate key name')) {
                                    echo "⚠️  Index already exists\n";
                                } else {
                                    throw $e;
                                }
                            }
                        });
                    } else {
                        echo "✅ Index already exists\n";
                    }
                    
                    // Record migration
                    DB::table('migrations')->insert([
                        'migration' => $migrationName,
                        'batch' => DB::table('migrations')->max('batch') + 1,
                    ]);
                    echo "✅ Migration recorded in migrations table\n";
                    
                } catch (\Exception $e) {
                    echo "❌ Error: " . $e->getMessage() . "\n";
                    exit(1);
                }
            } else {
                echo "✅ Column is already VARCHAR - migration already applied!\n";
            }
        } else {
            echo "❌ payment_method column not found!\n";
        }
    } catch (\Exception $e) {
        echo "❌ Error checking column: " . $e->getMessage() . "\n";
        exit(1);
    }
} else {
    echo "❌ financial_records table not found!\n";
}

echo "\n✅ Done!\n";

