<?php

namespace App\Services\Sms;

use InvalidArgumentException;

class SmsServiceFactory
{
    /**
     * Create an SMS service instance based on provider.
     *
     * @param  string  $provider  Provider name ('msgowl')
     * @param  array  $config  SMS configuration array
     * @return SmsServiceInterface
     *
     * @throws InvalidArgumentException
     */
    public static function create(string $provider, array $config): SmsServiceInterface
    {
        return match (strtolower($provider)) {
            'msgowl', 'messageowl' => new MessageOwlSmsService($config),
            default => throw new InvalidArgumentException("Unsupported SMS provider: {$provider}"),
        };
    }

    /**
     * Get available SMS providers.
     *
     * @return array<string>
     */
    public static function getAvailableProviders(): array
    {
        return ['msgowl'];
    }
}

