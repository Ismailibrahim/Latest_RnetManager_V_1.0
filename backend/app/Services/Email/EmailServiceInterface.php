<?php

namespace App\Services\Email;

interface EmailServiceInterface
{
    /**
     * Send an email.
     *
     * @param  string  $to  Recipient email address
     * @param  string  $subject  Email subject
     * @param  string  $body  Email body (HTML)
     * @param  array  $options  Additional options (from, fromName, cc, bcc, attachments, etc.)
     * @return bool True if email was sent successfully, false otherwise
     */
    public function send(string $to, string $subject, string $body, array $options = []): bool;

    /**
     * Test the email connection/configuration.
     *
     * @return bool True if connection is successful, false otherwise
     */
    public function testConnection(): bool;

    /**
     * Get the provider name.
     *
     * @return string Provider name (e.g., 'gmail', 'office365')
     */
    public function getProviderName(): string;
}

