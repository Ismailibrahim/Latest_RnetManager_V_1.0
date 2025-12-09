# CORS Cleanup Guide - Remove Redundant Manual Headers

## Overview
The `ForceCors` middleware automatically handles CORS headers for all API routes. Manual CORS header setting in controllers is redundant and should be removed.

## Status
- ✅ **PrintController** - Fixed (removed manual CORS headers)
- 🔄 **SystemSettingsController** - Needs cleanup (55+ instances found)

## Files Requiring Cleanup

### SystemSettingsController.php
**Issue:** 55+ instances of manual CORS header setting

**Pattern to Remove:**
```php
// BEFORE
$corsHeaders = $this->getCorsHeaders($request);
foreach ($corsHeaders as $key => $value) {
    $response->header($key, $value);
}

// AFTER
// CORS headers are handled by ForceCors middleware
```

**Or:**
```php
// BEFORE
->withHeaders($corsHeaders)

// AFTER
// (remove withHeaders call, middleware handles it)
```

## Automated Cleanup Script

You can use find/replace in your IDE:

### Find:
```php
$corsHeaders = $this->getCorsHeaders($request);
```

### Replace:
```php
// CORS headers are handled by ForceCors middleware
```

### Find:
```php
foreach ($corsHeaders as $key => $value) {
    $response->header($key, $value);
}
```

### Replace:
```php
// CORS headers are handled by ForceCors middleware
```

### Find:
```php
->withHeaders($corsHeaders)
```

### Replace:
```php
// (remove this line - middleware handles CORS)
```

## Verification

After cleanup, verify:
1. ✅ No `getCorsHeaders()` calls remain (except deprecated method)
2. ✅ No `foreach ($corsHeaders` loops remain
3. ✅ No `->withHeaders($corsHeaders)` calls remain
4. ✅ All API endpoints still work correctly
5. ✅ CORS headers still present (from middleware)

## Testing

Test that CORS still works:
```bash
curl -X OPTIONS http://localhost:8000/api/v1/settings/system \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

Expected: Should see `Access-Control-Allow-Origin` header in response.

