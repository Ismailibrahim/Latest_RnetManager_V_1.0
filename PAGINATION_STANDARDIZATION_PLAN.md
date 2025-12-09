# Pagination Standardization Plan

## Goal
Remove `withQueryString()` from all 21 remaining controllers and apply the same defensive pagination pattern used in `AdminSignupController` and `UnifiedPaymentController`. This prevents pagination-related 500 errors across the entire application.

## Current Status
- ✅ Fixed: `AdminSignupController` and `UnifiedPaymentController`
- ⚠️ Remaining: 21 controllers still using `withQueryString()`

## Implementation Strategy
Work through controllers in priority order (most critical first), applying the same pattern consistently.

## Controllers to Fix (Priority Order)

### High Priority (Core Features)
1. `PropertyController` - Property management (critical)
2. `UnitController` - Unit management (critical)
3. `TenantController` - Tenant management (critical)
4. `RentInvoiceController` - Financial operations (critical)
5. `FinancialRecordController` - Financial tracking (critical)
6. `TenantUnitController` - Lease management (critical)

### Medium Priority (Important Features)
7. `MaintenanceRequestController` - Maintenance tracking
8. `MaintenanceInvoiceController` - Maintenance billing
9. `SecurityDepositRefundController` - Deposit management
10. `AdminLandlordController` - Admin operations (2 instances)

### Lower Priority (Supporting Features)
11. `AssetController` - Asset management
12. `VendorController` - Vendor management
13. `NotificationController` - Notifications
14. `PaymentMethodController` - Payment methods
15. `TenantDocumentController` - Document management
16. `UnitOccupancyHistoryController` - Occupancy tracking
17. `AssetTypeController` - Asset types
18. `UnitTypeController` - Unit types
19. `NationalityController` - Nationality data

## Implementation Pattern

For each controller, apply this pattern:

### Step 1: Remove withQueryString()
**Before:**
```php
$results = $query->paginate($perPage)->withQueryString();
```

**After:**
```php
$results = $query->paginate($perPage);
```

### Step 2: Build Pagination Links Defensively (if needed)
If the controller builds custom pagination links, apply defensive pattern:

```php
$links = [
    'first' => null,
    'last' => null,
    'prev' => null,
    'next' => null,
];

if ($results && $results->total() > 0) {
    try {
        $links['prev'] = $results->previousPageUrl();
        $links['next'] = $results->nextPageUrl();
        
        $currentPage = $results->currentPage();
        $lastPage = $results->lastPage();
        
        if ($currentPage > 0 && $lastPage > 0) {
            $links['first'] = $results->url(1);
            if ($lastPage > 1) {
                $links['last'] = $results->url($lastPage);
            }
        }
    } catch (\Exception $e) {
        Log::warning('Could not build pagination links', ['error' => $e->getMessage()]);
    }
}
```

### Step 3: Add Database Connection Check (for critical controllers)
For high-priority controllers, add database connection check at method start:

```php
try {
    DB::connection()->getPdo();
} catch (\Exception $e) {
    Log::error('Database connection failed', ['error' => $e->getMessage()]);
    return response()->json([
        'message' => 'Database connection failed. Please check your database configuration.',
        'error' => 'Database connection error',
    ], 500);
}
```

## Implementation Steps

### Phase 1: High Priority Controllers (6 controllers)
1. Fix `PropertyController`
2. Fix `UnitController`
3. Fix `TenantController`
4. Fix `RentInvoiceController`
5. Fix `FinancialRecordController`
6. Fix `TenantUnitController`

**After each fix:**
- Verify PHP syntax: `php -l app/Http/Controllers/Api/V1/[Controller].php`
- Check for linter errors
- Clear caches if needed

### Phase 2: Medium Priority Controllers (4 controllers)
7. Fix `MaintenanceRequestController`
8. Fix `MaintenanceInvoiceController`
9. Fix `SecurityDepositRefundController`
10. Fix `AdminLandlordController` (2 instances)

### Phase 3: Lower Priority Controllers (9 controllers)
11-19. Fix remaining controllers in order

### Phase 4: Verification
- Run `grep -r "withQueryString" backend/app/Http/Controllers` to verify all removed
- Clear all caches: `php artisan optimize:clear`
- Test critical endpoints
- Check Laravel logs for any pagination-related errors

## Testing Checklist

After completing each phase:
1. ✅ PHP syntax validation passes
2. ✅ No linter errors
3. ✅ Caches cleared
4. ✅ Critical endpoints return proper responses (200 or clear errors, not 500)

## Success Criteria

- Zero controllers using `withQueryString()`
- All pagination uses simple `paginate($perPage)` pattern
- Critical controllers have database connection checks
- No pagination-related 500 errors
- Consistent error handling across all endpoints

## Risk Mitigation

- Fix one controller at a time
- Test syntax after each change
- Keep changes minimal (only remove withQueryString, add defensive checks)
- Don't modify business logic
- Easy rollback (git revert if needed)
