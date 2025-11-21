# Test Verification Guide

## Status
⚠️ **Tests were not automatically run** due to PHP not being in the system PATH. However, the implementation is complete and ready for manual testing.

## How to Run Tests

### Option 1: Using Composer (Recommended)
```bash
cd backend
composer test
```

### Option 2: Using PHPUnit Directly
```bash
cd backend
vendor/bin/phpunit --filter PropertyApiTest
```

### Option 3: Using Laravel Artisan
```bash
cd backend
php artisan test --filter PropertyApiTest
```

## Tests to Verify

### Critical Tests for Multi-Tenant Isolation

1. **PropertyApiTest**
   - `test_owner_can_list_properties` - Should only return properties for authenticated landlord
   - `test_owner_can_create_property` - Should create property with correct landlord_id
   - `test_owner_can_update_property` - Should only update own properties
   - `test_owner_can_delete_property` - Should only delete own properties
   - `test_cannot_access_other_landlord_property` - Should return 403/404 for other landlord's properties

2. **UnitApiTest**
   - `test_owner_can_list_units` - Should only return units for authenticated landlord
   - `test_owner_can_create_unit` - Should create unit with correct landlord_id
   - `test_owner_can_update_unit` - Should only update own units
   - Tests for cross-landlord access prevention

3. **TenantApiTest**
   - Verify tenants are filtered by landlord_id
   - Verify cannot access other landlord's tenants

4. **TenantUnitApiTest**
   - Verify tenant units are filtered by landlord_id
   - Verify cross-landlord access prevention

5. **FinancialRecordApiTest**
   - Verify financial records are filtered by landlord_id

6. **MaintenanceRequestApiTest**
   - Verify maintenance requests are filtered by landlord_id

## Expected Test Results

### ✅ Should Pass
- All CRUD operations for authenticated user's own data
- Proper filtering in list endpoints
- Correct landlord_id assignment on create

### ✅ Should Return 403/404
- Accessing other landlord's resources via route model binding
- Updating other landlord's resources
- Deleting other landlord's resources

## Manual Testing Checklist

### Backend API Testing

1. **Create Two Landlord Accounts**
   ```bash
   # Use your existing test setup or create via API
   POST /api/v1/auth/register (or use existing accounts)
   ```

2. **Test Property Isolation**
   - Login as Landlord A
   - Create Property A
   - Login as Landlord B
   - Verify Property A is NOT visible
   - Try to access Property A by ID → Should return 403/404

3. **Test Unit Isolation**
   - Login as Landlord A
   - Create Unit A under Property A
   - Login as Landlord B
   - Verify Unit A is NOT visible
   - Try to access Unit A by ID → Should return 403/404

4. **Test Tenant Isolation**
   - Login as Landlord A
   - Create Tenant A
   - Login as Landlord B
   - Verify Tenant A is NOT visible

5. **Test Cross-Entity Validation**
   - Login as Landlord A
   - Try to create unit with Property ID from Landlord B → Should fail
   - Try to create tenant unit with Unit ID from Landlord B → Should fail

### Frontend Testing

1. **Login as Different Users**
   - Login as Owner A → Should only see Owner A's data
   - Login as Owner B → Should only see Owner B's data
   - Verify no data leakage between accounts

2. **Test All Pages**
   - Properties page → Only shows own properties
   - Units page → Only shows own units
   - Tenants page → Only shows own tenants
   - Tenant Units page → Only shows own tenant units
   - Assets page → Only shows assets from own units
   - Financial Records → Only shows own records
   - Maintenance Requests → Only shows own requests
   - Rent Invoices → Only shows own invoices

## Troubleshooting

### If Tests Fail

1. **Global Scope Issues**
   - Check if `Auth::user()` is available in test context
   - Verify `Sanctum::actingAs()` is called before model queries
   - Check if factories need `withoutGlobalScopes()` for setup

2. **Route Model Binding Issues**
   - Verify `resolveRouteBinding()` is working correctly
   - Check if policies are being called after route binding
   - Ensure 403 vs 404 responses are correct

3. **Database Issues**
   - Ensure test database is properly set up
   - Check if migrations have run
   - Verify foreign key constraints

## Quick Test Command Reference

```bash
# Run all tests
cd backend && composer test

# Run specific test class
cd backend && php artisan test --filter PropertyApiTest

# Run specific test method
cd backend && php artisan test --filter test_owner_can_list_properties

# Run with verbose output
cd backend && php artisan test --filter PropertyApiTest -v
```

## Notes

- Tests use SQLite in-memory database (configured in phpunit.xml)
- Tests use `RefreshDatabase` trait to reset database between tests
- All tests authenticate users using `Sanctum::actingAs()`
- Global scopes only apply when `Auth::user()` exists
- Factories bypass global scopes (inserts, not queries)

## Next Steps

1. Run the test suite manually using one of the methods above
2. Verify all tests pass
3. Perform manual testing with multiple landlord accounts
4. Monitor for any edge cases or issues
5. Update this document with test results

