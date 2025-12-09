<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

echo "=== Document Templates Migration Runner ===\n\n";

// Check if table already exists
if (Schema::hasTable('document_templates')) {
    echo "✓ Table 'document_templates' already exists!\n";
    $count = DB::table('document_templates')->count();
    echo "  Current records: {$count}\n\n";
    
    if ($count == 0) {
        echo "Running DocumentTemplateSeeder to populate default templates...\n";
        try {
            Artisan::call('db:seed', [
                '--class' => 'DocumentTemplateSeeder',
                '--force' => true,
            ]);
            $output = Artisan::output();
            if ($output) {
                echo $output;
            }
            echo "✓ Seeder completed!\n";
        } catch (Exception $e) {
            echo "✗ Seeder error: " . $e->getMessage() . "\n";
        }
    }
} else {
    echo "Table 'document_templates' does not exist. Running migration...\n\n";
    
    try {
        Artisan::call('migrate', [
            '--path' => 'database/migrations/2025_01_23_000000_create_document_templates_table.php',
            '--force' => true,
        ]);
        
        $output = Artisan::output();
        if ($output) {
            echo $output;
        }
        
        // Verify table was created
        if (Schema::hasTable('document_templates')) {
            echo "\n✓ Migration successful! Table 'document_templates' created.\n\n";
            
            // Run seeder
            echo "Running DocumentTemplateSeeder to populate default templates...\n";
            Artisan::call('db:seed', [
                '--class' => 'DocumentTemplateSeeder',
                '--force' => true,
            ]);
            $seedOutput = Artisan::output();
            if ($seedOutput) {
                echo $seedOutput;
            }
            
            $count = DB::table('document_templates')->count();
            echo "✓ Seeder completed! Created {$count} default templates.\n";
        } else {
            echo "\n✗ Migration completed but table was not created. Please check for errors.\n";
        }
    } catch (Exception $e) {
        echo "\n✗ Migration error: " . $e->getMessage() . "\n";
        if ($e->getPrevious()) {
            echo "Previous: " . $e->getPrevious()->getMessage() . "\n";
        }
    }
}

echo "\n=== Done ===\n";
