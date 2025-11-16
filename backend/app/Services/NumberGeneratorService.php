<?php

namespace App\Services;

use App\Models\FinancialRecord;
use App\Models\MaintenanceInvoice;
use App\Models\RentInvoice;
use App\Models\SecurityDepositRefund;
use App\Models\SubscriptionInvoice;
use Illuminate\Support\Facades\DB;

class NumberGeneratorService
{
    /**
     * Number type prefixes configuration (defaults).
     *
     * @var array<string, string>
     */
    private const DEFAULT_PREFIXES = [
        'rent_invoice' => 'RINV',
        'maintenance_invoice' => 'MINV',
        'financial_record' => 'FINV',
        'maintenance_request' => 'MREQ',
        'subscription_invoice' => 'SINV',
        'security_deposit_refund' => 'SDR',
        'receipt' => 'RCPT',
    ];

    /**
     * Mapping of type keys to settings keys.
     *
     * @var array<string, string>
     */
    private const TYPE_TO_SETTINGS_KEY = [
        'rent_invoice' => 'rent_invoice_prefix',
        'maintenance_invoice' => 'maintenance_invoice_prefix',
        'financial_record' => 'financial_record_prefix',
        'maintenance_request' => 'maintenance_request_prefix',
        'subscription_invoice' => 'subscription_invoice_prefix',
        'security_deposit_refund' => 'refund_prefix',
        'receipt' => 'receipt_prefix',
    ];

    public function __construct(
        private readonly SystemSettingsService $settingsService
    ) {
    }

    /**
     * Generate a unique invoice number for rent invoices.
     */
    public function generateRentInvoiceNumber(int $landlordId): string
    {
        return $this->generateNumber(
            'rent_invoice',
            RentInvoice::class,
            'invoice_number',
            ['landlord_id' => $landlordId]
        );
    }

    /**
     * Generate a unique invoice number for maintenance invoices.
     */
    public function generateMaintenanceInvoiceNumber(int $landlordId): string
    {
        return $this->generateNumber(
            'maintenance_invoice',
            MaintenanceInvoice::class,
            'invoice_number',
            ['landlord_id' => $landlordId]
        );
    }

    /**
     * Generate an optional invoice number for financial records.
     */
    public function generateFinancialRecordInvoiceNumber(int $landlordId): ?string
    {
        return $this->generateNumber(
            'financial_record',
            FinancialRecord::class,
            'invoice_number',
            ['landlord_id' => $landlordId],
            false
        );
    }

    /**
     * Generate an optional invoice number for maintenance requests.
     */
    public function generateMaintenanceRequestInvoiceNumber(int $landlordId): ?string
    {
        return $this->generateNumber(
            'maintenance_request',
            \App\Models\MaintenanceRequest::class,
            'invoice_number',
            ['landlord_id' => $landlordId],
            false
        );
    }

    /**
     * Generate a unique invoice number for subscription invoices.
     */
    public function generateSubscriptionInvoiceNumber(int $landlordId): string
    {
        return $this->generateNumber(
            'subscription_invoice',
            SubscriptionInvoice::class,
            'invoice_number',
            ['landlord_id' => $landlordId]
        );
    }

    /**
     * Generate a unique refund number for security deposit refunds.
     */
    public function generateSecurityDepositRefundNumber(int $landlordId): string
    {
        return $this->generateNumber(
            'security_deposit_refund',
            SecurityDepositRefund::class,
            'refund_number',
            ['landlord_id' => $landlordId]
        );
    }

    /**
     * Generate a receipt number for security deposit refunds.
     */
    public function generateReceiptNumber(int $landlordId): string
    {
        return $this->generateNumber(
            'receipt',
            SecurityDepositRefund::class,
            'receipt_number',
            ['landlord_id' => $landlordId]
        );
    }

