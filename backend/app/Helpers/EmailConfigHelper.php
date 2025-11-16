<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Crypt;

class EmailConfigHelper
{
    /**
     * Encrypt a password or sensitive value.
     *
     * @param  string  $value  Value to encrypt
     * @return string Encrypted value
     */
    public static function encryptPassword(string $value): string
    {
        if (empty($value)) {
            return '';
        }

        return Crypt::encryptString($value);
    }

    /**
     * Decrypt a password or sensitive value.
     *
     * @param  string  $encrypted  Encrypted value
     * @return string Decrypted value
     */
    public static function decryptPassword(string $encrypted): string
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
     * Configure Laravel mail settings based on landlord email settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  array  $emailSettings  Email settings array
     * @return void
     */
    public static function configureMailForLandlord(int $landlordId, array $emailSettings): void
    {
        $provider = $emailSettings['provider'] ?? 'gmail';
        $smtpHost = $emailSettings['smtp_host'] ?? self::getDefaultSmtpHost($provider);
        $smtpPort = $emailSettings['smtp_port'] ?? 587;
        $smtpEncryption = $emailSettings['smtp_encryption'] ?? 'tls';
        $smtpUsername = $emailSettings['smtp_username'] ?? '';
        $smtpPassword = ! empty($emailSettings['smtp_password']) 
            ? self::decryptPassword($emailSettings['smtp_password']) 
            : '';

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp' => [
                'transport' => 'smtp',
                'host' => $smtpHost,
                'port' => $smtpPort,
                'encryption' => $smtpEncryption,
                'username' => $smtpUsername,
                'password' => $smtpPassword,
                'timeout' => null,
                'local_domain' => parse_url(config('app.url', 'http://localhost'), PHP_URL_HOST),
            ],
            'mail.from' => [
                'address' => $emailSettings['from_address'] ?? config('mail.from.address'),
                'name' => $emailSettings['from_name'] ?? config('mail.from.name'),
            ],
        ]);
    }

    /**
     * Get default SMTP host for provider.
     *
     * @param  string  $provider  Provider name
     * @return string Default SMTP host
     */
    protected static function getDefaultSmtpHost(string $provider): string
    {
        return match (strtolower($provider)) {
            'gmail' => 'smtp.gmail.com',
            'office365', 'office_365', 'microsoft365' => 'smtp.office365.com',
            default => 'smtp.gmail.com',
        };
    }

    /**
     * Prepare email settings for storage (encrypt sensitive fields).
     *
     * @param  array  $emailSettings  Email settings array
     * @return array Prepared email settings with encrypted passwords
     */
    public static function prepareForStorage(array $emailSettings): array
    {
        // Only encrypt if password is provided and not already encrypted
        if (isset($emailSettings['smtp_password']) && ! empty($emailSettings['smtp_password'])) {
            // Check if it's already encrypted (starts with base64 encoded pattern or is very long)
            // Simple heuristic: if it doesn't look encrypted, encrypt it
            if (strlen($emailSettings['smtp_password']) < 100) {
                $emailSettings['smtp_password'] = self::encryptPassword($emailSettings['smtp_password']);
            }
        }

        if (isset($emailSettings['oauth_client_secret']) && ! empty($emailSettings['oauth_client_secret'])) {
            if (strlen($emailSettings['oauth_client_secret']) < 100) {
                $emailSettings['oauth_client_secret'] = self::encryptPassword($emailSettings['oauth_client_secret']);
            }
        }

        return $emailSettings;
    }

    /**
     * Prepare email settings for API response (decrypt sensitive fields only if needed for display).
     *
     * @param  array  $emailSettings  Email settings array
     * @param  bool  $includePasswords  Whether to include decrypted passwords (default: false for security)
     * @return array Prepared email settings
     */
    public static function prepareForResponse(array $emailSettings, bool $includePasswords = false): array
    {
        // By default, don't include passwords in response
        if (! $includePasswords) {
            unset($emailSettings['smtp_password']);
            unset($emailSettings['oauth_client_secret']);
        } else {
            // Decrypt if needed
            if (isset($emailSettings['smtp_password']) && ! empty($emailSettings['smtp_password'])) {
                $emailSettings['smtp_password'] = self::decryptPassword($emailSettings['smtp_password']);
            }

            if (isset($emailSettings['oauth_client_secret']) && ! empty($emailSettings['oauth_client_secret'])) {
                $emailSettings['oauth_client_secret'] = self::decryptPassword($emailSettings['oauth_client_secret']);
            }
        }

        return $emailSettings;
    }
}

