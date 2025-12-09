# Occupancy Report 500 Error - Root Cause Analysis & Fix Plan

## Problem
The `/api/v1/occupancy-report` endpoint returns HTTP 500 Internal Server Error.

## Root Cause Analysis

### Issue 1: `selectRaw` with `first()` returning null
When using `selectRaw('COUNT(DISTINCT unit_id) as count')->first()`, if there are no matching rows, `first()` returns `null`. Accessing `->count` on null causes a fatal error.

### Issue 2: `whereHas` with `selectRaw` incompatibility
The combination of `whereHas` (which creates a subquery) with `selectRaw` can cause SQL syntax errors in Laravel.

### Issue 3: Global scopes interfering
The `TenantUnit` model has a global scope that filters by `landlord_id`, which might interfere with aggregate queries.

## Solution Strategy

### Approach 1: Use `DB::table()` for aggregate queries (RECOMMENDED)
- More reliable for COUNT DISTINCT operations
- Bypasses model scopes when needed
- Clearer SQL generation

### Approach 2: Use `get()->pluck()->unique()->count()` for small datasets
- Works well when dataset is manageable
- More readable code
- Handles edge cases better

### Approach 3: Use `distinct()->count('unit_id')`
- Laravel's built-in method
- May not work correctly for DISTINCT on specific column

## Implementation Plan

1. Replace all `selectRaw('COUNT(DISTINCT unit_id) as count')->first()` calls
2. Use `DB::table()` with proper query building for aggregate queries
3. For `whereHas` queries, use `get()->pluck()->unique()->count()` approach
4. Add proper null checks and error handling
5. Test each query method individually

## Files to Modify
- `backend/app/Http/Controllers/Api/V1/OccupancyReportController.php`

## Testing Strategy
1. Test with empty database
2. Test with single tenant unit
3. Test with multiple tenant units (same unit_id)
4. Test with super admin user
5. Test with regular landlord user
