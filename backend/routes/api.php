<?php

use App\Http\Controllers\Api\V1\AccountController;
use App\Http\Controllers\Api\V1\AccountDelegateController;
use App\Http\Controllers\Api\V1\AssetController;
use App\Http\Controllers\Api\V1\AssetTypeController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BillingSettingsController;
use App\Http\Controllers\Api\V1\EmailTemplateController;
use App\Http\Controllers\Api\V1\FinancialRecordController;
use App\Http\Controllers\Api\V1\FinancialSummaryController;
use App\Http\Controllers\Api\V1\LandlordController;
use App\Http\Controllers\Api\V1\OccupancyReportController;
use App\Http\Controllers\Api\V1\MaintenanceInvoiceController;
use App\Http\Controllers\Api\V1\MaintenanceRequestController;
use App\Http\Controllers\Api\V1\NationalityController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\CurrencyController;
use App\Http\Controllers\Api\V1\DocumentTemplateController;
use App\Http\Controllers\Api\V1\PaymentMethodController;
use App\Http\Controllers\Api\V1\PrintController;
use App\Http\Controllers\Api\V1\PropertyController;
use App\Http\Controllers\Api\V1\RentInvoiceController;
use App\Http\Controllers\Api\V1\SecurityDepositRefundController;
use App\Http\Controllers\Api\V1\SmsTemplateController;
use App\Http\Controllers\Api\V1\SystemSettingsController;
use App\Http\Controllers\Api\V1\TenantController;
use App\Http\Controllers\Api\V1\TenantDocumentController;
use App\Http\Controllers\Api\V1\TenantUnitController;
use App\Http\Controllers\Api\V1\TenantUnitPendingChargeController;
use App\Http\Controllers\Api\V1\UnitController;
use App\Http\Controllers\Api\V1\UnitOccupancyHistoryController;
use App\Http\Controllers\Api\V1\UnitTypeController;
use App\Http\Controllers\Api\V1\UnifiedPaymentController;
use App\Http\Controllers\Api\V1\VendorController;
use App\Http\Controllers\Api\V1\Mobile\MobilePropertyController;
use App\Http\Controllers\Api\V1\Mobile\MobileUnitController;
use App\Http\Controllers\Api\V1\Mobile\MobilePaymentController;
use App\Http\Controllers\Api\V1\Admin\AdminLandlordController;
use App\Http\Controllers\Api\V1\Admin\AdminSignupController;
use App\Http\Controllers\Api\V1\Admin\UserManagementController;
use App\Http\Controllers\Api\V1\Admin\UserLoginLogController;
use App\Http\Controllers\Api\V1\Admin\SubscriptionLimitsController;
use App\Http\Middleware\EnsureCorsHeaders;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

// Simple health check endpoint (no version prefix for easier monitoring)
Route::get('/health', function () {
    try {
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        $dbHealthy = true;
    } catch (\Exception $e) {
        $dbHealthy = false;
    }

    return response()->json([
        'status' => $dbHealthy ? 'healthy' : 'unhealthy',
        'timestamp' => now()->toIso8601String(),
        'database' => $dbHealthy ? 'connected' : 'disconnected',
    ], $dbHealthy ? 200 : 503);
})->middleware('throttle:60,1')->name('api.health');

