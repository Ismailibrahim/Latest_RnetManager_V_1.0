<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ClearFinancialData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'financial:clear 
                            {--force : Force the operation to run without confirmation}
                            {--dry-run : Show what would be deleted without actually deleting}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear all financial data from the database (invoices, payments, financial records, etc.)';

    /**
     * Financial tables to clear (in order to respect foreign key constraints)
     *
     * @var array
     */
    protected $financialTables = [
        'unified_payment_entries',
        'financial_records',
        'rent_invoices',
        'maintenance_invoices',
        'subscription_invoices',
        'security_deposit_refunds',
    ];

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $isDryRun = $this->option('dry-run');
        $force = $this->option('force');

        if ($isDryRun) {
            $this->info('🔍 DRY RUN MODE - No data will be deleted');
            $this->newLine();
        }

        // Show summary of what will be deleted
        $this->displaySummary();

        if (!$force && !$isDryRun) {
            if (!$this->confirm('⚠️  This will PERMANENTLY delete all financial data. Are you sure?')) {
                $this->info('Operation cancelled.');
                return 0;
            }

            if (!$this->confirm('⚠️  This action cannot be undone. Type "yes" to confirm:', false)) {
                $this->info('Operation cancelled.');
                return 0;
            }
        }

        try {
            // Disable foreign key checks temporarily
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');

            $totalDeleted = 0;

            foreach ($this->financialTables as $table) {
                if (!Schema::hasTable($table)) {
                    $this->warn("⚠️  Table '{$table}' does not exist, skipping...");
                    continue;
                }

                $count = DB::table($table)->count();

                if ($isDryRun) {
                    $this->line("  [DRY RUN] Would delete {$count} record(s) from '{$table}'");
                } else {
                    DB::table($table)->truncate();
                    $this->info("  ✓ Deleted {$count} record(s) from '{$table}'");
                    $totalDeleted += $count;
                }
            }

            // Re-enable foreign key checks
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            if ($isDryRun) {
                $this->newLine();
                $this->info('✓ Dry run completed. No data was actually deleted.');
                $this->info('Run without --dry-run to actually delete the data.');
            } else {
                $this->newLine();
                $this->info("✓ Successfully cleared all financial data!");
                $this->info("  Total records deleted: {$totalDeleted}");
            }

            return 0;
        } catch (\Exception $e) {
            // Re-enable foreign key checks in case of error
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            
            $this->error('❌ Error: ' . $e->getMessage());
            $this->error('Stack trace: ' . $e->getTraceAsString());
            return 1;
        }
    }

    /**
     * Display summary of records that will be deleted
     */
    protected function displaySummary(): void
    {
        $this->info('📊 Financial Data Summary:');
        $this->newLine();

        $totalRecords = 0;
        $tableData = [];

        foreach ($this->financialTables as $table) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            try {
                $count = DB::table($table)->count();
                $totalRecords += $count;
                $tableData[] = [
                    'Table' => $table,
                    'Records' => number_format($count),
                ];
            } catch (\Exception $e) {
                $tableData[] = [
                    'Table' => $table,
                    'Records' => 'Error: ' . $e->getMessage(),
                ];
            }
        }

        $this->table(['Table', 'Records'], $tableData);
        $this->newLine();
        $this->info("Total records to be deleted: " . number_format($totalRecords));
        $this->newLine();
    }
}

