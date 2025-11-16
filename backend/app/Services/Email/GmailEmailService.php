<?php

namespace App\Services\Email;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class GmailEmailService implements EmailServiceInterface
{
    protected array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    /**
     * Send an email via Gmail SMTP.
     */
    public function send(string $to, string $subject, string $body, array $options = []): bool
    {
        try {
            // Configure mail for this specific send
            $this->configureMail();

            $fromAddress = $options['from'] ?? $this->config['from_address'] ?? config('mail.from.address');
            $fromName = $options['fromName'] ?? $this->config['from_name'] ?? config('mail.from.name');

            Mail::raw($body, function ($message) use ($to, $subject, $fromAddress, $fromName, $options) {
                $message->to($to)
                    ->subject($subject)
                    ->from($fromAddress, $fromName);

                if (isset($options['cc'])) {
                    $message->cc($options['cc']);
                }

                if (isset($options['bcc'])) {
                    $message->bcc($options['bcc']);
                }

                if (isset($options['attachments'])) {
                    foreach ($options['attachments'] as $attachment) {
                        if (is_string($attachment)) {
                            $message->attach($attachment);
                        } elseif (is_array($attachment)) {
                            $message->attach($attachment['path'], $attachment['options'] ?? []);
                        }
                    }
                }
            });

            return true;
        } catch (TransportExceptionInterface $e) {
            Log::error('Gmail email send failed: ' . $e->getMessage(), [
                'to' => $to,
                'subject' => $subject,
                'error' => $e->getMessage(),
            ]);

            return false;
        } catch (\Exception $e) {
            Log::error('Gmail email send error: ' . $e->getMessage(), [
                'to' => $to,
                'subject' => $subject,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Test the Gmail SMTP connection.
     */
    public function testConnection(): bool
    {
        try {
            $this->configureMail();

            // Try to send a test email to the configured from address
            $testEmail = $this->config['from_address'] ?? config('mail.from.address');
            if (empty($testEmail)) {
                return false;
            }

            Mail::raw('This is a test email to verify Gmail SMTP configuration.', function ($message) use ($testEmail) {
                $message->to($testEmail)
                    ->subject('Gmail SMTP Test')
                    ->from($testEmail, 'Test');
            });

            return true;
        } catch (\Exception $e) {
            Log::error('Gmail connection test failed: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Get the provider name.
     */
    public function getProviderName(): string
    {
        return 'gmail';
    }

    /**
     * Configure Laravel mail settings for Gmail.
     */
    protected function configureMail(): void
    {
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp' => [
                'transport' => 'smtp',
                'host' => $this->config['smtp_host'] ?? 'smtp.gmail.com',
                'port' => $this->config['smtp_port'] ?? 587,
                'encryption' => $this->config['smtp_encryption'] ?? 'tls',
                'username' => $this->config['smtp_username'],
                'password' => $this->config['smtp_password'],
                'timeout' => null,
                'local_domain' => parse_url(config('app.url', 'http://localhost'), PHP_URL_HOST),
            ],
            'mail.from' => [
                'address' => $this->config['from_address'] ?? config('mail.from.address'),
                'name' => $this->config['from_name'] ?? config('mail.from.name'),
            ],
        ]);
    }
}

