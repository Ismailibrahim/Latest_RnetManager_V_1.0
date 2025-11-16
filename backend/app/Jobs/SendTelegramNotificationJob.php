<?php

namespace App\Jobs;

use App\Services\TelegramNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendTelegramNotificationJob implements ShouldQueue
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
        public string $chatId,
        public string $message,
        public array $options = []
    ) {
    }

    /**
     * Execute the job.
     */
    public function handle(TelegramNotificationService $telegramService): void
    {
        try {
            $success = $telegramService->sendCustomMessage(
                $this->landlordId,
                $this->chatId,
                $this->message,
                array_merge($this->options, ['sync' => true])
            );

            if (! $success) {
                throw new \Exception('Telegram service returned false');
            }

            Log::info("Telegram message sent successfully via queue", [
                'landlord_id' => $this->landlordId,
                'chat_id' => $this->chatId,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to send Telegram message via queue: {$e->getMessage()}", [
                'landlord_id' => $this->landlordId,
                'chat_id' => $this->chatId,
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
        Log::error("Telegram notification job failed after all retries", [
            'landlord_id' => $this->landlordId,
            'chat_id' => $this->chatId,
            'error' => $exception->getMessage(),
        ]);
    }
}

