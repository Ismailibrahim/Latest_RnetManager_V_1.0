# Financial Records Payment Method Migration

## Overview

Changed `financial_records.payment_method` from ENUM to VARCHAR to match the `payment_methods` table structure. This allows financial records to store payment method names directly (e.g., "Cash Payment") instead of normalized ENUM values (e.g., "cash").

## Changes Made

### 1. Database Migration
**File:** `backend/database/migrations/2025_11_22_120000_change_financial_records_payment_method_to_string.php`

- Changed `payment_method` column from `ENUM('cash', 'bank_transfer', 'upi', 'card', 'cheque')` to `VARCHAR(120) NULL`
- Added index on `payment_method` for better query performance
- Migration includes rollback logic to convert back to ENUM if needed

### 2. FinancialRecord Model
**File:** `backend/app/Models/FinancialRecord.php`

- **Removed:** `PaymentMethodNormalizer` import and usage
- **Removed:** `setPaymentMethodAttribute()` mutator (no normalization needed)
- **Removed:** Payment method normalization in `creating` event
- **Result:** Payment method is now stored as-is, matching values from `payment_methods` table

### 3. UnifiedPaymentService
**File:** `backend/app/Services/UnifiedPayments/UnifiedPaymentService.php`

- **Removed:** Payment method normalization when updating `FinancialRecord` status
- **Kept:** Payment method normalization for `RentInvoice` (still uses ENUM)
- **Result:** Financial records now accept payment method names directly from the database

### 4. Validation
**Files:** 
- `backend/app/Http/Requests/StoreFinancialRecordRequest.php`
- `backend/app/Http/Requests/UpdateFinancialRecordRequest.php`

- **Already configured:** Both requests validate `payment_method` against `payment_methods.name` where `is_active = true`
- **No changes needed:** Validation already ensures payment methods match the database

## Benefits

1. **No More Normalization Issues:** Payment methods are stored exactly as they appear in the `payment_methods` table
2. **Consistency:** Financial records now match the same payment method format used throughout the application
3. **Flexibility:** New payment methods can be added to the `payment_methods` table without code changes
4. **Simpler Code:** Removed complex normalization logic

## Migration Steps

1. **Run the migration:**
   ```bash
   php artisan migrate
   ```

2. **Clear caches:**
   ```bash
   php artisan cache:clear
   php artisan config:clear
   ```

3. **Restart backend server**

## Notes

- `RentInvoice` still uses ENUM for `payment_method` - normalization is kept for rent invoices
- `UnifiedPaymentEntry` already uses VARCHAR for `payment_method` - no changes needed
- Frontend already uses `usePaymentMethods` hook which fetches from the database - no changes needed

## Rollback

If you need to rollback this migration:
```bash
php artisan migrate:rollback --step=1
```

This will convert `payment_method` back to ENUM and normalize existing values.

