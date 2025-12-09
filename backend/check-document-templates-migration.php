<?php

/**
 * Check and run document_templates migration if needed
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Artisan;

echo "🔍 Checking document_templates migration status...\n\n";

$migrationName = '2025_01_23_000000_create_document_templates_table';

// Check if migration is recorded
$exists = DB::table('migrations')
    ->where('migration', $migrationName)
    ->exists();

if ($exists) {
    echo "✅ Migration is already recorded in migrations table.\n";
} else {
    echo "⚠️  Migration is NOT recorded - it needs to run.\n";
}

// Check if table exists
if (Schema::hasTable('document_templates')) {
    echo "✅ Table 'document_templates' exists.\n";
    $count = DB::table('document_templates')->count();
    echo "   Current records: {$count}\n\n";
    
    if ($count == 0) {
        echo "⚠️  Table exists but is empty. Running seeder...\n";
        try {
            Artisan::call('db:seed', [
                '--class' => 'DocumentTemplateSeeder',
                '--force' => true,
            ]);
            $output = Artisan::output();
            if ($output) {
                echo $output;
            }
            $newCount = DB::table('document_templates')->count();
            echo "✅ Seeder completed! Now have {$newCount} templates.\n";
        } catch (Exception $e) {
            echo "❌ Seeder error: " . $e->getMessage() . "\n";
        }
    }
} else {
    echo "❌ Table 'document_templates' does NOT exist!\n\n";
    
    if (!$exists) {
        echo "Running migration...\n";
        try {
            Artisan::call('migrate', [
                '--path' => 'database/migrations/2025_01_23_000000_create_document_templates_table.php',
                '--force' => true,
            ]);
            
            $output = Artisan::output();
            if ($output) {
                echo $output;
            }
            
            // Verify
            if (Schema::hasTable('document_templates')) {
                echo "\n✅ Migration successful! Table created.\n\n";
                
                echo "Running seeder to populate default templates...\n";
                Artisan::call('db:seed', [
                    '--class' => 'DocumentTemplateSeeder',
                    '--force' => true,
                ]);
                $seedOutput = Artisan::output();
                if ($seedOutput) {
                    echo $seedOutput;
                }
                
                $count = DB::table('document_templates')->count();
                echo "✅ Seeder completed! Created {$count} default templates.\n";
            } else {
                echo "\n❌ Migration completed but table was not created!\n";
                echo "Please check the error messages above.\n";
            }
        } catch (Exception $e) {
            echo "\n❌ Migration error: " . $e->getMessage() . "\n";
            if ($e->getPrevious()) {
                echo "   Previous: " . $e->getPrevious()->getMessage() . "\n";
            }
            echo "\nYou can try running manually:\n";
            echo "  php artisan migrate --path=database/migrations/2025_01_23_000000_create_document_templates_table.php\n";
        }
    } else {
        echo "\n⚠️  Migration is recorded but table doesn't exist!\n";
        echo "This might indicate a problem. You may need to:\n";
        echo "  1. Drop the migration record: DELETE FROM migrations WHERE migration = '{$migrationName}';\n";
        echo "  2. Run the migration again: php artisan migrate --path=database/migrations/2025_01_23_000000_create_document_templates_table.php\n";
    }
}

echo "\n✅ Done!\n";
