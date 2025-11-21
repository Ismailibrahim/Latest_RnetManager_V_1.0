<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Scheduled Tasks
// Run: php artisan schedule:work (development) or set up cron (production)
// Production cron: * * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1

Schedule::command('queue:work --stop-when-empty')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();

// Auto-rent invoice generation - runs daily to check if invoices should be generated
// The command will check each landlord's settings and generate invoices if configured date matches
Schedule::command('rent:generate-auto-invoices')
    ->daily()
    ->at('00:01') // Run at 12:01 AM to catch any configured times
    ->withoutOverlapping()
    ->runInBackground();

// Example: Check for lease expiries (uncomment and implement when ready)
// Schedule::command('leases:check-expiry')
//     ->daily()
//     ->at('10:00');

// Example: Send pending notifications (uncomment and implement when ready)
// Schedule::command('notifications:send-pending')
//     ->everyFiveMinutes();
