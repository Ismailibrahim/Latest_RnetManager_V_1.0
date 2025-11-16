<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateCompanySettingsRequest;
use App\Http\Requests\Settings\UpdateCurrencySettingsRequest;
use App\Http\Requests\Settings\UpdateDocumentSettingsRequest;
use App\Http\Requests\Settings\UpdateInvoiceNumberingRequest;
use App\Http\Requests\Settings\UpdatePaymentTermsRequest;
use App\Http\Requests\Settings\UpdateSystemPreferencesRequest;
use App\Http\Requests\Settings\UpdateSystemSettingsRequest;
use App\Http\Requests\Settings\UpdateTaxSettingsRequest;
use App\Http\Requests\Settings\UpdateEmailSettingsRequest;
use App\Http\Requests\Settings\TestEmailRequest;
use App\Http\Requests\Settings\UpdateSmsSettingsRequest;
use App\Http\Requests\Settings\TestSmsRequest;
use App\Http\Requests\Settings\UpdateTelegramSettingsRequest;
use App\Http\Requests\Settings\TestTelegramRequest;
use App\Services\Email\EmailServiceFactory;
use App\Services\Sms\SmsServiceFactory;
use App\Services\SmsNotificationService;
use App\Services\TelegramNotificationService;
use App\Services\Telegram\TelegramService;
use App\Helpers\EmailConfigHelper;
use App\Helpers\SmsConfigHelper;
use App\Helpers\TelegramConfigHelper;
use App\Http\Resources\SystemSettingsResource;
use App\Models\LandlordSetting;
use App\Services\SystemSettingsService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SystemSettingsController extends Controller
{
    public function __construct(
        private readonly SystemSettingsService $settingsService
    ) {
    }

    /**
     * Get all system settings.
     */
    public function show(Request $request): JsonResponse
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Check authorization
        if (! $user->is_active) {
            return response()->json([
                'message' => 'Your account is not active.',
            ], 403);
        }

        $landlordId = $user->landlord_id;

        if (! $landlordId) {
            return response()->json([
                'message' => 'User is not associated with a landlord.',
            ], 403);
        }

        try {
            $settings = $this->settingsService->getSettings($landlordId);

            // Format settings to ensure all categories are present
            $formattedSettings = [
                'company' => $settings['company'] ?? [],
                'currency' => $settings['currency'] ?? [],
                'invoice_numbering' => $settings['invoice_numbering'] ?? [],
                'payment_terms' => $settings['payment_terms'] ?? [],
            'system' => $settings['system'] ?? [],
            'documents' => $settings['documents'] ?? [],
            'tax' => $settings['tax'] ?? [],
        ];
        
        return response()->json($formattedSettings);
        } catch (QueryException $e) {
            // Database error - likely table doesn't exist
            Log::error('Database error in SystemSettingsController: ' . $e->getMessage());
            return response()->json([
                'message' => 'System settings are not available. Please run migrations: php artisan migrate',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        } catch (\Exception $e) {
            Log::error('Error in SystemSettingsController: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to retrieve system settings.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Update system settings.
     */
    public function update(UpdateSystemSettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $validated = $request->validated();

        $setting = $this->settingsService->updateSettings($landlordId, $validated);
        $settings = $this->settingsService->getSettings($landlordId);

        return response()->json([
            'message' => 'System settings updated successfully.',
            'data' => SystemSettingsResource::fromSettings($settings)->toArray($request),
        ]);
    }

    /**
     * Get company settings.
     */
    public function getCompany(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $companySettings = $this->settingsService->getCompanySettings($landlordId);

        return response()->json([
            'company' => $companySettings,
        ]);
    }

    /**
     * Update company settings.
     */
    public function updateCompany(UpdateCompanySettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $validated = $request->validated();

        $this->settingsService->updateCompanySettings($landlordId, $validated);
        $companySettings = $this->settingsService->getCompanySettings($landlordId);

        return response()->json([
            'message' => 'Company settings updated successfully.',
            'company' => $companySettings,
        ]);
    }

    /**
     * Get currency settings.
     */
    public function getCurrency(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $currencySettings = $this->settingsService->getCurrencySettings($landlordId);

        return response()->json([
            'currency' => $currencySettings,
        ]);
    }

    /**
     * Update currency settings.
     */
    public function updateCurrency(UpdateCurrencySettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $validated = $request->validated();

        $this->settingsService->updateCurrencySettings($landlordId, $validated);
        $currencySettings = $this->settingsService->getCurrencySettings($landlordId);

        return response()->json([
            'message' => 'Currency settings updated successfully.',
            'currency' => $currencySettings,
        ]);
    }

    /**
     * Get invoice numbering settings.
     */
    public function getInvoiceNumbering(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $invoiceNumberingSettings = $this->settingsService->getInvoiceNumberingSettings($landlordId);

        return response()->json([
            'invoice_numbering' => $invoiceNumberingSettings,
        ]);
    }

    /**
     * Update invoice numbering settings.
     */
    public function updateInvoiceNumbering(UpdateInvoiceNumberingRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $validated = $request->validated();

        $this->settingsService->updateInvoiceNumberingSettings($landlordId, $validated);
        $invoiceNumberingSettings = $this->settingsService->getInvoiceNumberingSettings($landlordId);

        return response()->json([
            'message' => 'Invoice numbering settings updated successfully.',
            'invoice_numbering' => $invoiceNumberingSettings,
        ]);
    }

    /**
     * Get payment terms settings.
     */
    public function getPaymentTerms(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $paymentTermsSettings = $this->settingsService->getPaymentTermsSettings($landlordId);

        return response()->json([
            'payment_terms' => $paymentTermsSettings,
        ]);
    }

    /**
     * Update payment terms settings.
     */
    public function updatePaymentTerms(UpdatePaymentTermsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $validated = $request->validated();

        $this->settingsService->updatePaymentTermsSettings($landlordId, $validated);
        $paymentTermsSettings = $this->settingsService->getPaymentTermsSettings($landlordId);

        return response()->json([
            'message' => 'Payment terms settings updated successfully.',
            'payment_terms' => $paymentTermsSettings,
        ]);
    }

    /**
     * Get system preferences settings.
     */
    public function getSystemPreferences(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $systemPreferencesSettings = $this->settingsService->getSystemPreferencesSettings($landlordId);

        return response()->json([
            'system' => $systemPreferencesSettings,
        ]);
    }

    /**
     * Update system preferences settings.
     */
    public function updateSystemPreferences(UpdateSystemPreferencesRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $validated = $request->validated();

        $this->settingsService->updateSystemPreferencesSettings($landlordId, $validated);
        $systemPreferencesSettings = $this->settingsService->getSystemPreferencesSettings($landlordId);

        return response()->json([
            'message' => 'System preferences settings updated successfully.',
            'system' => $systemPreferencesSettings,
        ]);
    }

    /**
     * Get document settings.
     */
    public function getDocumentSettings(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $documentSettings = $this->settingsService->getDocumentSettings($landlordId);

        return response()->json([
            'documents' => $documentSettings,
        ]);
    }

    /**
     * Update document settings.
     */
    public function updateDocumentSettings(UpdateDocumentSettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $validated = $request->validated();

        $this->settingsService->updateDocumentSettings($landlordId, $validated);
        $documentSettings = $this->settingsService->getDocumentSettings($landlordId);

        return response()->json([
            'message' => 'Document settings updated successfully.',
            'documents' => $documentSettings,
        ]);
    }

    /**
     * Get tax settings.
     */
    public function getTaxSettings(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $taxSettings = $this->settingsService->getTaxSettings($landlordId);

        return response()->json([
            'tax' => $taxSettings,
        ]);
    }

    /**
     * Update tax settings.
     */
    public function updateTaxSettings(UpdateTaxSettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $validated = $request->validated();

        $this->settingsService->updateTaxSettings($landlordId, $validated);
        $taxSettings = $this->settingsService->getTaxSettings($landlordId);

        return response()->json([
            'message' => 'Tax settings updated successfully.',
            'tax' => $taxSettings,
        ]);
    }

    /**
     * Get email settings.
     */
    public function getEmailSettings(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $emailSettings = $this->settingsService->getEmailSettings($landlordId);

        // Prepare for response (remove passwords)
        $emailSettings = EmailConfigHelper::prepareForResponse($emailSettings, false);

        return response()->json([
            'email' => $emailSettings,
        ]);
    }

    /**
     * Update email settings.
     */
    public function updateEmailSettings(UpdateEmailSettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $validated = $request->validated();

        // If password is provided but empty, don't update it
        if (isset($validated['smtp_password']) && empty($validated['smtp_password'])) {
            unset($validated['smtp_password']);
        }

        // If oauth_client_secret is provided but empty, don't update it
        if (isset($validated['oauth_client_secret']) && empty($validated['oauth_client_secret'])) {
            unset($validated['oauth_client_secret']);
        }

        $this->settingsService->updateEmailSettings($landlordId, $validated);
        $emailSettings = $this->settingsService->getEmailSettings($landlordId);

        // Prepare for response (remove passwords)
        $emailSettings = EmailConfigHelper::prepareForResponse($emailSettings, false);

        return response()->json([
            'message' => 'Email settings updated successfully.',
            'email' => $emailSettings,
        ]);
    }

    /**
     * Test email connection.
     */
    public function testEmailConnection(TestEmailRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $emailSettings = $this->settingsService->getEmailSettings($landlordId);

        // Check if email is enabled
        if (! ($emailSettings['enabled'] ?? false)) {
            return response()->json([
                'message' => 'Email notifications are not enabled.',
                'success' => false,
            ], 400);
        }

        // Get provider
        $provider = $emailSettings['provider'] ?? 'gmail';

        // Prepare config for email service (decrypt password)
        $config = $emailSettings;
        if (! empty($config['smtp_password'])) {
            $config['smtp_password'] = EmailConfigHelper::decryptPassword($config['smtp_password']);
        }

        try {
            // Create email service
            $emailService = EmailServiceFactory::create($provider, $config);

            // Configure mail for landlord
            EmailConfigHelper::configureMailForLandlord($landlordId, $emailSettings);

            // Send test email
            $testEmail = $request->validated()['email'];
            $subject = 'Test Email - ' . config('app.name');
            $body = 'This is a test email to verify your email configuration is working correctly.';

            $success = $emailService->send($testEmail, $subject, $body);

            if ($success) {
                return response()->json([
                    'message' => 'Test email sent successfully.',
                    'success' => true,
                ]);
            } else {
                return response()->json([
                    'message' => 'Failed to send test email. Please check your configuration and try again.',
                    'success' => false,
                ], 500);
            }
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error sending test email: ' . $e->getMessage(),
                'success' => false,
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get SMS settings.
     */
    public function getSmsSettings(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $smsSettings = $this->settingsService->getSmsSettings($landlordId);

        // Check if API key is set in settings or environment
        $hasSettingsKey = ! empty($smsSettings['api_key']);
        $hasEnvKey = ! empty(env('MSG_OWL_KEY'));

        // Prepare for response (remove API key)
        $smsSettings = SmsConfigHelper::prepareForResponse($smsSettings, false);

        // Add indicator if using environment variable
        if (! $hasSettingsKey && $hasEnvKey) {
            $smsSettings['api_key_source'] = 'environment';
            $smsSettings['api_key_configured'] = true;
        } elseif ($hasSettingsKey) {
            $smsSettings['api_key_source'] = 'settings';
            $smsSettings['api_key_configured'] = true;
        } else {
            $smsSettings['api_key_source'] = 'none';
            $smsSettings['api_key_configured'] = false;
        }

        // Get approved sender IDs if API key is available
        if (! empty($smsSettings['api_key']) || ! empty(env('MSG_OWL_KEY'))) {
            try {
                $config = $smsSettings;
                if (! empty($config['api_key'])) {
                    $config['api_key'] = SmsConfigHelper::decryptApiKey($config['api_key']);
                } elseif (empty($config['api_key']) && ! empty(env('MSG_OWL_KEY'))) {
                    $config['api_key'] = env('MSG_OWL_KEY');
                }

                $provider = $smsSettings['provider'] ?? 'msgowl';
                $smsService = SmsServiceFactory::create($provider, $config);
                
                if (method_exists($smsService, 'getApprovedSenderIds')) {
                    $approvedSenderIds = $smsService->getApprovedSenderIds();
                    $smsSettings['approved_sender_ids'] = $approvedSenderIds;
                }
            } catch (\Exception $e) {
                Log::error('Failed to fetch approved sender IDs', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'sms' => $smsSettings,
        ]);
    }

    /**
     * Update SMS settings.
     */
    public function updateSmsSettings(UpdateSmsSettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $validated = $request->validated();

        // If API key is provided but empty, don't update it
        if (isset($validated['api_key']) && empty($validated['api_key'])) {
            unset($validated['api_key']);
        }

        $this->settingsService->updateSmsSettings($landlordId, $validated);
        $smsSettings = $this->settingsService->getSmsSettings($landlordId);

        // Prepare for response (remove API key)
        $smsSettings = SmsConfigHelper::prepareForResponse($smsSettings, false);

        return response()->json([
            'message' => 'SMS settings updated successfully.',
            'sms' => $smsSettings,
        ]);
    }

    /**
     * Test SMS connection.
     */
    public function testSmsConnection(TestSmsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $smsSettings = $this->settingsService->getSmsSettings($landlordId);

        // Debug logging
        Log::info('SMS test request', [
            'landlord_id' => $landlordId,
            'enabled' => $smsSettings['enabled'] ?? false,
            'has_api_key_in_settings' => ! empty($smsSettings['api_key']),
            'has_env_key' => ! empty(env('MSG_OWL_KEY')),
            'phone' => $request->input('phone'),
        ]);

        // Check if SMS is enabled
        if (! ($smsSettings['enabled'] ?? false)) {
            return response()->json([
                'message' => 'SMS notifications are not enabled. Please enable SMS notifications first.',
                'success' => false,
            ], 400);
        }

        // Get provider
        $provider = $smsSettings['provider'] ?? 'msgowl';

        // Prepare config for SMS service (decrypt API key or use env variable)
        $config = $smsSettings;
        if (! empty($config['api_key'])) {
            $config['api_key'] = SmsConfigHelper::decryptApiKey($config['api_key']);
        } elseif (empty($config['api_key']) && ! empty(env('MSG_OWL_KEY'))) {
            // Use environment variable as fallback
            $config['api_key'] = env('MSG_OWL_KEY');
        }

        // Check if we have an API key
        if (empty($config['api_key'])) {
            return response()->json([
                'message' => 'SMS API key is not configured. Please set MSG_OWL_KEY in your .env file or enter an API key in settings.',
                'success' => false,
            ], 400);
        }

        try {
            // Send test SMS
            $testPhone = $request->validated()['phone'];
            $smsNotificationService = app(SmsNotificationService::class);
            $result = $smsNotificationService->testSms($landlordId, $testPhone);

            if ($result === true) {
                return response()->json([
                    'message' => 'Test SMS sent successfully.',
                    'success' => true,
                ]);
            } else {
                // Get error message if available
                $errorMessage = 'Failed to send test SMS.';
                if (is_array($result) && isset($result['error'])) {
                    $errorMessage = $result['error'];
                }

                Log::error('SMS test failed', [
                    'landlord_id' => $landlordId,
                    'phone' => $testPhone,
                    'has_api_key' => ! empty($config['api_key']),
                    'error' => $errorMessage,
                ]);

                return response()->json([
                    'message' => $errorMessage,
                    'success' => false,
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('Exception in SMS test', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Error sending test SMS: ' . $e->getMessage(),
                'success' => false,
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get Telegram settings.
     */
    public function getTelegramSettings(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $telegramSettings = $this->settingsService->getTelegramSettings($landlordId);

        // Check if bot token is set in settings or environment
        $hasSettingsToken = ! empty($telegramSettings['bot_token']);
        $hasEnvToken = ! empty(env('TELEGRAM_BOT_TOKEN'));

        // Prepare for response (remove bot token)
        $telegramSettings = TelegramConfigHelper::prepareForResponse($telegramSettings, false);

        // Add indicator if using environment variable
        if (! $hasSettingsToken && $hasEnvToken) {
            $telegramSettings['bot_token_source'] = 'environment';
            $telegramSettings['bot_token_configured'] = true;
        } elseif ($hasSettingsToken) {
            $telegramSettings['bot_token_source'] = 'settings';
            $telegramSettings['bot_token_configured'] = true;
        } else {
            $telegramSettings['bot_token_source'] = 'none';
            $telegramSettings['bot_token_configured'] = false;
        }

        return response()->json([
            'telegram' => $telegramSettings,
        ]);
    }

    /**
     * Update Telegram settings.
     */
    public function updateTelegramSettings(UpdateTelegramSettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $validated = $request->validated();

        // If bot token is provided but empty, don't update it
        if (isset($validated['bot_token']) && empty($validated['bot_token'])) {
            unset($validated['bot_token']);
        }

        $this->settingsService->updateTelegramSettings($landlordId, $validated);
        $telegramSettings = $this->settingsService->getTelegramSettings($landlordId);

        // Prepare for response (remove bot token)
        $telegramSettings = TelegramConfigHelper::prepareForResponse($telegramSettings, false);

        return response()->json([
            'message' => 'Telegram settings updated successfully.',
            'telegram' => $telegramSettings,
        ]);
    }

    /**
     * Test Telegram connection.
     */
    public function testTelegramConnection(TestTelegramRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordId = $user->landlord_id;
        $telegramSettings = $this->settingsService->getTelegramSettings($landlordId);

        // Check if Telegram is enabled
        if (! ($telegramSettings['enabled'] ?? false)) {
            return response()->json([
                'message' => 'Telegram notifications are not enabled. Please enable Telegram notifications first.',
                'success' => false,
            ], 400);
        }

        // Get bot token (per-landlord or global)
        $botToken = $telegramSettings['bot_token'] ?? config('services.telegram.bot_token');
        
        // Decrypt if stored in settings
        if (! empty($telegramSettings['bot_token'])) {
            $botToken = TelegramConfigHelper::decryptBotToken($telegramSettings['bot_token']);
        } elseif (empty($botToken) && ! empty(env('TELEGRAM_BOT_TOKEN'))) {
            // Use environment variable as fallback
            $botToken = env('TELEGRAM_BOT_TOKEN');
        }

        // Check if we have a bot token
        if (empty($botToken)) {
            return response()->json([
                'message' => 'Telegram bot token is not configured. Please set TELEGRAM_BOT_TOKEN in your .env file or enter a bot token in settings.',
                'success' => false,
            ], 400);
        }

        try {
            // Send test Telegram message
            $testChatId = $request->validated()['chat_id'];
            $telegramNotificationService = app(TelegramNotificationService::class);
            $success = $telegramNotificationService->testTelegram($landlordId, $testChatId);

            if ($success) {
                return response()->json([
                    'message' => 'Test Telegram message sent successfully.',
                    'success' => true,
                ]);
            } else {
                return response()->json([
                    'message' => 'Failed to send test Telegram message. Please check your configuration and try again.',
                    'success' => false,
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('Exception in Telegram test', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Error sending test Telegram message: ' . $e->getMessage(),
                'success' => false,
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}

