<?php

namespace App\Services;

use App\Helpers\EmailConfigHelper;
use App\Jobs\SendEmailNotificationJob;
use App\Models\EmailTemplate;
use App\Services\Email\EmailServiceFactory;
use Illuminate\Support\Facades\Log;

class EmailNotificationService
{
    public function __construct(
        private readonly SystemSettingsService $settingsService
    ) {
    }

    /**
     * Send a notification email by type.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  string  $type  Notification type (rent_due, rent_received, etc.)
     * @param  array  $data  Data for the email template
     * @param  string|null  $to  Recipient email (optional, will use data['email'] if not provided)
     * @return bool True if email was sent successfully
     */
    public function sendNotification(int $landlordId, string $type, array $data, ?string $to = null): bool
    {
        try {
            // Get email settings
            $emailSettings = $this->settingsService->getEmailSettings($landlordId);

            // Check if email is enabled
            if (! ($emailSettings['enabled'] ?? false)) {
                Log::info("Email notifications are disabled for landlord {$landlordId}");
                return false;
            }

            // Check if this notification type is enabled
            $notificationConfig = $emailSettings['notifications'][$type] ?? null;
            if (! ($notificationConfig['enabled'] ?? false)) {
                Log::info("Email notification type '{$type}' is disabled for landlord {$landlordId}");
                return false;
            }

            // Get recipient email
            $recipientEmail = $to ?? $data['email'] ?? null;
            if (empty($recipientEmail)) {
                Log::warning("No recipient email provided for notification type '{$type}' for landlord {$landlordId}");
                return false;
            }

            // Get template
            $templateId = $notificationConfig['template_id'] ?? null;
            $template = null;

            if ($templateId) {
                $template = EmailTemplate::where('id', $templateId)
                    ->where('landlord_id', $landlordId)
                    ->where('type', $type)
                    ->first();
            }

            // If no template found, use default template
            if (! $template) {
                $template = EmailTemplate::where('landlord_id', $landlordId)
                    ->where('type', $type)
                    ->where('is_default', true)
                    ->first();
            }

            // If still no template, create a basic email
            if (! $template) {
                return $this->sendCustomEmail($landlordId, $recipientEmail, $this->getDefaultSubject($type), $this->getDefaultBody($type, $data));
            }

            // Render template
            $subject = $this->renderTemplate($template->subject, $data);
            $body = $this->renderTemplate($template->body_html ?? $template->body_text, $data);

            return $this->sendCustomEmail($landlordId, $recipientEmail, $subject, $body);
        } catch (\Exception $e) {
            Log::error("Failed to send email notification: {$e->getMessage()}", [
                'landlord_id' => $landlordId,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Send a custom email.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  string  $to  Recipient email
     * @param  string  $subject  Email subject
     * @param  string  $body  Email body (HTML)
     * @param  array  $options  Additional options
     * @return bool True if email was sent successfully
     */
    public function sendCustomEmail(int $landlordId, string $to, string $subject, string $body, array $options = []): bool
    {
        try {
            // Get email settings
            $emailSettings = $this->settingsService->getEmailSettings($landlordId);

            // Check if email is enabled
            if (! ($emailSettings['enabled'] ?? false)) {
                return false;
            }

            // Get provider
            $provider = $emailSettings['provider'] ?? 'gmail';

            // Prepare config for email service (decrypt password)
            $config = $emailSettings;
            if (! empty($config['smtp_password'])) {
                $config['smtp_password'] = EmailConfigHelper::decryptPassword($config['smtp_password']);
            }

            // Configure mail for landlord
            EmailConfigHelper::configureMailForLandlord($landlordId, $emailSettings);

            // Create email service
            $emailService = EmailServiceFactory::create($provider, $config);

            // Send email (use queue if configured)
            if (config('queue.default') !== 'sync' && ! ($options['sync'] ?? false)) {
                SendEmailNotificationJob::dispatch($landlordId, $to, $subject, $body, $options);
                return true;
            }

            return $emailService->send($to, $subject, $body, $options);
        } catch (\Exception $e) {
            Log::error("Failed to send custom email: {$e->getMessage()}", [
                'landlord_id' => $landlordId,
                'to' => $to,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Send a test email.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  string  $to  Recipient email
     * @return bool True if email was sent successfully
     */
    public function testEmail(int $landlordId, string $to): bool
    {
        $subject = 'Test Email - ' . config('app.name');
        $body = '<p>This is a test email to verify your email configuration is working correctly.</p>';

        return $this->sendCustomEmail($landlordId, $to, $subject, $body, ['sync' => true]);
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
     * Get default subject for notification type.
     *
     * @param  string  $type  Notification type
     * @return string Default subject
     */
    protected function getDefaultSubject(string $type): string
    {
        return match ($type) {
            'rent_due' => 'Rent Payment Due',
            'rent_received' => 'Rent Payment Received',
            'maintenance_request' => 'Maintenance Request Update',
            'lease_expiry' => 'Lease Expiration Reminder',
            'security_deposit' => 'Security Deposit Update',
            default => 'Notification from ' . config('app.name'),
        };
    }

    /**
     * Get default body for notification type.
     *
     * @param  string  $type  Notification type
     * @param  array  $data  Notification data
     * @return string Default body
     */
    protected function getDefaultBody(string $type, array $data): string
    {
        $message = $data['message'] ?? 'You have a new notification.';

        return "<p>{$message}</p>";
    }
}

