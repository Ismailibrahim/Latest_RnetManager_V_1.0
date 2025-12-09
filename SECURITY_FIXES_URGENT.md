# Urgent Security Fixes

## Priority 1: Fix Information Disclosure (CRITICAL)

### Fix 1: UnifiedPaymentController.php

**File:** `backend/app/Http/Controllers/Api/V1/UnifiedPaymentController.php`

**Replace lines 91-128 with:**

```php
} catch (\Illuminate\Database\QueryException $e) {
    \Log::error('Database error creating unified payment entry', [
        'error' => $e->getMessage(),
        'sql' => $e->getSql(),
        'bindings' => $e->getBindings(),
        'code' => $e->getCode(),
        'payload' => $request->validated(),
    ]);
    
    // Only return detailed error in debug mode
    if (config('app.debug')) {
        return response()->json([
            'message' => $e->getMessage(),
            'error' => [
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
            ],
        ], 500);
    }
    
    // Production: generic error message
    return response()->json([
        'message' => 'An error occurred while processing your request. Please try again later.',
    ], 500);
} catch (\Exception $e) {
    \Log::error('Failed to create unified payment entry', [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
        'payload' => $request->validated(),
        'class' => get_class($e),
    ]);
    
    // Only return detailed error in debug mode
    if (config('app.debug')) {
        return response()->json([
            'message' => $e->getMessage(),
            'error' => [
                'message' => $e->getMessage(),
                'class' => get_class($e),
            ],
        ], 500);
    }
    
    // Production: generic error message
    return response()->json([
        'message' => 'An error occurred while processing your request. Please try again later.',
    ], 500);
}
```

### Fix 2: bootstrap/app.php

**File:** `backend/bootstrap/app.php`

**Replace lines 107-125 with:**

```php
// Return a proper error response instead of crashing
if ($request->expectsJson() || $request->is('api/*')) {
    $errorDetails = [
        'message' => 'A database error occurred.',
    ];
    
    // Only include detailed error information in debug mode
    if (config('app.debug')) {
        $errorDetails = [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
        ];
        
        if ($e->getSql()) {
            $errorDetails['sql'] = $e->getSql();
            $errorDetails['bindings'] = $e->getBindings();
        }
    }
    
    return response()->json([
        'message' => config('app.debug') ? $e->getMessage() : 'A database error occurred.',
        'error' => $errorDetails,
    ], 500);
}
```

---

## Priority 2: Fix CORS Configuration (CRITICAL)

### Fix 3: routes/api.php

**File:** `backend/routes/api.php`

**Replace lines 58-69 with:**

```php
Route::options('{any}', function (Request $request) {
    $allowedOrigins = config('cors.allowed_origins', ['http://localhost:3000']);
    $requestOrigin = $request->headers->get('Origin');
    
    // Validate origin against allowlist
    $allowOrigin = in_array($requestOrigin, $allowedOrigins) 
        ? $requestOrigin 
        : $allowedOrigins[0] ?? 'http://localhost:3000';
    
    $requestedHeaders = $request->headers->get('Access-Control-Request-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    
    return response('', 204)->withHeaders([
        'Access-Control-Allow-Origin' => $allowOrigin,
        'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers' => $requestedHeaders,
        'Access-Control-Allow-Credentials' => 'true',
        'Access-Control-Max-Age' => '86400',
    ]);
})->where('any', '.*');
```

**Replace lines 104-139 with:**

```php
Route::match(['OPTIONS', 'GET'], '/cors-options-test', function (Request $request) {
    if ($request->getMethod() === 'OPTIONS') {
        $allowedOrigins = config('cors.allowed_origins', ['http://localhost:3000']);
        $requestOrigin = $request->headers->get('Origin');
        $referer = $request->headers->get('Referer');
        
        // Validate origin
        $allowOrigin = in_array($requestOrigin, $allowedOrigins) 
            ? $requestOrigin 
            : ($allowedOrigins[0] ?? 'http://localhost:3000');
        
        // Extract origin from Referer if Origin is missing (only in debug)
        if (!$requestOrigin && $referer && config('app.debug')) {
            $parsedReferer = parse_url($referer);
            if ($parsedReferer && isset($parsedReferer['scheme']) && isset($parsedReferer['host'])) {
                $port = isset($parsedReferer['port']) ? ':' . $parsedReferer['port'] : '';
                $extractedOrigin = $parsedReferer['scheme'] . '://' . $parsedReferer['host'] . $port;
                if (in_array($extractedOrigin, $allowedOrigins)) {
                    $allowOrigin = $extractedOrigin;
                }
            }
        }
        
        $response = response()->noContent(204);
        
        $response->headers->set('Access-Control-Allow-Origin', $allowOrigin, true);
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS', true);
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept', true);
        $response->headers->set('Access-Control-Allow-Credentials', 'true', true);
        $response->headers->set('Access-Control-Max-Age', '86400', true);
        
        return $response;
    }
    
    return response()->json([
        'status' => 'ok',
        'message' => 'OPTIONS test endpoint works!',
        'method' => $request->getMethod(),
        'origin' => $request->headers->get('Origin'),
    ]);
})->name('api.v1.cors-options-test');
```

