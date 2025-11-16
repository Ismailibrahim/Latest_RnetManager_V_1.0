<?php

namespace App\Services;

use App\Models\Landlord;
use App\Models\LandlordSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class SystemSettingsService
{
    /**
     * Cache key prefix for landlord settings.
     */
    private const CACHE_PREFIX = 'landlord_settings:';

    /**
     * Cache TTL in seconds (1 hour).
     */
    private const CACHE_TTL = 3600;

    /**
     * Get settings for a landlord.
     *
     * @param  int  $landlordId  Landlord ID
     * @return array<string, mixed>
     */
    public function getSettings(int $landlordId): array
    {
        $cacheKey = self::CACHE_PREFIX . $landlordId;

        try {
            return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($landlordId) {
                $setting = LandlordSetting::where('landlord_id', $landlordId)->first();

                if (! $setting) {
                    // Return defaults if no settings exist
                    // Settings will be created on first update
                    return LandlordSetting::getDefaultSettings();
                }

                return $setting->getMergedSettings();
            });
        } catch (\Exception $e) {
            // If there's an error (e.g., table doesn't exist), return defaults
            Log::error('Failed to get settings for landlord ' . $landlordId . ': ' . $e->getMessage());
            return LandlordSetting::getDefaultSettings();
        }
    }

    /**
     * Get a specific setting value using dot notation.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  string  $key  Dot notation key (e.g., 'company.name', 'currency.primary')
     * @param  mixed  $default  Default value if setting doesn't exist
     * @return mixed
     */
    public function getSetting(int $landlordId, string $key, $default = null)
    {
        $settings = $this->getSettings($landlordId);
        $keys = explode('.', $key);
        $value = $settings;

        foreach ($keys as $k) {
            if (! is_array($value) || ! array_key_exists($k, $value)) {
                return $default;
            }
            $value = $value[$k];
        }

        return $value;
    }

    /**
     * Update settings for a landlord.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  array<string, mixed>  $settings  Settings to update
     * @return LandlordSetting
     */
    public function updateSettings(int $landlordId, array $settings): LandlordSetting
    {
        $setting = LandlordSetting::firstOrCreate(
            ['landlord_id' => $landlordId],
            ['settings' => LandlordSetting::getDefaultSettings()]
        );

        $currentSettings = $setting->settings ?? [];
        $defaultSettings = LandlordSetting::getDefaultSettings();
        
        // Merge defaults with current settings, then with new settings
        // This ensures new settings override current, and defaults fill in missing values
        $mergedSettings = array_replace_recursive($defaultSettings, $currentSettings, $settings);
        
        $setting->settings = $mergedSettings;
        $setting->save();

        // Clear cache
        $this->clearCache($landlordId);

        return $setting;
    }

    /**
     * Update a specific setting using dot notation.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  string  $key  Dot notation key (e.g., 'company.name', 'currency.primary')
     * @param  mixed  $value  Value to set
     * @return LandlordSetting
     */
    public function setSetting(int $landlordId, string $key, $value): LandlordSetting
    {
        $setting = LandlordSetting::firstOrCreate(
            ['landlord_id' => $landlordId],
            ['settings' => LandlordSetting::getDefaultSettings()]
        );

        $setting->setSetting($key, $value);
        $setting->save();

        // Clear cache
        $this->clearCache($landlordId);

        return $setting;
    }

    /**
     * Get company settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @return array<string, mixed>
     */
    public function getCompanySettings(int $landlordId): array
    {
        return $this->getSetting($landlordId, 'company', []);
    }

    /**
     * Get currency settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @return array<string, mixed>
     */
    public function getCurrencySettings(int $landlordId): array
    {
        return $this->getSetting($landlordId, 'currency', []);
    }

    /**
     * Get invoice numbering settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @return array<string, mixed>
     */
    public function getInvoiceNumberingSettings(int $landlordId): array
    {
        return $this->getSetting($landlordId, 'invoice_numbering', []);
    }

    /**
     * Get payment terms settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @return array<string, mixed>
     */
    public function getPaymentTermsSettings(int $landlordId): array
    {
        return $this->getSetting($landlordId, 'payment_terms', []);
    }

    /**
     * Get system preferences settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @return array<string, mixed>
     */
    public function getSystemPreferencesSettings(int $landlordId): array
    {
        return $this->getSetting($landlordId, 'system', []);
    }

    /**
     * Get document settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @return array<string, mixed>
     */
    public function getDocumentSettings(int $landlordId): array
    {
        return $this->getSetting($landlordId, 'documents', []);
    }

    /**
     * Get tax settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @return array<string, mixed>
     */
    public function getTaxSettings(int $landlordId): array
    {
        return $this->getSetting($landlordId, 'tax', []);
    }

    /**
     * Update company settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  array<string, mixed>  $companySettings  Company settings to update
     * @return LandlordSetting
     */
    public function updateCompanySettings(int $landlordId, array $companySettings): LandlordSetting
    {
        return $this->updateSettings($landlordId, ['company' => $companySettings]);
    }

    /**
     * Update currency settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  array<string, mixed>  $currencySettings  Currency settings to update
     * @return LandlordSetting
     */
    public function updateCurrencySettings(int $landlordId, array $currencySettings): LandlordSetting
    {
        return $this->updateSettings($landlordId, ['currency' => $currencySettings]);
    }

    /**
     * Update invoice numbering settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  array<string, mixed>  $invoiceNumberingSettings  Invoice numbering settings to update
     * @return LandlordSetting
     */
    public function updateInvoiceNumberingSettings(int $landlordId, array $invoiceNumberingSettings): LandlordSetting
    {
        return $this->updateSettings($landlordId, ['invoice_numbering' => $invoiceNumberingSettings]);
    }

    /**
     * Update payment terms settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  array<string, mixed>  $paymentTermsSettings  Payment terms settings to update
     * @return LandlordSetting
     */
    public function updatePaymentTermsSettings(int $landlordId, array $paymentTermsSettings): LandlordSetting
    {
        return $this->updateSettings($landlordId, ['payment_terms' => $paymentTermsSettings]);
    }

    /**
     * Update system preferences settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  array<string, mixed>  $systemPreferencesSettings  System preferences settings to update
     * @return LandlordSetting
     */
    public function updateSystemPreferencesSettings(int $landlordId, array $systemPreferencesSettings): LandlordSetting
    {
        return $this->updateSettings($landlordId, ['system' => $systemPreferencesSettings]);
    }

    /**
     * Update document settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  array<string, mixed>  $documentSettings  Document settings to update
     * @return LandlordSetting
     */
    public function updateDocumentSettings(int $landlordId, array $documentSettings): LandlordSetting
    {
        return $this->updateSettings($landlordId, ['documents' => $documentSettings]);
    }

    /**
     * Update tax settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  array<string, mixed>  $taxSettings  Tax settings to update
     * @return LandlordSetting
     */
    public function updateTaxSettings(int $landlordId, array $taxSettings): LandlordSetting
    {
        return $this->updateSettings($landlordId, ['tax' => $taxSettings]);
    }

    /**
     * Clear cache for a landlord.
     *
     * @param  int  $landlordId  Landlord ID
     * @return void
     */
    public function clearCache(int $landlordId): void
    {
        $cacheKey = self::CACHE_PREFIX . $landlordId;
        Cache::forget($cacheKey);
    }

    /**
     * Get invoice prefix for a specific type.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  string  $type  Invoice type (rent_invoice, maintenance_invoice, etc.)
     * @param  string  $default  Default prefix if not configured
     * @return string
     */
    public function getInvoicePrefix(int $landlordId, string $type, string $default): string
    {
        $key = "invoice_numbering.{$type}_prefix";
        $prefix = $this->getSetting($landlordId, $key, $default);

        return $prefix ?: $default;
    }

    /**
     * Get invoice number format.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  string  $default  Default format if not configured
     * @return string
     */
    public function getInvoiceNumberFormat(int $landlordId, string $default = 'PREFIX-YYYYMM-SSS'): string
    {
        return $this->getSetting($landlordId, 'invoice_numbering.format', $default);
    }

    /**
     * Check if invoice numbers reset monthly.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  bool  $default  Default value if not configured
     * @return bool
     */
    public function shouldResetInvoiceNumbersMonthly(int $landlordId, bool $default = true): bool
    {
        return $this->getSetting($landlordId, 'invoice_numbering.reset_monthly', $default);
    }

    /**
     * Get email settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @return array<string, mixed>
     */
    public function getEmailSettings(int $landlordId): array
    {
        return $this->getSetting($landlordId, 'email', []);
    }

    /**
     * Update email settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  array<string, mixed>  $emailSettings  Email settings to update
     * @return LandlordSetting
     */
    public function updateEmailSettings(int $landlordId, array $emailSettings): LandlordSetting
    {
        // Encrypt sensitive fields before storing
        $emailSettings = \App\Helpers\EmailConfigHelper::prepareForStorage($emailSettings);

        return $this->updateSettings($landlordId, ['email' => $emailSettings]);
    }

    /**
     * Get email provider.
     *
     * @param  int  $landlordId  Landlord ID
     * @return string Provider name
     */
    public function getEmailProvider(int $landlordId): string
    {
        return $this->getSetting($landlordId, 'email.provider', 'gmail');
    }

    /**
     * Get SMS settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @return array<string, mixed>
     */
    public function getSmsSettings(int $landlordId): array
    {
        return $this->getSetting($landlordId, 'sms', []);
    }

    /**
     * Update SMS settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  array<string, mixed>  $smsSettings  SMS settings to update
     * @return LandlordSetting
     */
    public function updateSmsSettings(int $landlordId, array $smsSettings): LandlordSetting
    {
        // Encrypt sensitive fields before storing
        $smsSettings = \App\Helpers\SmsConfigHelper::prepareForStorage($smsSettings);

        return $this->updateSettings($landlordId, ['sms' => $smsSettings]);
    }

    /**
     * Get SMS provider.
     *
     * @param  int  $landlordId  Landlord ID
     * @return string Provider name
     */
    public function getSmsProvider(int $landlordId): string
    {
        return $this->getSetting($landlordId, 'sms.provider', 'msgowl');
    }

    /**
     * Get Telegram settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @return array<string, mixed>
     */
    public function getTelegramSettings(int $landlordId): array
    {
        return $this->getSetting($landlordId, 'telegram', []);
    }

    /**
     * Update Telegram settings.
     *
     * @param  int  $landlordId  Landlord ID
     * @param  array<string, mixed>  $telegramSettings  Telegram settings to update
     * @return LandlordSetting
     */
    public function updateTelegramSettings(int $landlordId, array $telegramSettings): LandlordSetting
    {
        // Encrypt sensitive fields before storing
        $telegramSettings = \App\Helpers\TelegramConfigHelper::prepareForStorage($telegramSettings);

        return $this->updateSettings($landlordId, ['telegram' => $telegramSettings]);
    }
}

