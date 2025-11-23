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
use App\Http\Controllers\Api\V1\MaintenanceInvoiceController;
use App\Http\Controllers\Api\V1\MaintenanceRequestController;
use App\Http\Controllers\Api\V1\NationalityController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\CurrencyController;
use App\Http\Controllers\Api\V1\PaymentMethodController;
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
    
    Route::get('/', function () {
        return response()->json([
            'status' => 'ok',
            'message' => 'RentApplicaiton API v1 online',
        ]);
    });

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
        Route::post('login', [AuthController::class, 'login'])
            ->middleware('throttle:10,1')
            ->name('api.v1.auth.login');

        Route::middleware('auth:sanctum')->group(function (): void {
            Route::get('me', [AuthController::class, 'me']);
            Route::post('logout', [AuthController::class, 'logout']);
        });
    });

    Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function (): void {
        Route::apiResource('landlords', LandlordController::class)->only(['store'])->names('api.v1.landlords');
        Route::apiResource('properties', PropertyController::class)->names('api.v1.properties');

        Route::post('units/bulk-import', [UnitController::class, 'bulkImport'])->middleware('throttle:6,1')
            ->name('api.v1.units.bulk-import');
        Route::get('units/import-template', [UnitController::class, 'downloadTemplate'])
            ->name('api.v1.units.import-template');
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
        
        // Debug route to check maintenance invoice payment linking
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

        Route::get('account', [AccountController::class, 'show'])->name('api.v1.account.show');
        Route::patch('account', [AccountController::class, 'update'])->name('api.v1.account.update');
        Route::patch('account/password', [AccountController::class, 'updatePassword'])->name('api.v1.account.password');

        Route::prefix('account/delegates')->group(function (): void {
            Route::get('/', [AccountDelegateController::class, 'index'])->name('api.v1.account.delegates.index');
            Route::post('/', [AccountDelegateController::class, 'store'])->name('api.v1.account.delegates.store');
            Route::patch('{delegate}', [AccountDelegateController::class, 'update'])->name('api.v1.account.delegates.update');
            Route::delete('{delegate}', [AccountDelegateController::class, 'destroy'])->name('api.v1.account.delegates.destroy');
        });

        Route::get('settings/billing', [BillingSettingsController::class, 'show'])
            ->name('api.v1.settings.billing');

        Route::prefix('settings/system')->group(function (): void {
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
        Route::prefix('admin')->group(function (): void {
            Route::get('landlords', [AdminLandlordController::class, 'index'])
                ->name('api.v1.admin.landlords.index');
            Route::get('landlords/{landlord}', [AdminLandlordController::class, 'show'])
                ->name('api.v1.admin.landlords.show');
            Route::patch('landlords/{landlord}/subscription', [AdminLandlordController::class, 'updateSubscription'])
                ->name('api.v1.admin.landlords.subscription.update');
            Route::post('landlords/{landlord}/subscription/extend', [AdminLandlordController::class, 'extendSubscription'])
                ->name('api.v1.admin.landlords.subscription.extend');
            Route::post('landlords/{landlord}/subscription/suspend', [AdminLandlordController::class, 'suspendSubscription'])
                ->name('api.v1.admin.landlords.subscription.suspend');
            Route::post('landlords/{landlord}/subscription/activate', [AdminLandlordController::class, 'activateSubscription'])
                ->name('api.v1.admin.landlords.subscription.activate');
        });
    });
});