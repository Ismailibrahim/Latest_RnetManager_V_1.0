<?php

namespace App\Console\Commands;

use App\Models\TenantUnit;
use App\Models\UnifiedPaymentEntry;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixSecurityDepositPaid extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:security-deposit-paid {--dry-run : Show what would be changed without actually updating}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix security_deposit_paid for existing tenant units by syncing with actual payment records';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $isDryRun = $this->option('dry-run');
        
        $this->info('========================================');
        $this->info('FIXING SECURITY DEPOSIT PAID');
        $this->info('========================================');
        $this->newLine();

        if ($isDryRun) {
            $this->warn('DRY RUN MODE - No changes will be made');
            $this->newLine();
        }

        // Get all tenant units
        $tenantUnits = TenantUnit::query()->get();
        $totalCount = $tenantUnits->count();
        
        $this->info("Found {$totalCount} tenant unit(s) to check");
        $this->newLine();

        $updatedCount = 0;
        $unchangedCount = 0;
        $bar = $this->output->createProgressBar($totalCount);
        $bar->start();

        foreach ($tenantUnits as $tenantUnit) {
            // Get actual security deposit payments for this tenant unit
            $actualPayments = UnifiedPaymentEntry::query()
                ->where('tenant_unit_id', $tenantUnit->id)
                ->where('payment_type', 'security_deposit')
                ->where('status', 'completed')
                ->sum('amount');

            $actualPaid = (float) $actualPayments;
            $currentPaid = (float) ($tenantUnit->security_deposit_paid ?? 0);

            // Only update if there's a difference
            if (abs($actualPaid - $currentPaid) > 0.01) {
                if (!$isDryRun) {
                    $tenantUnit->security_deposit_paid = $actualPaid;
                    $tenantUnit->save();
                }

                $updatedCount++;
                
                if ($this->getOutput()->isVerbose()) {
                    $this->newLine();
                    $this->line("Tenant Unit #{$tenantUnit->id}:");
                    $this->line("  Current: " . number_format($currentPaid, 2));
                    $this->line("  Actual payments: " . number_format($actualPaid, 2));
                    $this->line("  → Will be set to: " . number_format($actualPaid, 2));
                }
            } else {
                $unchangedCount++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        // Summary
        $this->info('========================================');
        $this->info('SUMMARY');
        $this->info('========================================');
        $this->info("Total tenant units checked: {$totalCount}");
        $this->info("Updated: {$updatedCount}");
        $this->info("Unchanged: {$unchangedCount}");
        $this->newLine();

        if ($isDryRun) {
            $this->warn('This was a dry run. Run without --dry-run to apply changes.');
        } else {
            $this->info('✓ Security deposit paid amounts have been synced with actual payment records.');
        }

        return 0;
    }
}
