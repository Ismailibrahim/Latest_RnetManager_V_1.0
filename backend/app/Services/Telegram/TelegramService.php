<?php

namespace App\Services\Telegram;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    protected string $botToken;
    protected string $apiUrl;

    public function __construct(string $botToken)
    {
        $this->botToken = $botToken;
        $this->apiUrl = "https://api.telegram.org/bot{$botToken}";
    }

    /**
     * Send a message via Telegram Bot API.
     *
     * @param  string  $chatId  Telegram chat ID
     * @param  string  $message  Message text
     * @param  array  $options  Additional options (parse_mode, disable_web_page_preview, etc.)
     * @return bool|array True if message was sent successfully, or array with error info on failure
     */
    public function sendMessage(string $chatId, string $message, array $options = []): bool|array
    {
        try {
            $payload = [
                'chat_id' => $chatId,
                'text' => $message,
            ];

            // Add parse_mode if specified
            if (isset($options['parse_mode']) && in_array($options['parse_mode'], ['Markdown', 'HTML', 'MarkdownV2'])) {
                $payload['parse_mode'] = $options['parse_mode'];
            }

            // Add disable_web_page_preview if specified
            if (isset($options['disable_web_page_preview'])) {
                $payload['disable_web_page_preview'] = (bool) $options['disable_web_page_preview'];
            }

            $response = Http::timeout(10)->post("{$this->apiUrl}/sendMessage", $payload);

            if ($response->successful()) {
                $result = $response->json();
                if (isset($result['ok']) && $result['ok'] === true) {
                    return true;
                }

                // API returned error
                $errorInfo = [
                    'success' => false,
                    'error' => $result['description'] ?? 'Unknown Telegram API error',
                    'error_code' => $result['error_code'] ?? null,
                ];

                Log::error('Telegram API error', [
                    'chat_id' => $chatId,
                    'error' => $errorInfo['error'],
                    'error_code' => $errorInfo['error_code'],
                ]);

                return $errorInfo;
            }

            // HTTP request failed
            $errorInfo = [
                'success' => false,
                'error' => 'HTTP request failed: ' . $response->body(),
                'status' => $response->status(),
            ];

            Log::error('Telegram HTTP request failed', [
                'chat_id' => $chatId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return $errorInfo;
        } catch (\Exception $e) {
            Log::error('Telegram send message exception', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Test the Telegram Bot API connection.
     *
     * @return bool True if connection is successful, false otherwise
     */
    public function testConnection(): bool
    {
        try {
            $response = Http::timeout(10)->get("{$this->apiUrl}/getMe");

            if ($response->successful()) {
                $result = $response->json();
                return isset($result['ok']) && $result['ok'] === true;
            }

            return false;
        } catch (\Exception $e) {
            Log::error('Telegram connection test failed', [
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Get bot information.
     *
     * @return array|null Bot information or null on failure
     */
    public function getBotInfo(): ?array
    {
        try {
            $response = Http::timeout(10)->get("{$this->apiUrl}/getMe");

            if ($response->successful()) {
                $result = $response->json();
                if (isset($result['ok']) && $result['ok'] === true && isset($result['result'])) {
                    return $result['result'];
                }
            }

            return null;
        } catch (\Exception $e) {
            Log::error('Failed to get Telegram bot info', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }
}

