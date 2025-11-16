<?php

namespace App\Services\Email;

use InvalidArgumentException;

class EmailServiceFactory
{
    /**
     * Create an email service instance based on provider.
     *
     * @param  string  $provider  Provider name ('gmail' or 'office365')
     * @param  array  $config  Email configuration array
     * @return EmailServiceInterface
     *
     * @throws InvalidArgumentException
     */
    public static function create(string $provider, array $config): EmailServiceInterface
    {
        return match (strtolower($provider)) {
            'gmail' => new GmailEmailService($config),
            'office365', 'office_365', 'microsoft365' => new Office365EmailService($config),
            default => throw new InvalidArgumentException("Unsupported email provider: {$provider}"),
        };
    }

    /**
     * Get available email providers.
     *
     * @return array<string>
     */
    public static function getAvailableProviders(): array
    {
        return ['gmail', 'office365'];
    }
}