    /**
     * Get prefix for a number type from settings or defaults.
     *
     * @param  string  $type  Number type
     * @param  int  $landlordId  Landlord ID
     * @return string
     */
    private function getConfiguredPrefix(string $type, int $landlordId): string
    {
        $settingsKey = self::TYPE_TO_SETTINGS_KEY[$type] ?? null;
        $defaultPrefix = self::DEFAULT_PREFIXES[$type] ?? strtoupper($type);

        if ($settingsKey) {
            $prefix = $this->settingsService->getInvoicePrefix($landlordId, $type, $defaultPrefix);
            return $prefix ?: $defaultPrefix;
        }

        return $defaultPrefix;
    }

    /**
     * Generate a unique number for a given type.
     *
     * @param  string  $type  Number type (key from PREFIXES)
     * @param  string  $modelClass  Model class name
     * @param  string  $field  Field name to generate
     * @param  array<string, mixed>  $additionalConditions  Additional WHERE conditions
     * @param  bool  $required  Whether the number is required (affects uniqueness check)
     * @return string|null
     */
    private function generateNumber(
        string $type,
        string $modelClass,
        string $field,
        array $additionalConditions = [],
        bool $required = true
    ): ?string {
        $landlordId = $additionalConditions['landlord_id'] ?? null;
        $prefix = $landlordId ? $this->getConfiguredPrefix($type, $landlordId) : (self::DEFAULT_PREFIXES[$type] ?? strtoupper($type));

        // Get format from settings or use default
        $format = $landlordId ? $this->settingsService->getInvoiceNumberFormat($landlordId, 'PREFIX-YYYYMM-SSS') : 'PREFIX-YYYYMM-SSS';
        $resetMonthly = $landlordId ? $this->settingsService->shouldResetInvoiceNumbersMonthly($landlordId, true) : true;

        $year = date('Y');
        $month = date('m');
        $period = $resetMonthly ? ($year . $month) : $year;

        // Try to find the highest sequence number for this prefix and period
        $pattern = "{$prefix}-{$period}%";

        $query = $modelClass::query()
            ->where($field, 'like', $pattern);

        // Apply additional conditions (e.g., landlord_id)
        foreach ($additionalConditions as $column => $value) {
            if ($value !== null) {
                $query->where($column, $value);
            }
        }

        // Get the highest sequence number
        $latest = $query
            ->orderBy($field, 'desc')
            ->value($field);

        $sequence = 1;

        if ($latest) {
            // Extract sequence number from latest number (e.g., "RINV-202401-001" -> 1)
            if (preg_match('/-(\d{3})$/', $latest, $matches)) {
                $sequence = (int) $matches[1] + 1;
            }
        }

        // Format: PREFIX-YYYYMM-SSS (e.g., RINV-202401-001)
        $number = sprintf('%s-%s-%03d', $prefix, $period, $sequence);

        // Check uniqueness (only if required)
        if ($required) {
            $maxAttempts = 100; // Prevent infinite loop
            $attempts = 0;

            while ($attempts < $maxAttempts) {
                $exists = $modelClass::query()
                    ->where($field, $number)
                    ->when(!empty($additionalConditions), function ($q) use ($additionalConditions) {
                        foreach ($additionalConditions as $column => $value) {
                            if ($value !== null) {
                                $q->where($column, $value);
                            }
                        }
                    })
                    ->exists();

                if (! $exists) {
                    break;
                }

                // If exists, increment and try again
                $sequence++;
                $number = sprintf('%s-%s-%03d', $prefix, $period, $sequence);
                $attempts++;
            }

            if ($attempts >= $maxAttempts) {
                throw new \RuntimeException("Unable to generate unique {$type} number after {$maxAttempts} attempts.");
            }
        }

        return $number;
    }

    /**
     * Get prefix for a number type (static method for backward compatibility).
     *
     * @param  string  $type  Number type
     * @return string
     */
    public static function getPrefix(string $type): string
    {
        return self::DEFAULT_PREFIXES[$type] ?? strtoupper($type);
    }

    /**
     * Get all available prefixes (defaults).
     *
     * @return array<string, string>
     */
    public static function getAllPrefixes(): array
    {
        return self::DEFAULT_PREFIXES;
    }
}

