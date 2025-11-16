<?php

namespace App\Jobs;

use App\Services\SmsNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendSmsNotificationJob implements ShouldQueue
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
        public string $message,
        public array $options = []
    ) {
    }

    /**
     * Execute the job.
     */
    public function handle(SmsNotificationService $smsService): void
    {
        try {
            $result = $smsService->sendCustomSms($this->landlordId, $this->to, $this->message, array_merge($this->options, ['sync' => true]));

            // Check if SMS was sent successfully
            if ($result === false || (is_array($result) && isset($result['error']))) {
                $errorMessage = is_array($result) && isset($result['error']) 
                    ? $result['error'] 
                    : 'SMS service returned false';
                throw new \Exception($errorMessage);
            }

            Log::info("SMS sent successfully via queue", [
                'landlord_id' => $this->landlordId,
                'to' => $this->to,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to send SMS via queue: {$e->getMessage()}", [
                'landlord_id' => $this->landlordId,
                'to' => $this->to,
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
        Log::error("SMS notification job failed after all retries", [
            'landlord_id' => $this->landlordId,
            'to' => $this->to,
            'error' => $exception->getMessage(),
        ]);
    }
}

