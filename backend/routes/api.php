<?php

use App\Http\Controllers\Api\V1\AccountController;
use App\Http\Controllers\Api\V1\AccountDelegateController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\PaymentMethodController;
use App\Http\Controllers\Api\V1\BillingSettingsController;
use App\Http\Controllers\Api\V1\PropertyController;
use App\Http\Controllers\Api\V1\SystemSettingsController;
use App\Http\Controllers\Api\V1\TenantController;
use App\Http\Controllers\Api\V1\TenantUnitController;
use App\Http\Controllers\Api\V1\TenantUnitPendingChargeController;
use App\Http\Controllers\Api\V1\UnitController;
use App\Http\Controllers\Api\V1\FinancialRecordController;
use App\Http\Controllers\Api\V1\RentInvoiceController;
use App\Http\Controllers\Api\V1\MaintenanceInvoiceController;
use App\Http\Controllers\Api\V1\MaintenanceRequestController;
use App\Http\Controllers\Api\V1\NationalityController;
use App\Http\Controllers\Api\V1\AssetController;
use App\Http\Controllers\Api\V1\AssetTypeController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\SecurityDepositRefundController;
use App\Http\Controllers\Api\V1\UnifiedPaymentController;
use App\Http\Controllers\Api\V1\UnitTypeController;
use App\Http\Controllers\Api\V1\TenantDocumentController;
use App\Http\Controllers\Api\V1\UnitOccupancyHistoryController;
use App\Http\Controllers\Api\V1\EmailTemplateController;
use App\Http\Controllers\Api\V1\SmsTemplateController;
use App\Http\Controllers\Api\V1\LandlordController;
use App\Http\Controllers\Api\V1\VendorController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/', function () {
        return response()->json([
            'status' => 'ok',
            'message' => 'RentApplicaiton API v1 online',
        ]);
    });

    // Health check endpoints
    // Keep basic health public with moderate throttling
    Route::get('/health', [\App\Http\Controllers\Api\V1\HealthController::class, 'check'])
        ->middleware('throttle:30,1')
        ->name('api.v1.health');
    // Protect detailed diagnostics and crash summaries
    Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function (): void {
        Route::get('/health/diagnostics', [\App\Http\Controllers\Api\V1\HealthController::class, 'diagnostics'])
            ->name('api.v1.health.diagnostics');
        Route::get('/health/crashes', [\App\Http\Controllers\Api\V1\HealthController::class, 'crashSummary'])
            ->name('api.v1.health.crashes');
    });

    Route::prefix('auth')->group(function (): void {
        // Apply strict throttling to login to limit brute force
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');

        Route::middleware('auth:sanctum')->group(function (): void {
            Route::get('me', [AuthController::class, 'me']);
            Route::post('logout', [AuthController::class, 'logout']);
        });
    });

    // Default throttling for authenticated API usage
    Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function (): void {
        Route::apiResource('landlords', LandlordController::class)->only(['store'])->names('api.v1.landlords');
        Route::apiResource('properties', PropertyController::class)->names('api.v1.properties');
        // Place specific routes before resource route to avoid route conflicts
        // Heavier endpoints get stricter throttling
        Route::post('units/bulk-import', [UnitController::class, 'bulkImport'])->middleware('throttle:6,1')
            ->name('api.v1.units.bulk-import');
        Route::get('units/import-template', [UnitController::class, 'downloadTemplate'])
            ->name('api.v1.units.import-template');
        Route::apiResource('units', UnitController::class)->names('api.v1.units');
        // Place specific routes before resource route to avoid route conflicts
        Route::post('tenants/bulk-import', [TenantController::class, 'bulkImport'])->middleware('throttle:6,1')
            ->name('api.v1.tenants.bulk-import');
        Route::get('tenants/import-template', [TenantController::class, 'downloadTemplate'])
            ->name('api.v1.tenants.import-template');
        Route::apiResource('tenants', TenantController::class)->names('api.v1.tenants');
        Route::post('tenant-units/{tenant_unit}/end-lease', [TenantUnitController::class, 'endLease'])
            ->name('api.v1.tenant-units.end-lease');
        Route::apiResource('tenant-units', TenantUnitController::class)->parameters([
            'tenant-units' => 'tenant_unit',
        ])->names('api.v1.tenant-units');
        Route::get('tenant-units/{tenant_unit}/pending-charges', TenantUnitPendingChargeController::class)
            ->name('api.v1.tenant-units.pending-charges');
        Route::apiResource('financial-records', FinancialRecordController::class)->parameters([
            'financial-records' => 'financial_record',
        ])->names('api.v1.financial-records');
        Route::apiResource('rent-invoices', RentInvoiceController::class)->parameters([
            'rent-invoices' => 'rent_invoice',
        ])->names('api.v1.rent-invoices');
        Route::get('rent-invoices/{rent_invoice}/export', [RentInvoiceController::class, 'export'])
            ->name('api.v1.rent-invoices.export');
        Route::apiResource('maintenance-requests', MaintenanceRequestController::class)->parameters([
            'maintenance-requests' => 'maintenance_request',
        ])->names('api.v1.maintenance-requests');
        Route::apiResource('maintenance-invoices', MaintenanceInvoiceController::class)->parameters([
            'maintenance-invoices' => 'maintenance_invoice',
        ])->names('api.v1.maintenance-invoices');
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
    });
});

