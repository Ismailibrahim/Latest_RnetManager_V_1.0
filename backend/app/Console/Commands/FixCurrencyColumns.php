<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class FixCurrencyColumns extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:currency-columns';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Add currency columns to units table if they are missing';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('========================================');
        $this->info('FIXING CURRENCY COLUMNS');
        $this->info('========================================');
        $this->newLine();

        try {
            // Get database name
            $dbResult = DB::select("SELECT DATABASE() as db");
            $dbName = $dbResult[0]->db ?? 'unknown';
            $this->info("Database: {$dbName}");
            $this->newLine();

            // Check if table exists
            if (!Schema::hasTable('units')) {
                $this->error("ERROR: 'units' table does not exist!");
                return 1;
            }

            // Add currency column
            if (!Schema::hasColumn('units', 'currency')) {
                $this->info("Adding 'currency' column...");
                try {
                    DB::statement("ALTER TABLE `units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`");
                    $this->info("  ✓ Successfully added");
                } catch (\Exception $e) {
                    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
                        $this->info("  ✓ Column already exists");
                    } else {
                        $this->error("  ✗ Error: " . $e->getMessage());
                        return 1;
                    }
                }
            } else {
                $this->info("✓ 'currency' column already exists");
            }

            // Add security_deposit_currency column
            if (!Schema::hasColumn('units', 'security_deposit_currency')) {
                $this->info("Adding 'security_deposit_currency' column...");
                try {
                    DB::statement("ALTER TABLE `units` ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`");
                    $this->info("  ✓ Successfully added");
                } catch (\Exception $e) {
                    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
                        $this->info("  ✓ Column already exists");
                    } else {
                        $this->error("  ✗ Error: " . $e->getMessage());
                        return 1;
                    }
                }
            } else {
                $this->info("✓ 'security_deposit_currency' column already exists");
            }

            // Record migration if needed
            $migrationName = '2025_01_21_000000_add_currency_fields_to_units_table';
            $migrationRecorded = DB::table('migrations')->where('migration', $migrationName)->exists();

            if (!$migrationRecorded) {
                $this->newLine();
                $this->info("Recording migration in migrations table...");
                try {
                    $batch = DB::table('migrations')->max('batch') ?? 0;
                    DB::table('migrations')->insert([
                        'migration' => $migrationName,
                        'batch' => $batch + 1
                    ]);
                    $this->info("  ✓ Migration recorded");
                } catch (\Exception $e) {
                    $this->warn("  ⚠ Could not record migration: " . $e->getMessage());
                }
            }

            // Final verification
            $this->newLine();
            $this->info('========================================');
            $this->info('VERIFICATION');
            $this->info('========================================');
            
            $hasCurrency = Schema::hasColumn('units', 'currency');
            $hasSecurityDepositCurrency = Schema::hasColumn('units', 'security_deposit_currency');

            $this->line(($hasCurrency ? "✓" : "✗") . " currency: " . ($hasCurrency ? "EXISTS" : "MISSING"));
            $this->line(($hasSecurityDepositCurrency ? "✓" : "✗") . " security_deposit_currency: " . ($hasSecurityDepositCurrency ? "EXISTS" : "MISSING"));
            $this->newLine();

            if ($hasCurrency && $hasSecurityDepositCurrency) {
                $this->info('✅ SUCCESS! Database is properly configured.');
                $this->info('You can now create units with currency fields.');
                return 0;
            } else {
                $this->warn('⚠️  WARNING: Some columns are still missing.');
                return 1;
            }

        } catch (\Exception $e) {
            $this->error('❌ FATAL ERROR: ' . $e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        }
    }
}
