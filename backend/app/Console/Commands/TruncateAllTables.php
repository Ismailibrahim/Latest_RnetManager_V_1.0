<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TruncateAllTables extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:truncate-all {--force : Force the operation to run without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete all records from all tables while keeping the table structure';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        if (!$this->option('force')) {
            if (!$this->confirm('This will delete ALL records from ALL tables. Are you sure?')) {
                $this->info('Operation cancelled.');
                return 0;
            }
        }

        $this->info('Deleting all records from all tables...');

        try {
            // Disable foreign key checks
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');

            // Get all table names
            $tables = DB::select('SHOW TABLES');
            $databaseName = DB::getDatabaseName();
            $tableKey = 'Tables_in_' . $databaseName;

            $truncatedCount = 0;

            foreach ($tables as $table) {
                $tableName = $table->$tableKey;
                
                // Skip migrations table to preserve migration history
                if ($tableName === 'migrations') {
                    $this->line("Skipping migrations table...");
                    continue;
                }

                try {
                    DB::table($tableName)->truncate();
                    $this->line("✓ Truncated: {$tableName}");
                    $truncatedCount++;
                } catch (\Exception $e) {
                    $this->warn("✗ Failed to truncate {$tableName}: " . $e->getMessage());
                }
            }

            // Re-enable foreign key checks
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            $this->info("\n✓ Successfully truncated {$truncatedCount} table(s).");
            $this->info('All records have been deleted. Table structures are preserved.');

            return 0;
        } catch (\Exception $e) {
            // Re-enable foreign key checks in case of error
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            
            $this->error('Error: ' . $e->getMessage());
            return 1;
        }
    }
}
