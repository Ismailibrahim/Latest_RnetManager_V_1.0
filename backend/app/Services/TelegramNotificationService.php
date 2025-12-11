<?php

namespace App\Services;

use App\Helpers\TelegramConfigHelper;
use App\Jobs\SendTelegramNotificationJob;
use App\Models\TelegramTemplate;
use App\Services\Telegram\TelegramService;
use Illuminate\Support\Facades\Log;

class TelegramNotificationService
{
    public function __construct(
        private readonly SystemSettingsService $settingsService
    ) {
    }

    /**
     * Send a notification via Telegram by type.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  string  $type  Notification type (rent_due, rent_received, etc.)
     * @param  array  $data  Data for the Telegram template
     * @param  string|null  $chatId  Recipient chat ID (optional, will use settings default if not provided)
     * @return bool True if message was sent successfully
     */
    public function sendNotification(int $landlordId, string $type, array $data, ?string $chatId = null): bool
    {
        try {
            // Get Telegram settings
            $telegramSettings = $this->settingsService->getTelegramSettings($landlordId);

            // Check if Telegram is enabled
            if (! ($telegramSettings['enabled'] ?? false)) {
                Log::info("Telegram notifications are disabled for landlord {$landlordId}");
                return false;
            }

            // Check if this notification type is enabled
            $notificationConfig = $telegramSettings['notifications'][$type] ?? null;
            if (! ($notificationConfig['enabled'] ?? false)) {
                Log::info("Telegram notification type '{$type}' is disabled for landlord {$landlordId}");
                return false;
            }

            // Get recipient chat ID
            $recipientChatId = $chatId ?? $telegramSettings['chat_id'] ?? null;
            if (empty($recipientChatId)) {
                Log::warning("No recipient chat ID provided for notification type '{$type}' for landlord {$landlordId}");
                return false;
            }

            // Get template
            $templateId = $notificationConfig['template_id'] ?? null;
            $template = null;

            if ($templateId) {
                $template = TelegramTemplate::where('id', $templateId)
                    ->where('landlord_id', $landlordId)
                    ->where('type', $type)
                    ->first();
            }

            // If no template found, use default template
            if (! $template) {
                $template = TelegramTemplate::where('landlord_id', $landlordId)
                    ->where('type', $type)
                    ->where('is_default', true)
                    ->first();
            }

            // If still no template, create a basic message
            if (! $template) {
                return $this->sendCustomMessage($landlordId, $recipientChatId, $this->getDefaultMessage($type, $data));
            }

            // Render template
            $message = $this->renderTemplate($template->message, $data);
            $parseMode = $template->parse_mode !== 'None' ? $template->parse_mode : null;

            return $this->sendCustomMessage($landlordId, $recipientChatId, $message, ['parse_mode' => $parseMode]);
        } catch (\Exception $e) {
            Log::error("Failed to send Telegram notification: {$e->getMessage()}", [
                'landlord_id' => $landlordId,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Send a custom Telegram message.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  string  $chatId  Recipient chat ID
     * @param  string  $message  Message text
     * @param  array  $options  Additional options (parse_mode, disable_web_page_preview, etc.)
     * @return bool True if message was sent successfully
     */
    public function sendCustomMessage(int $landlordId, string $chatId, string $message, array $options = []): bool
    {
        try {
            // Get Telegram settings
            $telegramSettings = $this->settingsService->getTelegramSettings($landlordId);

            // Check if Telegram is enabled
            if (! ($telegramSettings['enabled'] ?? false)) {
                throw new \Exception('Telegram notifications are not enabled. Please enable Telegram notifications first.');
            }

            // Get bot token (per-landlord or global)
            $botToken = $telegramSettings['bot_token'] ?? config('services.telegram.bot_token');
            
            // Decrypt if stored in settings
            if (! empty($telegramSettings['bot_token'])) {
                $botToken = TelegramConfigHelper::decryptBotToken($telegramSettings['bot_token']);
            } elseif (empty($botToken) && ! empty(env('TELEGRAM_BOT_TOKEN'))) {
                // Use environment variable as fallback
                $botToken = env('TELEGRAM_BOT_TOKEN');
            }
            
            if (empty($botToken)) {
                Log::error("No bot token configured for landlord {$landlordId}");
                throw new \Exception('Telegram bot token is not configured. Please set TELEGRAM_BOT_TOKEN in your .env file or enter a bot token in settings.');
            }

            // Use parse_mode from options or settings default
            if (! isset($options['parse_mode']) && isset($telegramSettings['parse_mode'])) {
                $options['parse_mode'] = $telegramSettings['parse_mode'] !== 'None' ? $telegramSettings['parse_mode'] : null;
            }

            // Create Telegram service
            $telegramService = new TelegramService($botToken);

            // Send message (use queue if configured)
            if (config('queue.default') !== 'sync' && ! ($options['sync'] ?? false)) {
                SendTelegramNotificationJob::dispatch($landlordId, $chatId, $message, $options);
                return true;
            }

            $result = $telegramService->sendMessage($chatId, $message, $options);

            // Handle result (can be bool or array with error info)
            if ($result === true) {
                return true;
            }

            if (is_array($result) && isset($result['error'])) {
                Log::error("Telegram send failed: {$result['error']}", [
                    'landlord_id' => $landlordId,
                    'chat_id' => $chatId,
                    'error' => $result['error'],
                    'error_code' => $result['error_code'] ?? null,
                ]);
                
                // Throw exception with error details for better error handling
                throw new \Exception($result['error']);
            }

            // If result is false but no error details, throw generic exception
            throw new \Exception('Failed to send Telegram message. Please check your configuration.');
        } catch (\Exception $e) {
            Log::error("Failed to send custom Telegram message: {$e->getMessage()}", [
                'landlord_id' => $landlordId,
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);

            // Re-throw exception so caller can handle it properly
            throw $e;
        }
    }

    /**
     * Send a test Telegram message.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  string  $chatId  Recipient chat ID
     * @return bool True if message was sent successfully
     */
    /**
     * Send a test Telegram message.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  string  $chatId  Recipient chat ID
     * @return bool True if message was sent successfully
     * @throws \Exception If message sending fails
     */
    public function testTelegram(int $landlordId, string $chatId): bool
    {
        $message = 'Test Telegram - ' . config('app.name') . '. This is a test message to verify your Telegram configuration is working correctly.';

        // sendCustomMessage now throws exceptions, so we just need to call it
        // If it succeeds, it returns true, otherwise it throws
        return $this->sendCustomMessage($landlordId, $chatId, $message, ['sync' => true]);
    }

    /**
     * Render template with data.
     *
     * @param  string  $template  Template string with placeholders
     * @param  array  $data  Data to replace placeholders
     * @return string Rendered template
     */
    protected function renderTemplate(string $template, array $data): string
    {
        $rendered = $template;

        foreach ($data as $key => $value) {
            $placeholder = '{{' . $key . '}}';
            $rendered = str_replace($placeholder, $value, $rendered);
        }

        return $rendered;
    }

    /**
     * Get default message for notification type.
     *
     * @param  string  $type  Notification type
     * @param  array  $data  Notification data
     * @return string Default message
     */
    protected function getDefaultMessage(string $type, array $data): string
    {
        $message = $data['message'] ?? 'You have a new notification.';
        $title = $data['title'] ?? '';

        $prefix = match ($type) {
            'rent_due' => 'Rent Payment Due',
            'rent_received' => 'Rent Payment Received',
            'maintenance_request' => 'Maintenance Request Update',
            'lease_expiry' => 'Lease Expiration Reminder',
            'security_deposit' => 'Security Deposit Update',
            'signup_pending' => 'Pending Signup Notification',
            'user_login' => 'User Login Notification',
            default => 'Notification from ' . config('app.name'),
        };

        if (! empty($title)) {
            return "{$prefix}: {$title}\n\n{$message}";
        }

        return "{$prefix}: {$message}";
    }

    /**
     * Send notification to all super admins (for system-level notifications like signups).
     *
     * @param  string  $type  Notification type (e.g., 'signup_pending')
     * @param  array  $data  Data for the Telegram template
     * @return int Number of super admins notified
     */
    public function notifySuperAdmins(string $type, array $data): int
    {
        try {
            // Get all super admin users
            $superAdmins = \App\Models\User::where('role', \App\Models\User::ROLE_SUPER_ADMIN)
                ->where('is_active', true)
                ->whereNotNull('landlord_id')
                ->get();

            $notifiedCount = 0;

            foreach ($superAdmins as $superAdmin) {
                // Send notification using the super admin's landlord settings
                if ($this->sendNotification($superAdmin->landlord_id, $type, $data)) {
                    $notifiedCount++;
                }
            }

            return $notifiedCount;
        } catch (\Exception $e) {
            Log::error("Failed to notify super admins: {$e->getMessage()}", [
                'type' => $type,
                'error' => $e->getMessage(),
            ]);

            return 0;
        }
    }
}

