<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Crypt;

class TelegramConfigHelper
{
    /**
     * Encrypt a bot token or sensitive value.
     *
     * @param  string  $value  Value to encrypt
     * @return string Encrypted value
     */
    public static function encryptBotToken(string $value): string
    {
        if (empty($value)) {
            return '';
        }

        return Crypt::encryptString($value);
    }

    /**
     * Decrypt a bot token or sensitive value.
     *
     * @param  string  $encrypted  Encrypted value
     * @return string Decrypted value
     */
    public static function decryptBotToken(string $encrypted): string
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
     * Prepare Telegram settings for storage (encrypt sensitive fields).
     *
     * @param  array  $telegramSettings  Telegram settings array
     * @return array Prepared Telegram settings with encrypted bot token
     */
    public static function prepareForStorage(array $telegramSettings): array
    {
        // Only encrypt if bot token is provided and not already encrypted
        if (isset($telegramSettings['bot_token']) && ! empty($telegramSettings['bot_token'])) {
            // Check if it's already encrypted (simple heuristic: if it doesn't look encrypted, encrypt it)
            // Telegram bot tokens are typically around 40-50 characters, encrypted tokens are much longer
            if (strlen($telegramSettings['bot_token']) < 200) {
                $telegramSettings['bot_token'] = self::encryptBotToken($telegramSettings['bot_token']);
            }
        }

        return $telegramSettings;
    }

    /**
     * Prepare Telegram settings for API response (remove sensitive fields).
     *
     * @param  array  $telegramSettings  Telegram settings array
     * @param  bool  $includeBotToken  Whether to include decrypted bot token (default: false for security)
     * @return array Prepared Telegram settings
     */
    public static function prepareForResponse(array $telegramSettings, bool $includeBotToken = false): array
    {
        // By default, don't include bot token in response
        if (! $includeBotToken) {
            unset($telegramSettings['bot_token']);
        } else {
            // Decrypt if needed
            if (isset($telegramSettings['bot_token']) && ! empty($telegramSettings['bot_token'])) {
                $telegramSettings['bot_token'] = self::decryptBotToken($telegramSettings['bot_token']);
            }
        }

        return $telegramSettings;
    }
}

