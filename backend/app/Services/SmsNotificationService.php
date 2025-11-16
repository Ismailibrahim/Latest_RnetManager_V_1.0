<?php

namespace App\Services;

use App\Helpers\SmsConfigHelper;
use App\Jobs\SendSmsNotificationJob;
use App\Models\SmsTemplate;
use App\Services\Sms\SmsServiceFactory;
use Illuminate\Support\Facades\Log;

class SmsNotificationService
{
    public function __construct(
        private readonly SystemSettingsService $settingsService
    ) {
    }

    /**
     * Send a notification SMS by type.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  string  $type  Notification type (rent_due, rent_received, etc.)
     * @param  array  $data  Data for the SMS template
     * @param  string|null  $to  Recipient phone number (optional, will use data['mobile'] or data['phone'] if not provided)
     * @return bool True if SMS was sent successfully
     */
    public function sendNotification(int $landlordId, string $type, array $data, ?string $to = null): bool
    {
        try {
            // Get SMS settings
            $smsSettings = $this->settingsService->getSmsSettings($landlordId);

            // Check if SMS is enabled
            if (! ($smsSettings['enabled'] ?? false)) {
                Log::info("SMS notifications are disabled for landlord {$landlordId}");
                return false;
            }

            // Check if this notification type is enabled
            $notificationConfig = $smsSettings['notifications'][$type] ?? null;
            if (! ($notificationConfig['enabled'] ?? false)) {
                Log::info("SMS notification type '{$type}' is disabled for landlord {$landlordId}");
                return false;
            }

            // Get recipient phone number
            $recipientPhone = $to ?? $data['mobile'] ?? $data['phone'] ?? null;
            if (empty($recipientPhone)) {
                Log::warning("No recipient phone number provided for notification type '{$type}' for landlord {$landlordId}");
                return false;
            }

            // Get template
            $templateId = $notificationConfig['template_id'] ?? null;
            $template = null;

            if ($templateId) {
                $template = SmsTemplate::where('id', $templateId)
                    ->where('landlord_id', $landlordId)
                    ->where('type', $type)
                    ->first();
            }

            // If no template found, use default template
            if (! $template) {
                $template = SmsTemplate::where('landlord_id', $landlordId)
                    ->where('type', $type)
                    ->where('is_default', true)
                    ->first();
            }

            // If still no template, create a basic SMS
            if (! $template) {
                return $this->sendCustomSms($landlordId, $recipientPhone, $this->getDefaultMessage($type, $data));
            }

            // Render template
            $message = $this->renderTemplate($template->message, $data);

            return $this->sendCustomSms($landlordId, $recipientPhone, $message);
        } catch (\Exception $e) {
            Log::error("Failed to send SMS notification: {$e->getMessage()}", [
                'landlord_id' => $landlordId,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Send a custom SMS.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  string  $to  Recipient phone number
     * @param  string  $message  SMS message text
     * @param  array  $options  Additional options
     * @return bool|array True if SMS was sent successfully, or array with error info on failure
     */
    public function sendCustomSms(int $landlordId, string $to, string $message, array $options = []): bool|array
    {
        try {
            // Get SMS settings
            $smsSettings = $this->settingsService->getSmsSettings($landlordId);

            // Check if SMS is enabled
            if (! ($smsSettings['enabled'] ?? false)) {
                return false;
            }

            // Get provider
            $provider = $smsSettings['provider'] ?? 'msgowl';

            // Prepare config for SMS service (decrypt API key or use env variable)
            $config = $smsSettings;
            if (! empty($config['api_key'])) {
                $config['api_key'] = SmsConfigHelper::decryptApiKey($config['api_key']);
            } elseif (empty($config['api_key']) && ! empty(env('MSG_OWL_KEY'))) {
                // Use environment variable as fallback
                $config['api_key'] = env('MSG_OWL_KEY');
            }

            // Create SMS service
            $smsService = SmsServiceFactory::create($provider, $config);

            // Send SMS (use queue if configured)
            if (config('queue.default') !== 'sync' && ! ($options['sync'] ?? false)) {
                SendSmsNotificationJob::dispatch($landlordId, $to, $message, $options);
                return true;
            }

            $result = $smsService->send($to, $message, $options);
            
            // If send failed and we have error info, return it
            if ($result === false) {
                $errorInfo = ['success' => false];
                if (method_exists($smsService, 'getLastError')) {
                    $lastError = $smsService->getLastError();
                    if ($lastError) {
                        $errorInfo['error'] = $lastError;
                    }
                }
                // Only return error array if we have error info, otherwise return false
                return !empty($errorInfo['error']) ? $errorInfo : false;
            }
            
            return $result;
        } catch (\Exception $e) {
            Log::error("Failed to send custom SMS: {$e->getMessage()}", [
                'landlord_id' => $landlordId,
                'to' => $to,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Send a test SMS.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  string  $to  Recipient phone number
     * @return bool|array True if SMS was sent successfully, or array with error info on failure
     */
    public function testSms(int $landlordId, string $to): bool|array
    {
        $message = 'Test SMS - ' . config('app.name') . '. This is a test message to verify your SMS configuration is working correctly.';

        return $this->sendCustomSms($landlordId, $to, $message, ['sync' => true]);
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

        return match ($type) {
            'rent_due' => "Rent Payment Due: {$message}",
            'rent_received' => "Rent Payment Received: {$message}",
            'maintenance_request' => "Maintenance Request Update: {$message}",
            'lease_expiry' => "Lease Expiration Reminder: {$message}",
            'security_deposit' => "Security Deposit Update: {$message}",
            default => "Notification from " . config('app.name') . ": {$message}",
        };
    }
}