Route::prefix('v1')->group(function (): void {
    // Handle ALL OPTIONS requests FIRST (before other routes)
    // ForceCors middleware will handle this, but route handler provides fallback
    Route::options('{any}', function (Request $request) {
        $requestOrigin = $request->headers->get('Origin');
        $allowedOrigins = config('cors.allowed_origins', []);
        $allowedPatterns = config('cors.allowed_origins_patterns', []);
        
        // Validate origin against allowlist
        $validOrigin = null;
        
        if ($requestOrigin) {
            // Check exact match in allowed origins
            if (in_array($requestOrigin, $allowedOrigins) || in_array('*', $allowedOrigins)) {
                $validOrigin = $requestOrigin;
            } else {
                // Check against patterns
                foreach ($allowedPatterns as $pattern) {
                    if (preg_match($pattern, $requestOrigin)) {
                        $validOrigin = $requestOrigin;
                        break;
                    }
                }
            }
        }
        
        // Fallback: use first allowed origin or default
        if (!$validOrigin) {
            $validOrigin = $allowedOrigins[0] ?? 'http://localhost:3000';
            // In debug mode, allow the requested origin if no match found (for development)
            if (config('app.debug') && $requestOrigin) {
                $validOrigin = $requestOrigin;
            }
        }
        
        $requestedHeaders = $request->headers->get('Access-Control-Request-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        
        return response('', 204)->withHeaders([
            'Access-Control-Allow-Origin' => $validOrigin,
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => $requestedHeaders,
            'Access-Control-Allow-Credentials' => 'true',
            'Access-Control-Max-Age' => (string) config('cors.max_age', 86400),
        ]);
    })->where('any', '.*');
    
    Route::get('/', function () {
        return response()->json([
            'status' => 'ok',
            'message' => 'RentApplicaiton API v1 online',
        ]);
    });
    
    // Debug endpoints - only available in debug mode
    if (config('app.debug')) {
        // Debug endpoint to check CORS config
        Route::get('/cors-debug', function (Request $request) {
            return response()->json([
                'cors_config' => config('cors'),
                'origin' => $request->headers->get('Origin'),
                'method' => $request->getMethod(),
                'path' => $request->path(),
                'middleware' => $request->route()?->middleware() ?? [],
            ]);
        });
        
        // Test endpoint to verify auth middleware works
        Route::get('/test-auth', function (Request $request) {
            \Illuminate\Support\Facades\Log::info('Test auth endpoint called', [
                'has_user' => $request->user() !== null,
                'user_id' => $request->user()?->id,
                'is_super_admin' => $request->user()?->isSuperAdmin() ?? false,
            ]);
            
            $origin = $request->headers->get('Origin', '*');
            return response()->json([
                'status' => 'ok',
                'message' => 'Auth test endpoint works',
                'authenticated' => $request->user() !== null,
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'email' => $request->user()->email,
                    'is_super_admin' => $request->user()->isSuperAdmin(),
                ] : null,
            ])->withHeaders([
                'Access-Control-Allow-Origin' => $origin,
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, Accept',
                'Access-Control-Allow-Credentials' => 'true',
            ]);
        })->middleware('auth:sanctum')->name('api.v1.test-auth');

        // CORS test endpoint (no auth required)
        Route::get('/cors-test', function (Request $request) {
            $origin = $request->headers->get('Origin', '*');
            return response()->json([
                'status' => 'ok',
                'message' => 'CORS is working!',
                'origin' => $request->headers->get('Origin'),
                'referer' => $request->headers->get('Referer'),
                'timestamp' => now()->toIso8601String(),
            ])->header('Access-Control-Allow-Origin', $origin)
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
                ->header('Access-Control-Allow-Credentials', 'true');
        })->name('api.v1.cors-test');
        
        // Settings system CORS test (no auth required for testing)
        Route::get('/settings-system-test', function (Request $request) {
            $origin = $request->headers->get('Origin', '*');
            $corsHeaders = [
                'Access-Control-Allow-Origin' => $origin,
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, Accept',
                'Access-Control-Allow-Credentials' => 'true',
            ];
            return response()->json([
                'status' => 'ok',
                'message' => 'Settings system route is accessible',
                'path' => $request->path(),
                'method' => $request->method(),
                'origin' => $origin,
                'url' => $request->fullUrl(),
            ])->withHeaders($corsHeaders);
        })->name('api.v1.settings-system-test');
        
        // Test the exact settings/system endpoint (with auth)
        Route::get('/settings/system/test', function (Request $request) {
            $origin = $request->headers->get('Origin', '*');
            $corsHeaders = [
                'Access-Control-Allow-Origin' => $origin,
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, Accept',
                'Access-Control-Allow-Credentials' => 'true',
            ];
            return response()->json([
                'status' => 'ok',
                'message' => 'Settings system endpoint is accessible',
                'authenticated' => $request->user() !== null,
                'user_id' => $request->user()?->id,
                'is_super_admin' => $request->user()?->isSuperAdmin() ?? false,
            ])->withHeaders($corsHeaders);
        })->middleware('auth:sanctum')->name('api.v1.settings.system.test');
        
        // OPTIONS test endpoint - explicitly handle OPTIONS requests
        // This endpoint ALWAYS sets CORS headers, bypassing all middleware
        Route::match(['OPTIONS', 'GET'], '/cors-options-test', function (Request $request) {
            if ($request->getMethod() === 'OPTIONS') {
                $origin = $request->headers->get('Origin');
                $referer = $request->headers->get('Referer');
                
                // Extract origin from Referer if Origin is missing
                if (!$origin && $referer) {
                    $parsedReferer = parse_url($referer);
                    if ($parsedReferer && isset($parsedReferer['scheme']) && isset($parsedReferer['host'])) {
                        $port = isset($parsedReferer['port']) ? ':' . $parsedReferer['port'] : '';
                        $origin = $parsedReferer['scheme'] . '://' . $parsedReferer['host'] . $port;
                    }
                }
                
                $allowOrigin = $origin ?: 'http://localhost:3000';
                
                // Create response and FORCE headers
                $response = response()->noContent(204);
                
                // Use header() function directly to ensure headers are set
                header('Access-Control-Allow-Origin: ' . $allowOrigin);
                header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
                header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
                header('Access-Control-Allow-Credentials: true');
                header('Access-Control-Max-Age: 86400');
                
                // Also set via response object
                $response->headers->set('Access-Control-Allow-Origin', $allowOrigin, true);
                $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS', true);
                $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept', true);
                $response->headers->set('Access-Control-Allow-Credentials', 'true', true);
                $response->headers->set('Access-Control-Max-Age', '86400', true);
                
                error_log('OPTIONS Test Endpoint: Setting CORS headers - Origin: ' . $allowOrigin);
                
                return $response;
            }
            
            return response()->json([
                'status' => 'ok',
                'message' => 'OPTIONS test endpoint works!',
                'method' => $request->getMethod(),
                'origin' => $request->headers->get('Origin'),
            ]);
        })->name('api.v1.cors-options-test');
    }

    // Health check endpoints
    Route::get('/health', [\App\Http\Controllers\Api\V1\HealthController::class, 'check'])
        ->middleware('throttle:30,1')
        ->name('api.v1.health');

    Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function (): void {
        Route::get('/health/diagnostics', [\App\Http\Controllers\Api\V1\HealthController::class, 'diagnostics'])
            ->name('api.v1.health.diagnostics');
        Route::get('/health/crashes', [\App\Http\Controllers\Api\V1\HealthController::class, 'crashSummary'])
            ->name('api.v1.health.crashes');
    });

    Route::prefix('auth')->group(function (): void {
        // Public endpoints
        Route::post('signup', [AuthController::class, 'signup'])
            ->middleware('throttle:5,60')
            ->name('api.v1.auth.signup');
        
        Route::get('subscription-limits', [AuthController::class, 'getSubscriptionLimits'])
            ->name('api.v1.auth.subscription-limits');
        
        Route::post('login', [AuthController::class, 'login'])
            ->middleware('throttle:10,1')
            ->name('api.v1.auth.login');

        // Authenticated endpoints
        Route::middleware('auth:sanctum')->group(function (): void {
            Route::get('me', [AuthController::class, 'me']);
            Route::post('logout', [AuthController::class, 'logout']);
        });
    });

    // OPTIONS routes for settings/system - MUST be BEFORE auth middleware
    // CORS preflight requests don't include auth tokens, so they must be public
    Route::match(['OPTIONS'], 'settings/system', function (Request $request) {
        $origin = $request->headers->get('Origin', '*');
        $requestedHeaders = $request->headers->get('Access-Control-Request-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        
        $response = response('', 204);
        $response->headers->set('Access-Control-Allow-Origin', $origin, true);
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS', true);
        $response->headers->set('Access-Control-Allow-Headers', $requestedHeaders, true);
        $response->headers->set('Access-Control-Allow-Credentials', 'true', true);
        $response->headers->set('Access-Control-Max-Age', '86400', true);
        
        return $response;
    });
    
    Route::match(['OPTIONS'], 'settings/system/{any}', function (Request $request) {
        $origin = $request->headers->get('Origin', '*');
        $requestedHeaders = $request->headers->get('Access-Control-Request-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        
        $response = response('', 204);
        $response->headers->set('Access-Control-Allow-Origin', $origin, true);
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS', true);
        $response->headers->set('Access-Control-Allow-Headers', $requestedHeaders, true);
        $response->headers->set('Access-Control-Allow-Credentials', 'true', true);
        $response->headers->set('Access-Control-Max-Age', '86400', true);
        
        return $response;
    })->where('any', '.*');

    Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function (): void {
        Route::apiResource('landlords', LandlordController::class)->only(['store'])->names('api.v1.landlords');
        Route::apiResource('properties', PropertyController::class)->names('api.v1.properties');

        Route::post('units/bulk-import', [UnitController::class, 'bulkImport'])->middleware('throttle:6,1')
            ->name('api.v1.units.bulk-import');
        Route::get('units/import-template', [UnitController::class, 'downloadTemplate'])
            ->name('api.v1.units.import-template');
        
        // Custom route binding for units to handle super admins
        Route::bind('unit', function ($value) {
            $user = auth()->user();
            if ($user && $user->isSuperAdmin()) {
                return \App\Models\Unit::withoutGlobalScope('landlord')->findOrFail($value);
            }
            return \App\Models\Unit::findOrFail($value);
        });
        
        Route::apiResource('units', UnitController::class)->names('api.v1.units');

        Route::post('tenants/bulk-import', [TenantController::class, 'bulkImport'])->middleware('throttle:6,1')
            ->name('api.v1.tenants.bulk-import');
        Route::get('tenants/import-template', [TenantController::class, 'downloadTemplate'])
            ->name('api.v1.tenants.import-template');
        Route::apiResource('tenants', TenantController::class)->names('api.v1.tenants');

        Route::post('tenant-units/{tenant_unit}/end-lease', [TenantUnitController::class, 'endLease'])
            ->name('api.v1.tenant-units.end-lease');
        Route::post('tenant-units/{tenant_unit}/advance-rent', [TenantUnitController::class, 'collectAdvanceRent'])
            ->name('api.v1.tenant-units.collect-advance-rent');
        Route::post('tenant-units/{tenant_unit}/retroactive-advance-rent', [TenantUnitController::class, 'retroactivelyApplyAdvanceRent'])
            ->name('api.v1.tenant-units.retroactive-advance-rent');
        Route::apiResource('tenant-units', TenantUnitController::class)->parameters([
            'tenant-units' => 'tenant_unit',
        ])->names('api.v1.tenant-units');
        Route::get('tenant-units/{tenant_unit}/pending-charges', TenantUnitPendingChargeController::class)
            ->name('api.v1.tenant-units.pending-charges');

        Route::apiResource('financial-records', FinancialRecordController::class)->parameters([
            'financial-records' => 'financial_record',
        ])->names('api.v1.financial-records');
        Route::get('financial-summary', FinancialSummaryController::class)
            ->name('api.v1.financial-summary');
        Route::get('occupancy-report', OccupancyReportController::class)
            ->name('api.v1.occupancy-report');

        // Simple test route
        Route::get('test-route-loading', function () {
            return response()->json(['status' => 'routes loading correctly']);
        })->name('api.v1.test-route-loading');

        // Rent invoices routes - specific routes MUST come before apiResource
        // Bulk generate uses per-user throttling: 20 requests per hour per user
        // This prevents abuse while allowing legitimate retries
        Route::post('rent-invoices/bulk-generate', [RentInvoiceController::class, 'bulkStore'])
            ->middleware('throttle:20,60')
            ->name('api.v1.rent-invoices.bulk-generate');
        Route::get('rent-invoices/{rent_invoice}/export', [RentInvoiceController::class, 'export'])
            ->where(['rent_invoice' => '[0-9]+'])
            ->name('api.v1.rent-invoices.export');

        // Resource route with constraint
        Route::apiResource('rent-invoices', RentInvoiceController::class)
            ->parameters(['rent-invoices' => 'rent_invoice'])
            ->where(['rent_invoice' => '[0-9]+'])
            ->names('api.v1.rent-invoices');

        Route::apiResource('maintenance-requests', MaintenanceRequestController::class)->parameters([
            'maintenance-requests' => 'maintenance_request',
        ])->names('api.v1.maintenance-requests');
        Route::apiResource('maintenance-invoices', MaintenanceInvoiceController::class)->parameters([
            'maintenance-invoices' => 'maintenance_invoice',
        ])->names('api.v1.maintenance-invoices');
        Route::post('maintenance-invoices/{maintenance_invoice}/sync-status', [MaintenanceInvoiceController::class, 'syncStatus'])
            ->name('api.v1.maintenance-invoices.sync-status');
        Route::post('maintenance-invoices/{maintenance_invoice}/link-payments', [MaintenanceInvoiceController::class, 'linkPayments'])
            ->name('api.v1.maintenance-invoices.link-payments');
        
        // Debug route to check maintenance invoice payment linking (debug mode only)
        if (config('app.debug')) {
            Route::get('debug/maintenance-invoice-payments', function (Request $request) {
            $user = $request->user();
            if (!$user || !$user->landlord_id) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }
            
            $invoice = \App\Models\MaintenanceInvoice::withoutGlobalScopes()
                ->where('landlord_id', $user->landlord_id)
                ->latest('id')
                ->first();
            
            if (!$invoice) {
                return response()->json(['error' => 'No maintenance invoices found'], 404);
            }
            
            $payments = \App\Models\UnifiedPaymentEntry::where('source_type', 'maintenance_invoice')
                ->where('source_id', $invoice->id)
                ->get();
            
            $paymentsByTenant = \App\Models\UnifiedPaymentEntry::where('tenant_unit_id', $invoice->tenant_unit_id)
                ->whereIn('status', ['completed', 'partial'])
                ->latest('id')
                ->take(10)
                ->get();
            
            $totalPaid = \App\Models\UnifiedPaymentEntry::where('source_type', 'maintenance_invoice')
                ->where('source_id', $invoice->id)
                ->whereIn('status', ['completed', 'partial'])
                ->sum('amount');
            
            return response()->json([
                'invoice' => [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'status' => $invoice->status,
                    'grand_total' => (float) $invoice->grand_total,
                    'landlord_id' => $invoice->landlord_id,
                    'tenant_unit_id' => $invoice->tenant_unit_id,
                ],
                'payments_linked' => $payments->map(function($p) {
                    return [
                        'id' => $p->id,
                        'source_type' => $p->source_type,
                        'source_id' => $p->source_id,
                        'source_id_type' => gettype($p->source_id),
                        'amount' => (float) $p->amount,
                        'status' => $p->status,
                        'created_at' => $p->created_at,
                    ];
                }),
                'recent_payments_for_tenant_unit' => $paymentsByTenant->map(function($p) {
                    return [
                        'id' => $p->id,
                        'source_type' => $p->source_type,
                        'source_id' => $p->source_id,
                        'source_id_type' => gettype($p->source_id),
                        'amount' => (float) $p->amount,
                        'status' => $p->status,
                        'payment_type' => $p->payment_type,
                        'description' => $p->description,
                    ];
                }),
                'total_paid' => (float) $totalPaid,
                'should_be_paid' => $totalPaid >= (float) $invoice->grand_total - 0.01,
            ]);
        })->middleware('auth:sanctum');
        }
        Route::apiResource('assets', AssetController::class)->names('api.v1.assets');
        Route::apiResource('asset-types', AssetTypeController::class)->parameters([
            'asset-types' => 'asset_type',
        ])->names('api.v1.asset-types')->only(['index', 'show', 'store', 'update', 'destroy']);
        Route::apiResource('notifications', NotificationController::class)->only(['index', 'show', 'update', 'destroy'])->names('api.v1.notifications');
        Route::apiResource('vendors', VendorController::class)->names('api.v1.vendors')->only(['index', 'store', 'update', 'destroy']);
        Route::apiResource('security-deposit-refunds', SecurityDepositRefundController::class)->parameters([
            'security-deposit-refunds' => 'security_deposit_refund',
        ])->names('api.v1.security-deposit-refunds');
        Route::apiResource('payment-methods', PaymentMethodController::class)->parameters([
            'payment-methods' => 'payment_method',
        ])->names('api.v1.payment-methods');
        Route::get('currencies', [CurrencyController::class, 'index'])->name('api.v1.currencies.index');
        Route::apiResource('unit-occupancy-history', UnitOccupancyHistoryController::class)->parameters([
            'unit-occupancy-history' => 'unit_occupancy_history',
        ])->names('api.v1.unit-occupancy-history');
        Route::apiResource('unit-types', UnitTypeController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->names('api.v1.unit-types');
        Route::apiResource('nationalities', NationalityController::class)->names('api.v1.nationalities');
        Route::apiResource('tenants.documents', TenantDocumentController::class)
            ->shallow()
            ->names('api.v1.tenant-documents');
        Route::apiResource('payments', UnifiedPaymentController::class)
            ->parameters(['payments' => 'payment'])
            ->only(['index', 'store', 'show'])
            ->names('api.v1.payments');

        Route::post('payments/{payment}/capture', [UnifiedPaymentController::class, 'capture'])->middleware('throttle:30,1')
            ->name('api.v1.payments.capture');
        Route::post('payments/{payment}/void', [UnifiedPaymentController::class, 'void'])->middleware('throttle:30,1')
            ->name('api.v1.payments.void');

        Route::prefix('reports')->group(function (): void {
            Route::get('unified-payments', [UnifiedPaymentController::class, 'index'])->name('api.v1.reports.unified-payments');
        });

        // Print/Export routes for documents
        Route::get('print/{type}/{id}', [PrintController::class, 'print'])
            ->where(['type' => 'rent-invoice|maintenance-invoice|security-deposit-slip|advance-rent-receipt|fee-collection-receipt|security-deposit-refund|other-income-receipt|payment-voucher|unified-payment-entry'])
            ->where(['id' => '[0-9]+'])
            ->name('api.v1.print');

        Route::get('account', [AccountController::class, 'show'])->name('api.v1.account.show');
        Route::patch('account', [AccountController::class, 'update'])->name('api.v1.account.update');
        Route::patch('account/password', [AccountController::class, 'updatePassword'])->name('api.v1.account.password');

        Route::prefix('account/delegates')->group(function (): void {
            Route::get('/', [AccountDelegateController::class, 'index'])->name('api.v1.account.delegates.index');
            Route::post('/', [AccountDelegateController::class, 'store'])->name('api.v1.account.delegates.store');
            Route::patch('{delegate}', [AccountDelegateController::class, 'update'])->name('api.v1.account.delegates.update');
            Route::patch('{delegateId}/password', [AccountDelegateController::class, 'resetPassword'])
                ->middleware('throttle:5,1') // 5 attempts per minute for password resets
                ->name('api.v1.account.delegates.reset-password');
            Route::delete('{delegate}', [AccountDelegateController::class, 'destroy'])->name('api.v1.account.delegates.destroy');
        });

        Route::get('settings/billing', [BillingSettingsController::class, 'show'])
            ->name('api.v1.settings.billing');

        // NOTE: OPTIONS routes for settings/system are defined OUTSIDE this auth middleware group
        // (see lines 236-262) to allow preflight requests without authentication
        // ForceCors middleware (prepended to API group) handles CORS, no need for EnsureCorsHeaders
        
        Route::prefix('settings/system')->group(function (): void {
            // Simple test route to verify middleware stack works
            Route::get('/test-simple', function (Request $request) {
                \Illuminate\Support\Facades\Log::info('Test simple route called');
                $origin = $request->headers->get('Origin', '*');
                return response()->json([
                    'status' => 'ok',
                    'message' => 'Simple test route works',
                    'user' => $request->user() ? $request->user()->email : 'not authenticated',
                ])->withHeaders([
                    'Access-Control-Allow-Origin' => $origin,
                    'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, Accept',
                    'Access-Control-Allow-Credentials' => 'true',
                ]);
            })->name('api.v1.settings.system.test-simple');
            
            Route::get('/', [SystemSettingsController::class, 'show'])
                ->name('api.v1.settings.system.show');
            Route::patch('/', [SystemSettingsController::class, 'update'])
                ->name('api.v1.settings.system.update');
            Route::get('/company', [SystemSettingsController::class, 'getCompany'])
                ->name('api.v1.settings.system.company.show');
            Route::patch('/company', [SystemSettingsController::class, 'updateCompany'])
                ->name('api.v1.settings.system.company.update');
            Route::get('/currency', [SystemSettingsController::class, 'getCurrency'])
                ->name('api.v1.settings.system.currency.show');
            Route::patch('/currency', [SystemSettingsController::class, 'updateCurrency'])
                ->name('api.v1.settings.system.currency.update');
            Route::get('/invoice-numbering', [SystemSettingsController::class, 'getInvoiceNumbering'])
                ->name('api.v1.settings.system.invoice-numbering.show');
            Route::patch('/invoice-numbering', [SystemSettingsController::class, 'updateInvoiceNumbering'])
                ->name('api.v1.settings.system.invoice-numbering.update');
            Route::get('/payment-terms', [SystemSettingsController::class, 'getPaymentTerms'])
                ->name('api.v1.settings.system.payment-terms.show');
            Route::patch('/payment-terms', [SystemSettingsController::class, 'updatePaymentTerms'])
                ->name('api.v1.settings.system.payment-terms.update');
            Route::get('/system-preferences', [SystemSettingsController::class, 'getSystemPreferences'])
                ->name('api.v1.settings.system.system-preferences.show');
            Route::patch('/system-preferences', [SystemSettingsController::class, 'updateSystemPreferences'])
                ->name('api.v1.settings.system.system-preferences.update');
            Route::get('/documents', [SystemSettingsController::class, 'getDocumentSettings'])
                ->name('api.v1.settings.system.documents.show');
            Route::patch('/documents', [SystemSettingsController::class, 'updateDocumentSettings'])
                ->name('api.v1.settings.system.documents.update');
            Route::get('/tax', [SystemSettingsController::class, 'getTaxSettings'])
                ->name('api.v1.settings.system.tax.show');
            Route::patch('/tax', [SystemSettingsController::class, 'updateTaxSettings'])
                ->name('api.v1.settings.system.tax.update');
            Route::get('/email', [SystemSettingsController::class, 'getEmailSettings'])
                ->name('api.v1.settings.system.email.show');
            Route::patch('/email', [SystemSettingsController::class, 'updateEmailSettings'])
                ->name('api.v1.settings.system.email.update');
            Route::post('/email/test', [SystemSettingsController::class, 'testEmailConnection'])
                ->name('api.v1.settings.system.email.test');
            Route::get('/sms', [SystemSettingsController::class, 'getSmsSettings'])
                ->name('api.v1.settings.system.sms.show');
            Route::patch('/sms', [SystemSettingsController::class, 'updateSmsSettings'])
                ->name('api.v1.settings.system.sms.update');
            Route::post('/sms/test', [SystemSettingsController::class, 'testSmsConnection'])
                ->name('api.v1.settings.system.sms.test');
            Route::get('/telegram', [SystemSettingsController::class, 'getTelegramSettings'])
                ->name('api.v1.settings.system.telegram.show');
            Route::patch('/telegram', [SystemSettingsController::class, 'updateTelegramSettings'])
                ->name('api.v1.settings.system.telegram.update');
            Route::post('/telegram/test', [SystemSettingsController::class, 'testTelegramConnection'])
                ->name('api.v1.settings.system.telegram.test');
            Route::get('/auto-invoice', [SystemSettingsController::class, 'getAutoInvoiceSettings'])
                ->name('api.v1.settings.system.auto-invoice.show');
            Route::patch('/auto-invoice', [SystemSettingsController::class, 'updateAutoInvoiceSettings'])
                ->name('api.v1.settings.system.auto-invoice.update');
        });

        Route::apiResource('email-templates', EmailTemplateController::class)
            ->parameters(['email-templates' => 'emailTemplate'])
            ->names('api.v1.email-templates');
        Route::post('email-templates/{emailTemplate}/set-default', [EmailTemplateController::class, 'setDefault'])
            ->name('api.v1.email-templates.set-default');
        Route::post('email-templates/{emailTemplate}/preview', [EmailTemplateController::class, 'preview'])
            ->name('api.v1.email-templates.preview');

        Route::apiResource('sms-templates', SmsTemplateController::class)
            ->parameters(['sms-templates' => 'smsTemplate'])
            ->names('api.v1.sms-templates');
        Route::post('sms-templates/{smsTemplate}/set-default', [SmsTemplateController::class, 'setDefault'])
            ->name('api.v1.sms-templates.set-default');
        Route::post('sms-templates/{smsTemplate}/preview', [SmsTemplateController::class, 'preview'])
            ->name('api.v1.sms-templates.preview');

        Route::apiResource('document-templates', DocumentTemplateController::class)
            ->parameters(['document-templates' => 'documentTemplate'])
            ->names('api.v1.document-templates');
        Route::post('document-templates/{documentTemplate}/set-default', [DocumentTemplateController::class, 'setDefault'])
            ->name('api.v1.document-templates.set-default');
        Route::post('document-templates/{documentTemplate}/preview', [DocumentTemplateController::class, 'preview'])
            ->name('api.v1.document-templates.preview');

        // Mobile API routes - optimized endpoints for mobile app
        Route::prefix('mobile')->group(function (): void {
            Route::get('properties', [MobilePropertyController::class, 'index'])
                ->name('api.v1.mobile.properties.index');
            Route::get('units', [MobileUnitController::class, 'index'])
                ->name('api.v1.mobile.units.index');
            Route::get('units/{unit}', [MobileUnitController::class, 'show'])
                ->name('api.v1.mobile.units.show');
            Route::get('units/{unit}/invoices', [MobileUnitController::class, 'invoices'])
                ->name('api.v1.mobile.units.invoices');
            Route::post('payments', [MobilePaymentController::class, 'store'])
                ->name('api.v1.mobile.payments.store');
        });

        // Admin routes - only accessible to super_admin users
        // Must be authenticated first, then controller middleware checks for super_admin
        // Rate limiting applied individually to prevent abuse while allowing password resets
        Route::middleware(['auth:sanctum'])->prefix('admin')->group(function (): void {
            Route::get('landlords', [AdminLandlordController::class, 'index'])
                ->middleware('throttle:120,1') // Higher limit for listing
                ->name('api.v1.admin.landlords.index');
            Route::get('landlords/{landlord}', [AdminLandlordController::class, 'show'])
                ->middleware('throttle:60,1')
                ->name('api.v1.admin.landlords.show');
            Route::get('owners', [AdminLandlordController::class, 'owners'])
                ->middleware('throttle:120,1') // Higher limit for listing
                ->name('api.v1.admin.owners.index');
            Route::patch('owners/{owner}', [AdminLandlordController::class, 'updateOwner'])
                ->middleware('throttle:30,1') // Lower limit for modifications
                ->name('api.v1.admin.owners.update');
            Route::patch('owners/{ownerId}/password', [AdminLandlordController::class, 'resetOwnerPassword'])
                // No throttle for super admins - they need to reset passwords frequently
                ->name('api.v1.admin.owners.reset-password');
            Route::patch('landlords/{landlord}/subscription', [AdminLandlordController::class, 'updateSubscription'])
                ->middleware('throttle:30,1') // Lower limit for modifications
                ->name('api.v1.admin.landlords.subscription.update');
            Route::post('landlords/{landlord}/subscription/extend', [AdminLandlordController::class, 'extendSubscription'])
                ->middleware('throttle:30,1')
                ->name('api.v1.admin.landlords.subscription.extend');
            Route::post('landlords/{landlord}/subscription/suspend', [AdminLandlordController::class, 'suspendSubscription'])
                ->middleware('throttle:20,1') // Very low limit for destructive actions
                ->name('api.v1.admin.landlords.subscription.suspend');
            Route::post('landlords/{landlord}/subscription/activate', [AdminLandlordController::class, 'activateSubscription'])
                ->middleware('throttle:30,1')
                ->name('api.v1.admin.landlords.subscription.activate');
            
            // Pending signups management
            Route::get('signups', [AdminSignupController::class, 'index'])
                ->middleware('throttle:120,1')
                ->name('api.v1.admin.signups.index');
            Route::post('signups/{user}/approve', [AdminSignupController::class, 'approve'])
                ->middleware('throttle:30,1')
                ->name('api.v1.admin.signups.approve');
            Route::post('signups/{user}/reject', [AdminSignupController::class, 'reject'])
                ->middleware('throttle:30,1')
                ->name('api.v1.admin.signups.reject');
            
            // Subscription limits management
            Route::get('subscription-limits', [SubscriptionLimitsController::class, 'index'])
                ->middleware('throttle:120,1')
                ->name('api.v1.admin.subscription-limits.index');
            Route::put('subscription-limits/{tier}', [SubscriptionLimitsController::class, 'update'])
                ->middleware('throttle:20,1') // Very low limit for critical configuration changes
                ->name('api.v1.admin.subscription-limits.update');
            
            // User management and permissions
            Route::get('users', [UserManagementController::class, 'index'])
                ->middleware('throttle:120,1')
                ->name('api.v1.admin.users.index');
            Route::get('users/{user}/permissions', [UserManagementController::class, 'getUserPermissions'])
                ->middleware('throttle:60,1')
                ->name('api.v1.admin.users.permissions');
            Route::put('users/{user}/role', [UserManagementController::class, 'updateRole'])
                ->middleware('throttle:30,1')
                ->name('api.v1.admin.users.role.update');
            Route::get('permissions/matrix', [UserManagementController::class, 'getPermissionMatrix'])
                ->middleware('throttle:60,1')
                ->name('api.v1.admin.permissions.matrix');
            Route::get('permissions/resources', [UserManagementController::class, 'getResources'])
                ->middleware('throttle:60,1')
                ->name('api.v1.admin.permissions.resources');
            
            // User login logs
            Route::get('user-login-logs', [UserLoginLogController::class, 'index'])
                ->middleware('throttle:120,1')
                ->name('api.v1.admin.user-login-logs.index');
            Route::get('user-login-logs/statistics', [UserLoginLogController::class, 'statistics'])
                ->middleware('throttle:60,1')
                ->name('api.v1.admin.user-login-logs.statistics');
        });
    });
});