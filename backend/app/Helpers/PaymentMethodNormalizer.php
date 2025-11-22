<?php

namespace App\Helpers;

/**
 * Centralized utility for normalizing payment method names to ENUM values.
 * 
 * This ensures consistency across the application when dealing with payment methods
 * that may come from different sources (frontend, API, database) with different formats.
 */
class PaymentMethodNormalizer
{
    /**
     * Valid ENUM values for payment_method fields in the database.
     */
    private const VALID_ENUM_VALUES = [
        'cash',
        'bank_transfer',
        'upi',
        'card',
        'cheque',
    ];

    /**
     * Mapping of common payment method variations to ENUM values.
     */
    private const PAYMENT_METHOD_MAPPING = [
        // Cash variations
        'cash' => 'cash',
        'cashpayment' => 'cash',
        'cash payment' => 'cash',
        'cash_payment' => 'cash',
        
        // Bank transfer variations
        'banktransfer' => 'bank_transfer',
        'bank transfer' => 'bank_transfer',
        'bank_transfer' => 'bank_transfer',
        'banktransferpayment' => 'bank_transfer',
        'bank transfer payment' => 'bank_transfer',
        'bank_transfer_payment' => 'bank_transfer',
        'wire transfer' => 'bank_transfer',
        'wiretransfer' => 'bank_transfer',
        
        // UPI variations
        'upi' => 'upi',
        'upipayment' => 'upi',
        'upi payment' => 'upi',
        'upi_payment' => 'upi',
        
        // Card variations
        'card' => 'card',
        'cardpayment' => 'card',
        'card payment' => 'card',
        'card_payment' => 'card',
        'creditcard' => 'card',
        'credit card' => 'card',
        'credit_card' => 'card',
        'debitcard' => 'card',
        'debit card' => 'card',
        'debit_card' => 'card',
        
        // Cheque variations
        'cheque' => 'cheque',
        'chequepayment' => 'cheque',
        'cheque payment' => 'cheque',
        'cheque_payment' => 'cheque',
        'check' => 'cheque',
        'checkpayment' => 'cheque',
        'check payment' => 'cheque',
        'check_payment' => 'cheque',
    ];

    /**
     * Normalize a payment method name to a valid ENUM value.
     * 
     * @param string|null $paymentMethod The payment method to normalize
     * @param string $default The default value to return if normalization fails (default: 'cash')
     * @return string A valid ENUM value
     */
    public static function normalize(?string $paymentMethod, string $default = 'cash'): string
    {
        // Return default if null or empty
        if (empty($paymentMethod)) {
            return $default;
        }

        // If it's already a valid ENUM value, return it as-is
        if (in_array($paymentMethod, self::VALID_ENUM_VALUES, true)) {
            return $paymentMethod;
        }

        // Normalize the input: lowercase, remove spaces, underscores, and hyphens
        $normalized = strtolower(str_replace([' ', '_', '-'], '', trim($paymentMethod)));

        // Check if normalized value matches a mapping
        if (isset(self::PAYMENT_METHOD_MAPPING[$normalized])) {
            return self::PAYMENT_METHOD_MAPPING[$normalized];
        }

        // Try to find a partial match (e.g., "cashpayment" contains "cash")
        // Check if any mapping key is contained in the normalized value
        foreach (self::PAYMENT_METHOD_MAPPING as $key => $value) {
            if (str_contains($normalized, $key) || str_contains($key, $normalized)) {
                \Log::debug('Payment method matched via partial match', [
                    'original' => $paymentMethod,
                    'normalized' => $normalized,
                    'matched_key' => $key,
                    'result' => $value,
                ]);
                return $value;
            }
        }
        
        // Additional check: if normalized starts with a known prefix, use that
        // This handles cases like "Cash Payment" -> "cashpayment" -> should match "cashpayment"
        if (str_starts_with($normalized, 'cash')) {
            return 'cash';
        }
        if (str_starts_with($normalized, 'bank')) {
            return 'bank_transfer';
        }
        if (str_starts_with($normalized, 'card') || str_starts_with($normalized, 'credit') || str_starts_with($normalized, 'debit')) {
            return 'card';
        }
        if (str_starts_with($normalized, 'cheque') || str_starts_with($normalized, 'check')) {
            return 'cheque';
        }
        if (str_starts_with($normalized, 'upi')) {
            return 'upi';
        }

        // If we can't map it, log a warning and return default
        \Log::warning('Could not normalize payment method, using default', [
            'payment_method' => $paymentMethod,
            'normalized' => $normalized,
            'default' => $default,
        ]);

        return $default;
    }

    /**
     * Check if a payment method is a valid ENUM value.
     * 
     * @param string|null $paymentMethod The payment method to check
     * @return bool True if valid, false otherwise
     */
    public static function isValid(?string $paymentMethod): bool
    {
        if (empty($paymentMethod)) {
            return false;
        }

        return in_array($paymentMethod, self::VALID_ENUM_VALUES, true);
    }

    /**
     * Get all valid ENUM values.
     * 
     * @return array<string> Array of valid ENUM values
     */
    public static function getValidValues(): array
    {
        return self::VALID_ENUM_VALUES;
    }
}

