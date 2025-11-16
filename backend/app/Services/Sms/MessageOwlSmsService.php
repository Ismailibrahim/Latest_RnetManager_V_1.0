<?php

namespace App\Services\Sms;

use App\Helpers\SmsConfigHelper;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MessageOwlSmsService implements SmsServiceInterface
{
    private const API_BASE_URL = 'https://rest.msgowl.com';

    private string $apiKey;
    private string $senderId;
    private ?string $lastError = null;

    public function __construct(array $config)
    {
        // Use API key from config, or fall back to environment variable
        $this->apiKey = $config['api_key'] ?? env('MSG_OWL_KEY', '');
        // Use sender_id from config, or empty string (which means use Message Owl's default)
        $this->senderId = $config['sender_id'] ?? '';
    }

    /**
     * Send an SMS message via Message Owl API.
     *
     * @param  string  $to  Recipient phone number
     * @param  string  $message  SMS message text
     * @param  array  $options  Additional options (sender_id override, etc.)
     * @return bool True if SMS was sent successfully, false otherwise
     */
    public function send(string $to, string $message, array $options = []): bool
    {
        if (empty($this->apiKey)) {
            Log::error('Message Owl API key is not configured');
            return false;
        }

        if (empty($to)) {
            Log::error('Recipient phone number is required');
            return false;
        }

        if (empty($message)) {
            Log::error('SMS message cannot be empty');
            return false;
        }

        try {
            $senderId = $options['sender_id'] ?? $this->senderId;
            $formattedPhone = $this->formatPhoneNumber($to);

            // Treat old default 'MSGOWL' and 'MessageOwl' as empty
            $validSenderId = trim($senderId ?? '');
            if (empty($validSenderId) || 
                in_array(strtoupper($validSenderId), ['MSGOWL', 'MESSAGEOWL']) ||
                strtolower($validSenderId) === 'messageowl') {
                // Message Owl requires a valid sender_id
                $this->lastError = 'Sender ID is required. Please enter your approved sender ID from your Message Owl account.';
                Log::error('Message Owl requires a valid sender ID', [
                    'to' => $to,
                    'sender_id' => $senderId,
                ]);
                return false;
            }

            $payload = [
                'recipients' => $formattedPhone,
                'body' => $message,
                'sender_id' => $validSenderId, // Always include sender_id (required by Message Owl)
            ];

            Log::info('Sending SMS via Message Owl', [
                'to' => $to,
                'formatted_phone' => $formattedPhone,
                'sender_id' => $senderId,
                'valid_sender_id' => $validSenderId,
                'payload' => $payload,
                'api_key_length' => strlen($this->apiKey),
            ]);

            $response = Http::withOptions([
                'verify' => env('APP_ENV') === 'production', // Only verify SSL in production
            ])->withHeaders([
                'Authorization' => SmsConfigHelper::formatAuthorizationHeader($this->apiKey),
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])->post(self::API_BASE_URL . '/messages', $payload);

            if ($response->successful()) {
                Log::info('SMS sent successfully via Message Owl', [
                    'to' => $to,
                    'sender_id' => $senderId,
                ]);
                return true;
            }

            $errorBody = $response->json();
            $errorMessage = $errorBody['message'] ?? $errorBody['error'] ?? $errorBody['errors'] ?? 'Unknown error';
            
            // Handle array of errors
            if (is_array($errorMessage)) {
                $errorMessage = implode(', ', $errorMessage);
            }
            
            $this->lastError = $errorMessage;
            
            // Provide more helpful error messages
            if (str_contains(strtolower($errorMessage), 'sender_id') || str_contains(strtolower($errorMessage), 'invalid sender')) {
                $this->lastError = "Invalid sender_id '{$validSenderId}'. Please use an approved sender ID from your Message Owl account. You can check approved sender IDs in your Message Owl dashboard.";
            } elseif (str_contains(strtolower($errorMessage), 'required') || str_contains(strtolower($errorMessage), 'missing')) {
                // If it's a "required fields" error, provide more context
                $this->lastError = "Message Owl API error: {$errorMessage}. Please check that all required fields are provided. If sender_id is required, you may need to register and approve a sender ID in your Message Owl dashboard.";
            }
            
            Log::error('Failed to send SMS via Message Owl', [
                'status' => $response->status(),
                'error' => $errorMessage,
                'response_body' => $errorBody,
                'to' => $to,
                'sender_id' => $senderId,
            ]);

            return false;
        } catch (\Exception $e) {
            $errorMessage = $e->getMessage();
            $this->lastError = $errorMessage;
            
            // Handle SSL certificate errors specifically
            if (str_contains($errorMessage, 'cURL error 77') || str_contains($errorMessage, 'certificate')) {
                $this->lastError = 'SSL certificate error. Please configure your PHP cURL certificate bundle or set APP_ENV=production.';
            }
            
            Log::error('Exception while sending SMS via Message Owl', [
                'error' => $errorMessage,
                'to' => $to,
            ]);

            return false;
        }
    }

    /**
     * Test the SMS connection/configuration.
     *
     * @return bool True if connection is successful, false otherwise
     */
    public function testConnection(): bool
    {
        if (empty($this->apiKey)) {
            return false;
        }

        try {
            $response = Http::withOptions([
                'verify' => env('APP_ENV') === 'production', // Only verify SSL in production
            ])->withHeaders([
                'Authorization' => SmsConfigHelper::formatAuthorizationHeader($this->apiKey),
                'Accept' => 'application/json',
            ])->get(self::API_BASE_URL . '/balance');

            return $response->successful();
        } catch (\Exception $e) {
            $errorMessage = $e->getMessage();
            $this->lastError = $errorMessage;
            
            // Handle SSL certificate errors specifically
            if (str_contains($errorMessage, 'cURL error 77') || str_contains($errorMessage, 'certificate')) {
                $this->lastError = 'SSL certificate error. Please configure your PHP cURL certificate bundle.';
            }
            
            Log::error('Exception while testing Message Owl connection', [
                'error' => $errorMessage,
            ]);

            return false;
        }
    }

    /**
     * Get the provider name.
     *
     * @return string Provider name
     */
    public function getProviderName(): string
    {
        return 'msgowl';
    }

    /**
     * Format phone number for Message Owl API.
     * Removes any non-numeric characters except leading +.
     *
     * @param  string  $phoneNumber  Phone number
     * @return string Formatted phone number
     */
    protected function formatPhoneNumber(string $phoneNumber): string
    {
        // Remove all non-numeric characters except +
        $formatted = preg_replace('/[^0-9+]/', '', $phoneNumber);

        // If it doesn't start with +, ensure it's a valid number
        if (! str_starts_with($formatted, '+')) {
            // Remove leading zeros if any
            $formatted = ltrim($formatted, '0');
        }

        return $formatted;
    }

    /**
     * Get the last error message.
     *
     * @return string|null
     */
    public function getLastError(): ?string
    {
        return $this->lastError;
    }

    /**
     * Get list of approved sender IDs from Message Owl.
     * 
     * According to Message Owl API docs: https://www.msgowl.com/docs
     * Endpoint: GET https://rest.msgowl.com/sms_headers
     * Response: Array of objects with 'name' and 'status' fields
     *
     * @return array List of approved sender IDs
     */
    public function getApprovedSenderIds(): array
    {
        if (empty($this->apiKey)) {
            return [];
        }

        try {
            // According to docs: https://www.msgowl.com/docs
            // Endpoint: GET https://rest.msgowl.com/sms_headers
            // Required scope: sms_headers.read
            $response = Http::withOptions([
                'verify' => env('APP_ENV') === 'production',
            ])->withHeaders([
                'Authorization' => SmsConfigHelper::formatAuthorizationHeader($this->apiKey),
                'Accept' => 'application/json',
            ])->get(self::API_BASE_URL . '/sms_headers');

            if ($response->successful()) {
                $data = $response->json();
                
                // According to docs, response is an array directly:
                // [{"id": 1, "name": "MSGOWL", "status": "approved", ...}, ...]
                $senderIds = [];
                
                if (is_array($data)) {
                    foreach ($data as $item) {
                        if (is_array($item)) {
                            // Check if status is "approved"
                            $status = $item['status'] ?? null;
                            if ($status && strtolower($status) === 'approved') {
                                // Get the 'name' field which is the sender ID
                                $name = $item['name'] ?? null;
                                if ($name && !empty(trim($name))) {
                                    $senderIds[] = trim($name);
                                }
                            }
                        }
                    }
                }
                
                return array_values(array_unique(array_filter($senderIds)));
            } else {
                // Log the error for debugging
                Log::warning('Failed to fetch sender IDs from Message Owl', [
                    'status' => $response->status(),
                    'response' => $response->json(),
                ]);
            }

            return [];
        } catch (\Exception $e) {
            Log::error('Exception while fetching sender IDs from Message Owl', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [];
        }
    }
}

