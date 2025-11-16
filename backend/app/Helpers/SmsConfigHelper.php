<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Crypt;

class SmsConfigHelper
{
    /**
     * Encrypt an API key or sensitive value.
     *
     * @param  string  $value  Value to encrypt
     * @return string Encrypted value
     */
    public static function encryptApiKey(string $value): string
    {
        if (empty($value)) {
            return '';
        }

        return Crypt::encryptString($value);
    }

    /**
     * Decrypt an API key or sensitive value.
     *
     * @param  string  $encrypted  Encrypted value
     * @return string Decrypted value
     */
    public static function decryptApiKey(string $encrypted): string
    {
        if (empty($encrypted)) {
            return '';
        }

        try {
            return Crypt::decryptString($encrypted);
        } catch (\Exception $e) {
            // If decryption fails, return empty string
            return '';
        }
    }

    /**
     * Format API key for Message Owl Authorization header.
     *
     * @param  string  $apiKey  API key
     * @return string Formatted authorization header value
     */
    public static function formatAuthorizationHeader(string $apiKey): string
    {
        return 'AccessKey ' . $apiKey;
    }

    /**
     * Prepare SMS settings for storage (encrypt sensitive fields).
     *
     * @param  array  $smsSettings  SMS settings array
     * @return array Prepared SMS settings with encrypted API key
     */
    public static function prepareForStorage(array $smsSettings): array
    {
        // Only encrypt if API key is provided and not already encrypted
        if (isset($smsSettings['api_key']) && ! empty($smsSettings['api_key'])) {
            // Check if it's already encrypted (starts with base64 encoded pattern or is very long)
            // Simple heuristic: if it doesn't look encrypted, encrypt it
            if (strlen($smsSettings['api_key']) < 200) {
                $smsSettings['api_key'] = self::encryptApiKey($smsSettings['api_key']);
            }
        }

        return $smsSettings;
    }

    /**
     * Prepare SMS settings for API response (remove sensitive fields).
     *
     * @param  array  $smsSettings  SMS settings array
     * @param  bool  $includeApiKey  Whether to include decrypted API key (default: false for security)
     * @return array Prepared SMS settings
     */
    public static function prepareForResponse(array $smsSettings, bool $includeApiKey = false): array
    {
        // By default, don't include API key in response
        if (! $includeApiKey) {
            unset($smsSettings['api_key']);
        } else {
            // Decrypt if needed
            if (isset($smsSettings['api_key']) && ! empty($smsSettings['api_key'])) {
                $smsSettings['api_key'] = self::decryptApiKey($smsSettings['api_key']);
            }
        }

        return $smsSettings;
    }
}

