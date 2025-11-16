<?php

namespace App\Services\Sms;

interface SmsServiceInterface
{
    /**
     * Send an SMS message.
     *
     * @param  string  $to  Recipient phone number
     * @param  string  $message  SMS message text
     * @param  array  $options  Additional options (sender_id, etc.)
     * @return bool True if SMS was sent successfully, false otherwise
     */
    public function send(string $to, string $message, array $options = []): bool;

    /**
     * Test the SMS connection/configuration.
     *
     * @return bool True if connection is successful, false otherwise
     */
    public function testConnection(): bool;

    /**
     * Get the provider name.
     *
     * @return string Provider name (e.g., 'msgowl')
     */
    public function getProviderName(): string;
}

