# Currency Update Summary - MVR and USD Only

## Overview
Updated the entire project (frontend and backend) to use only **2 currencies**:
- **MVR (Maldivian Rufiyaa)** - Default currency
- **USD (US Dollar)** - Secondary currency

All other currencies (AED, EUR, GBP, INR, SAR, QAR, KWD, OMR, BHD) have been removed.

## Changes Made

### Backend Updates

#### 1. CurrencySeeder (`backend/database/seeders/CurrencySeeder.php`)
- ✅ Removed all currencies except MVR and USD
- ✅ MVR uses official symbol: ރ (Unicode U+0783)
- ✅ USD uses symbol: $
- ✅ Added to DatabaseSeeder

#### 2. UnitResource (`backend/app/Http/Resources/UnitResource.php`)
- ✅ Updated fallback symbol map to only include MVR and USD
- ✅ Removed all other currency symbols
- ✅ Always defaults to MVR if currency is missing or invalid

#### 3. UnitController (`backend/app/Http/Controllers/Api/V1/UnitController.php`)
- ✅ Added currency normalization in `store()` method
- ✅ Added currency normalization in `update()` method
- ✅ Added currency normalization in `bulkImport()` method
- ✅ All methods default to MVR if currency is missing or invalid
- ✅ Only allows MVR or USD, rejects all others

#### 4. Request Validation
- ✅ `StoreUnitRequest` - Already validates currency to only MVR/USD
- ✅ `UpdateUnitRequest` - Already validates currency to only MVR/USD
- ✅ `StoreUnifiedPaymentEntryRequest` - Updated to validate MVR/USD only
- ✅ `UpdateCurrencySettingsRequest` - Updated to validate MVR/USD only
- ✅ `UpdateSystemSettingsRequest` - Updated to validate MVR/USD only
- ✅ `BulkImportUnitsRequest` - Added currency validation and normalization

#### 5. UnifiedPaymentService (`backend/app/Services/UnifiedPayments/UnifiedPaymentService.php`)
- ✅ Updated to only allow MVR or USD
- ✅ Defaults to MVR if currency is invalid
- ✅ Removed AED-specific safeguard (replaced with general MVR/USD check)

### Frontend Updates

#### 1. currency-config.js (`frontend/utils/currency-config.js`)
- ✅ Removed all currency labels except MVR and USD
- ✅ Added `normalizeCurrency()` function
- ✅ Function ensures only MVR or USD are used, defaults to MVR

#### 2. currency-formatter.js (`frontend/lib/currency-formatter.js`)
- ✅ Already only supports MVR and USD (no changes needed)
- ✅ MVR symbol: ރ (Unicode U+0783)
- ✅ USD symbol: $

#### 3. payments/collect/page.jsx (`frontend/app/(dashboard)/payments/collect/page.jsx`)
- ✅ Replaced all AED-specific checks with `normalizeCurrency()` calls
- ✅ All currency references now use normalization
- ✅ Ensures only MVR or USD are used

#### 4. Unit Forms
- ✅ `units/new/page.jsx` - Already has hardcoded MVR/USD dropdowns
- ✅ `units/[id]/edit/page.jsx` - Already has hardcoded MVR/USD dropdowns
- ✅ No changes needed

## Default Behavior

### Always Defaults to MVR
- When currency is not provided → MVR
- When currency is invalid → MVR
- When currency is not MVR or USD → MVR
- Database defaults → MVR
- API defaults → MVR

### Validation Rules
- **Backend**: All currency fields validate to only allow 'MVR' or 'USD'
- **Frontend**: `normalizeCurrency()` function ensures only MVR or USD
- **Forms**: Dropdowns only show MVR and USD options

## API Response

The Unit API now returns:
```json
{
  "currency": "MVR",
  "currency_symbol": "ރ",
  "security_deposit_currency": "MVR",
  "security_deposit_currency_symbol": "ރ"
}
```

## Database

### Currencies Table
After running seeder, only contains:
- MVR (ރ) - sort_order: 1
- USD ($) - sort_order: 2

### Units Table
- `currency` column defaults to 'MVR'
- `security_deposit_currency` defaults to rent currency or 'MVR'

## Testing Checklist

- [ ] Run CurrencySeeder: `php artisan db:seed --class=CurrencySeeder`
- [ ] Verify currencies table only has MVR and USD
- [ ] Test creating unit with MVR currency
- [ ] Test creating unit with USD currency
- [ ] Test creating unit without currency (should default to MVR)
- [ ] Test creating unit with invalid currency (should default to MVR)
- [ ] Verify Units page shows MVR and USD totals separately
- [ ] Verify currency symbols display correctly (ރ for MVR, $ for USD)

## Files Modified

### Backend
1. `backend/database/seeders/CurrencySeeder.php`
2. `backend/database/seeders/DatabaseSeeder.php`
3. `backend/app/Http/Resources/UnitResource.php`
4. `backend/app/Http/Controllers/Api/V1/UnitController.php`
5. `backend/app/Http/Requests/StoreUnifiedPaymentEntryRequest.php`
6. `backend/app/Http/Requests/Settings/UpdateCurrencySettingsRequest.php`
7. `backend/app/Http/Requests/Settings/UpdateSystemSettingsRequest.php`
8. `backend/app/Http/Requests/BulkImportUnitsRequest.php`
9. `backend/app/Services/UnifiedPayments/UnifiedPaymentService.php`

### Frontend
1. `frontend/utils/currency-config.js`
2. `frontend/app/(dashboard)/payments/collect/page.jsx`
3. `frontend/app/(dashboard)/units/page.jsx`

## Notes

- All currency defaults are **MVR**
- Only **MVR** and **USD** are supported
- Invalid currencies automatically default to **MVR**
- Currency symbols: MVR = ރ, USD = $
- No conversion between currencies - amounts are kept separate
