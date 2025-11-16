<?php

namespace App\Jobs;

use App\Helpers\EmailConfigHelper;
use App\Services\Email\EmailServiceFactory;
use App\Services\SystemSettingsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendEmailNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public $backoff = [60, 300, 900]; // 1 minute, 5 minutes, 15 minutes

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $landlordId,
        public string $to,
        public string $subject,
        public string $body,
        public array $options = []
    ) {
    }

    /**
     * Execute the job.
     */
    public function handle(SystemSettingsService $settingsService): void
    {
        try {
            // Get email settings
            $emailSettings = $settingsService->getEmailSettings($this->landlordId);

            // Check if email is enabled
            if (! ($emailSettings['enabled'] ?? false)) {
                Log::info("Email notifications are disabled for landlord {$this->landlordId}");
                return;
            }

            // Get provider
            $provider = $emailSettings['provider'] ?? 'gmail';

            // Prepare config for email service (decrypt password)
            $config = $emailSettings;
            if (! empty($config['smtp_password'])) {
                $config['smtp_password'] = EmailConfigHelper::decryptPassword($config['smtp_password']);
            }

            // Configure mail for landlord
            EmailConfigHelper::configureMailForLandlord($this->landlordId, $emailSettings);

            // Create email service
            $emailService = EmailServiceFactory::create($provider, $config);

            // Send email
            $success = $emailService->send($this->to, $this->subject, $this->body, $this->options);

            if (! $success) {
                throw new \Exception('Email service returned false');
            }

            Log::info("Email sent successfully via queue", [
                'landlord_id' => $this->landlordId,
                'to' => $this->to,
                'subject' => $this->subject,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to send email via queue: {$e->getMessage()}", [
                'landlord_id' => $this->landlordId,
                'to' => $this->to,
                'subject' => $this->subject,
                'attempt' => $this->attempts(),
                'error' => $e->getMessage(),
            ]);

            // Re-throw to trigger retry
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("Email notification job failed after all retries", [
            'landlord_id' => $this->landlordId,
            'to' => $this->to,
            'subject' => $this->subject,
            'error' => $exception->getMessage(),
        ]);
    }
}