---

## Priority 3: Secure Debug Endpoints (HIGH)

### Fix 4: routes/api.php - Restrict Debug Endpoints

**File:** `backend/routes/api.php`

**Replace lines 79-149 with:**

```php
// Debug endpoints - only available in debug mode AND from localhost
if (config('app.debug')) {
    // Restrict debug endpoints to localhost only
    $debugMiddleware = function ($request, $next) {
        $ip = $request->ip();
        $allowedIps = ['127.0.0.1', '::1', 'localhost'];
        
        if (!in_array($ip, $allowedIps) && !str_starts_with($ip, '127.') && !str_starts_with($ip, '::1')) {
            abort(403, 'Debug endpoints are only available from localhost.');
        }
        
        return $next($request);
    };
    
    // Debug endpoint to check CORS config
    Route::get('/cors-debug', function (Request $request) {
        return response()->json([
            'cors_config' => [
                'allowed_origins' => config('cors.allowed_origins'),
                'allowed_methods' => config('cors.allowed_methods'),
                // Don't expose full config
            ],
            'origin' => $request->headers->get('Origin'),
            'method' => $request->getMethod(),
            'path' => $request->path(),
        ]);
    })->middleware($debugMiddleware);

    // CORS test endpoint (no auth required)
    Route::get('/cors-test', function (Request $request) {
        return response()->json([
            'status' => 'ok',
            'message' => 'CORS is working!',
            'origin' => $request->headers->get('Origin'),
            'timestamp' => now()->toIso8601String(),
        ]);
    })->middleware($debugMiddleware)->name('api.v1.cors-test');
    
    // ... rest of debug endpoints with $debugMiddleware
}
```

---

## Priority 4: Add MIME Type Validation (HIGH)

### Fix 5: TenantDocumentController.php

**File:** `backend/app/Http/Controllers/Api/V1/TenantDocumentController.php`

**Replace line 49 with:**

```php
$validated = $request->validate([
    // Size in kilobytes; default 20MB if env not set
    'file' => [
        'required', 
        'file', 
        'mimes:pdf,jpg,jpeg,png',
        'mimetypes:application/pdf,image/jpeg,image/png,image/jpg',
        'max:' . (int) env('TENANT_DOC_MAX_KB', 20480)
    ],
    'category' => ['nullable', 'string', 'in:general,id_proof'],
    'title' => ['nullable', 'string', 'max:255'],
    'description' => ['nullable', 'string', 'max:1000'],
    'is_id_proof' => ['sometimes', 'boolean'],
]);
```

### Fix 6: StoreMaintenanceRequest.php

**File:** `backend/app/Http/Requests/StoreMaintenanceRequest.php`

**Replace line 40 with:**

```php
'receipt' => [
    'nullable', 
    'file', 
    'mimes:pdf,jpg,jpeg,png',
    'mimetypes:application/pdf,image/jpeg,image/png,image/jpg',
    'max:' . (int) env('MAINTENANCE_RECEIPT_MAX_KB', 10240)
],
```

---

## Priority 5: Fix SQL Injection Risk (HIGH)

### Fix 7: AdminLandlordController.php

**File:** `backend/app/Http/Controllers/Api/V1/Admin/AdminLandlordController.php`

**Replace line 65 with:**

```php
// Search by company name - properly escaped
if ($request->filled('search')) {
    $search = $request->input('search');
    // Use parameter binding to prevent SQL injection
    $query->where('company_name', 'LIKE', '%' . addslashes($search) . '%');
    // Or better, use Laravel's query builder which handles this automatically:
    // $query->where('company_name', 'like', '%' . $search . '%');
}
```

**Note:** Laravel's query builder already provides protection, but explicit escaping adds defense in depth.

---

## Environment Configuration

### Update .env for Production

Ensure these are set in production:

```env
APP_DEBUG=false
APP_ENV=production
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## Testing After Fixes

1. Test error responses don't expose SQL queries in production mode
2. Verify CORS only allows configured origins
3. Confirm debug endpoints are inaccessible from external IPs
4. Test file uploads with various file types
5. Verify search functionality still works correctly

---

## Additional Recommendations

1. **Add Security Headers Middleware:**
   ```php
   // In bootstrap/app.php
   $middleware->appendToGroup('api', \App\Http\Middleware\SecurityHeaders::class);
   ```

2. **Create SecurityHeaders Middleware:**
   ```php
   public function handle($request, Closure $next)
   {
       $response = $next($request);
       
       $response->headers->set('X-Content-Type-Options', 'nosniff');
       $response->headers->set('X-Frame-Options', 'DENY');
       $response->headers->set('X-XSS-Protection', '1; mode=block');
       $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
       
       return $response;
   }
   ```

3. **Review and Update Dependencies:**
   ```bash
   composer audit
   npm audit
   ```

---

**Apply these fixes immediately before deploying to production!**
