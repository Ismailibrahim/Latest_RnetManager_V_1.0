<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CheckCurrencyColumns extends Command
{
    protected $signature = 'db:check-currency';
    protected $description = 'Check if currency columns exist in tenant_units and financial_records tables';

    public function handle()
    {
        $this->info('==========================================');
        $this->info('Checking Currency Columns in Database');
        $this->info('==========================================');
        $this->newLine();

        // Check tenant_units
        $this->info('1. Checking tenant_units table...');
        try {
            $r1 = DB::select("SHOW COLUMNS FROM tenant_units WHERE Field = 'currency'");
            $tenantExists = count($r1) > 0;
            
            if ($tenantExists) {
                $col = $r1[0];
                $this->info('   ✅ Currency column EXISTS');
                $this->line('   Type: ' . ($col->Type ?? 'N/A'));
                $this->line('   Null: ' . ($col->Null ?? 'N/A'));
                $this->line('   Default: ' . ($col->Default ?? 'N/A'));
            } else {
                $this->error('   ❌ Currency column NOT FOUND');
            }
        } catch (\Exception $e) {
            $this->error('   ❌ Error: ' . $e->getMessage());
            $tenantExists = false;
        }

        $this->newLine();

        // Check financial_records
        $this->info('2. Checking financial_records table...');
        try {
            $r2 = DB::select("SHOW COLUMNS FROM financial_records WHERE Field = 'currency'");
            $financialExists = count($r2) > 0;
            
            if ($financialExists) {
                $col = $r2[0];
                $this->info('   ✅ Currency column EXISTS');
                $this->line('   Type: ' . ($col->Type ?? 'N/A'));
                $this->line('   Null: ' . ($col->Null ?? 'N/A'));
                $this->line('   Default: ' . ($col->Default ?? 'N/A'));
            } else {
                $this->error('   ❌ Currency column NOT FOUND');
            }
        } catch (\Exception $e) {
            $this->error('   ❌ Error: ' . $e->getMessage());
            $financialExists = false;
        }

        $this->newLine();
        $this->info('==========================================');
        
        // Summary
        if (isset($tenantExists) && isset($financialExists) && $tenantExists && $financialExists) {
            $this->info('✅ SUCCESS: Both columns exist!');
            return 0;
        } else {
            $this->warn('⚠️  WARNING: Some columns are missing.');
            if (!isset($tenantExists) || !$tenantExists) {
                $this->line('   - tenant_units.currency is missing');
            }
            if (!isset($financialExists) || !$financialExists) {
                $this->line('   - financial_records.currency is missing');
            }
            return 1;
        }
    }
}
