<?php

namespace App\Console\Commands;

use App\Services\SubscriptionExpiryService;
use Illuminate\Console\Command;

class CheckSubscriptionExpiry extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:check-expiry 
                            {--downgrade : Automatically downgrade expired subscriptions to basic tier}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for expired subscriptions and mark them as expired';

    /**
     * Execute the console command.
     */
    public function handle(SubscriptionExpiryService $expiryService): int
    {
        $this->info('Checking for expired subscriptions...');
        $this->newLine();

        $result = $expiryService->checkExpiredSubscriptions();

        $this->info("Checked {$result['checked']} subscriptions");
        $this->info("Marked {$result['expired']} as expired");
        
        if ($result['downgraded'] > 0) {
            $this->info("Downgraded {$result['downgraded']} to basic tier");
        }

        if ($result['expired'] > 0) {
            $this->warn("⚠️  {$result['expired']} subscription(s) have expired");
        } else {
            $this->info('✓ All subscriptions are active');
        }

        $this->newLine();

        return Command::SUCCESS;
    }
}

