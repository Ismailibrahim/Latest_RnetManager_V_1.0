<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LandlordSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'landlord_id',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
    ];

    /**
     * Get the landlord that owns the settings.
     */
    public function landlord(): BelongsTo
    {
        return $this->belongsTo(Landlord::class);
    }

    /**
     * Get a nested setting value using dot notation.
     *
     * @param  string  $key  Dot notation key (e.g., 'company.name', 'currency.primary')
     * @param  mixed  $default  Default value if setting doesn't exist
     * @return mixed
     */
    public function getSetting(string $key, $default = null)
    {
        $settings = $this->settings ?? [];
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
     * Set a nested setting value using dot notation.
     *
     * @param  string  $key  Dot notation key (e.g., 'company.name', 'currency.primary')
     * @param  mixed  $value  Value to set
     * @return void
     */
    public function setSetting(string $key, $value): void
    {
        $settings = $this->settings ?? [];
        $keys = explode('.', $key);
        $current = &$settings;

        foreach ($keys as $k) {
            if (! is_array($current)) {
                $current = [];
            }
            if (! array_key_exists($k, $current)) {
                $current[$k] = [];
            }
            $current = &$current[$k];
        }

        $current = $value;
        $this->settings = $settings;
    }

    /**
     * Merge settings with existing settings.
     *
     * @param  array  $newSettings  Settings to merge
     * @return void
     */
    public function mergeSettings(array $newSettings): void
    {
        $settings = $this->settings ?? [];
        // Use array_replace_recursive to replace values instead of merging into arrays
        $this->settings = array_replace_recursive($settings, $newSettings);
    }

    /**
     * Get default settings structure.
     *
     * @return array<string, mixed>
     */
    public static function getDefaultSettings(): array
    {
        return [
            'company' => [
                'name' => null,
                'address' => null,
                'city' => null,
                'country' => 'Maldives',
                'tax_id' => null,
                'registration_number' => null,
                'phone' => null,
                'email' => null,
                'website' => null,
                'logo_url' => null,
            ],
            'currency' => [
                'primary' => 'MVR',
                'secondary' => 'USD',
                'exchange_rate' => null,
            ],
            'invoice_numbering' => [
                'rent_invoice_prefix' => 'RINV',
                'maintenance_invoice_prefix' => 'MINV',
                'financial_record_prefix' => 'FINV',
                'maintenance_request_prefix' => 'MREQ',
                'subscription_invoice_prefix' => 'SINV',
                'receipt_prefix' => 'RCPT',
                'refund_prefix' => 'SDR',
                'format' => 'PREFIX-YYYYMM-SSS',
                'reset_monthly' => true,
            ],
            'payment_terms' => [
                'default_due_days' => 30,
                'late_fee_percentage' => 5.0,
                'late_fee_fixed' => 0,
                'grace_period_days' => 7,
            ],
            'system' => [
                'timezone' => 'Indian/Maldives',
                'date_format' => 'DD/MM/YYYY',
                'time_format' => '24h',
                'locale' => 'en_MV',
            ],
            'documents' => [
                'retention_years' => 7,
                'export_format' => 'csv',
                'auto_export' => false,
                'export_email' => null,
            ],
            'tax' => [
                'gst_percentage' => 6.0,
                'gst_enabled' => true,
                'gst_registration_number' => null,
            ],
            'email' => [
                'provider' => 'gmail', // 'gmail' or 'office365'
                'enabled' => false,
                'from_name' => null,
                'from_address' => null,
                'smtp_host' => null,
                'smtp_port' => 587,
                'smtp_encryption' => 'tls',
                'smtp_username' => null,
                'smtp_password' => null, // Encrypted
                'oauth_client_id' => null, // For OAuth2
                'oauth_client_secret' => null, // Encrypted
                'oauth_tenant_id' => null, // For Office 365
                'notifications' => [
                    'rent_due' => ['enabled' => false, 'template_id' => null],
                    'rent_received' => ['enabled' => false, 'template_id' => null],
                    'maintenance_request' => ['enabled' => false, 'template_id' => null],
                    'lease_expiry' => ['enabled' => false, 'template_id' => null],
                    'security_deposit' => ['enabled' => false, 'template_id' => null],
                ],
            ],
            'sms' => [
                'provider' => 'msgowl', // 'msgowl'
                'enabled' => false,
                'api_key' => null, // Encrypted
                'sender_id' => '', // Leave empty to use Message Owl's default sender ID
                'notifications' => [
                    'rent_due' => ['enabled' => false, 'template_id' => null],
                    'rent_received' => ['enabled' => false, 'template_id' => null],
                    'maintenance_request' => ['enabled' => false, 'template_id' => null],
                    'lease_expiry' => ['enabled' => false, 'template_id' => null],
                    'security_deposit' => ['enabled' => false, 'template_id' => null],
                ],
            ],
            'telegram' => [
                'enabled' => false,
                'bot_token' => null, // Per-landlord bot token (optional, can use global from config)
                'chat_id' => null, // Default chat ID for landlord
                'parse_mode' => 'None', // 'Markdown', 'HTML', or 'None'
                'notifications' => [
                    'rent_due' => ['enabled' => false, 'template_id' => null],
                    'rent_received' => ['enabled' => false, 'template_id' => null],
                    'maintenance_request' => ['enabled' => false, 'template_id' => null],
                    'lease_expiry' => ['enabled' => false, 'template_id' => null],
                    'security_deposit' => ['enabled' => false, 'template_id' => null],
                    'system' => ['enabled' => false, 'template_id' => null],
                ],
            ],
        ];
    }

    /**
     * Get merged settings with defaults.
     *
     * @return array<string, mixed>
     */
    public function getMergedSettings(): array
    {
        $defaults = self::getDefaultSettings();
        $settings = $this->settings ?? [];

        // Use array_replace_recursive to replace values instead of merging into arrays
        return array_replace_recursive($defaults, $settings);
    }
}

