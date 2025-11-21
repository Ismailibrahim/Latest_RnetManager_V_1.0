<?php

namespace App\Console\Commands;

use App\Services\AutoInvoiceService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateAutoInvoices extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'rent:generate-auto-invoices 
                            {--date= : Invoice date (Y-m-d format, defaults to first day of current month)}
                            {--landlord= : Generate for specific landlord ID only}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate rent invoices automatically for all occupied tenants based on configured schedule';

    /**
     * Execute the console command.
     */
    public function handle(AutoInvoiceService $autoInvoiceService): int
    {
        $this->info('Starting automatic rent invoice generation...');
        $this->newLine();

        // Parse invoice date
        $invoiceDate = null;
        if ($this->option('date')) {
            try {
                $invoiceDate = Carbon::parse($this->option('date'))->startOfMonth();
            } catch (\Exception $e) {
                $this->error('Invalid date format. Use Y-m-d format (e.g., 2024-01-01)');
                return Command::FAILURE;
            }
        } else {
            $invoiceDate = Carbon::now()->startOfMonth();
        }

        // Check if specific landlord
        $landlordId = $this->option('landlord');

        if ($landlordId) {
            // Generate for specific landlord
            $this->info("Generating invoices for landlord ID: {$landlordId}");
            $result = $autoInvoiceService->generateInvoicesForLandlord((int) $landlordId, $invoiceDate);

            $this->displayResults([$result]);
        } else {
            // Generate for all enabled landlords
            $this->info('Generating invoices for all landlords with auto-invoice enabled...');
            $this->info("Invoice date: {$invoiceDate->format('Y-m-d')}");
            $this->newLine();

            $result = $autoInvoiceService->generateInvoicesForAllEnabled($invoiceDate);

            $this->displayResults($result['results'] ?? []);
            $this->newLine();
            $this->info("Summary:");
            $this->line("  Total landlords: {$result['total_landlords']}");
            $this->line("  Processed: {$result['processed']}");
            $this->line("  Success: {$result['success']}");
            $this->line("  Failed: {$result['failed']}");
        }

        return Command::SUCCESS;
    }

    /**
     * Display results for each landlord.
     */
    private function displayResults(array $results): void
    {
        foreach ($results as $landlordResult) {
            $result = $landlordResult['result'] ?? [];
            $landlordName = $landlordResult['landlord_name'] ?? 'Unknown';

            $this->newLine();
            $this->info("Landlord: {$landlordName}");

            if ($result['success'] ?? false) {
                $this->line("  Status: ✓ Success");
                $this->line("  Created: {$result['created']}");
                $this->line("  Skipped: {$result['skipped']}");
                $this->line("  Failed: {$result['failed']}");

                if (!empty($result['invoices'])) {
                    $this->newLine();
                    $this->line("  Generated invoices:");
                    foreach (array_slice($result['invoices'], 0, 10) as $invoice) {
                        $this->line("    - {$invoice['invoice_number']} for {$invoice['tenant_name']} (Unit: {$invoice['unit_number']})");
                    }
                    if (count($result['invoices']) > 10) {
                        $remaining = count($result['invoices']) - 10;
                        $this->line("    ... and {$remaining} more");
                    }
                }

                if (!empty($result['skipped_details'])) {
                    $this->newLine();
                    $this->line("  Skipped:");
                    foreach ($result['skipped_details'] as $skipped) {
                        $this->line("    - {$skipped['tenant_name']} (Unit: {$skipped['unit_number']}): {$skipped['reason']}");
                    }
                }

                if (!empty($result['failed_details'])) {
                    $this->newLine();
                    $this->warn("  Failed:");
                    foreach ($result['failed_details'] as $failed) {
                        $this->line("    - {$failed['tenant_name']} (Unit: {$failed['unit_number']}): {$failed['reason']}");
                    }
                }
            } else {
                $this->error("  Status: ✗ Failed");
                $this->error("  Message: " . ($result['message'] ?? 'Unknown error'));

                if (!empty($result['errors'])) {
                    foreach ($result['errors'] as $error) {
                        $this->error("    - {$error}");
                    }
                }
            }
        }
    }
}

