# Payment Method Normalization

## Overview

This document explains the payment method normalization system implemented to handle inconsistencies between frontend payment method labels and database ENUM constraints.

## Problem

The frontend sends payment method values like "Cash Payment" (human-readable labels from the `payment_methods` table), but the `financial_records` table has an ENUM constraint that only accepts: `'cash'`, `'bank_transfer'`, `'upi'`, `'card'`, `'cheque'`.

This mismatch caused database errors:
```
SQLSTATE[01000]: Warning: 1265 Data truncated for column 'payment_method' at row 1
```

## Solution

A centralized `PaymentMethodNormalizer` utility class normalizes payment method names to valid ENUM values at multiple layers:

1. **Service Layer** - Normalizes before saving `UnifiedPaymentEntry`
2. **Model Layer** - `FinancialRecord` mutator normalizes on attribute set
3. **Update Operations** - Normalizes when updating linked sources (RentInvoice, FinancialRecord)

## Architecture

### PaymentMethodNormalizer

**Location:** `backend/app/Helpers/PaymentMethodNormalizer.php`

**Purpose:** Centralized utility for normalizing payment method names to ENUM values.

**Key Methods:**
- `normalize(?string $paymentMethod, string $default = 'cash'): string` - Normalizes a payment method to a valid ENUM value
- `isValid(?string $paymentMethod): bool` - Checks if a payment method is a valid ENUM value
- `getValidValues(): array` - Returns all valid ENUM values

**Valid ENUM Values:**
- `cash`
- `bank_transfer`
- `upi`
- `card`
- `cheque`

**Mapping Examples:**
- "Cash Payment" → `cash`
- "Bank Transfer Payment" → `bank_transfer`
- "Credit Card" → `card`
- "Cheque Payment" → `cheque`

### UnifiedPaymentService

**Changes:**
1. Normalizes `payment_method` before creating `UnifiedPaymentEntry`
2. Normalizes `payment_method` in `capture()` method
3. Normalizes `payment_method` when updating `RentInvoice` status
4. Normalizes `payment_method` when updating `FinancialRecord` status
5. **Removed** `createFinancialRecordFromPayment()` function (legacy, caused issues)
6. **Removed** `normalizePaymentMethodForFinancialRecord()` function (replaced by centralized normalizer)

### FinancialRecord Model

**Changes:**
- `setPaymentMethodAttribute()` mutator now uses `PaymentMethodNormalizer::normalize()`
- Ensures all payment methods are normalized before saving to database

### RentInvoice Model

**Note:** `RentInvoice` stores payment method as a string reference to `payment_methods.name`, not an ENUM. Normalization is applied when updating from `UnifiedPaymentService`, but the field can accept any string value that exists in the `payment_methods` table.

## Data Flow

### Payment Creation Flow

1. **Frontend** sends payment with `payment_method: "Cash Payment"`
2. **UnifiedPaymentService::create()** normalizes to `payment_method: "cash"`
3. **UnifiedPaymentEntry** is saved with normalized value
4. **Linked sources** (RentInvoice, FinancialRecord) are updated with normalized value

### Payment Update Flow

1. **UnifiedPaymentService::capture()** receives `payment_method: "Bank Transfer Payment"`
2. Normalizes to `payment_method: "bank_transfer"`
3. Updates `UnifiedPaymentEntry` with normalized value
4. Updates linked sources with normalized value

## Migration Notes

### Removed Functions

- `UnifiedPaymentService::createFinancialRecordFromPayment()` - Completely removed
  - This function was disabled and never called
  - Financial records are legacy and should not be created from unified payments
  - If financial records are needed, they should be created through their own dedicated endpoints

- `UnifiedPaymentService::normalizePaymentMethodForFinancialRecord()` - Removed
  - Replaced by centralized `PaymentMethodNormalizer`

### Unused Helper Functions

The following functions remain in `UnifiedPaymentService` but are unused (kept for potential future use):
- `mapPaymentTypeToFinancialRecord()`
- `generateDescriptionFromPayment()`
- `determineFeeCategory()`
- `determineOtherIncomeType()`
- `determineOtherIncomeCategory()`
- `determineOtherOutgoingCategory()`

## Testing

When testing payment creation:
1. Frontend can send any payment method format (e.g., "Cash Payment", "cash", "CASH")
2. Backend normalizes to valid ENUM value
3. Database saves normalized value
4. No database errors occur

## Future Improvements

1. Consider migrating `financial_records.payment_method` from ENUM to string to match `unified_payment_entries.payment_method`
2. Standardize payment method storage across all tables
3. Add validation to ensure normalized values exist in `payment_methods` table if needed

