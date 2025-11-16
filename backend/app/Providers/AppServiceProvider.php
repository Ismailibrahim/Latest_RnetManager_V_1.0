<?php

namespace App\Providers;

use App\Models\Asset;
use App\Models\AssetType;
use App\Models\FinancialRecord;
use App\Models\MaintenanceInvoice;
use App\Models\MaintenanceRequest;
use App\Models\Notification;
use App\Models\Nationality;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\RentInvoice;
use App\Models\SecurityDepositRefund;
use App\Models\Tenant;
use App\Models\TenantUnit;
use App\Models\Unit;
use App\Models\UnitOccupancyHistory;
use App\Models\UnifiedPayment;
use App\Models\LandlordSetting;
use App\Policies\AssetPolicy;
use App\Policies\AssetTypePolicy;
use App\Policies\FinancialRecordPolicy;
use App\Policies\MaintenanceInvoicePolicy;
use App\Policies\MaintenanceRequestPolicy;
use App\Policies\NotificationPolicy;
use App\Policies\NationalityPolicy;
use App\Policies\PaymentMethodPolicy;
use App\Policies\PropertyPolicy;
use App\Policies\RentInvoicePolicy;
use App\Policies\SecurityDepositRefundPolicy;
use App\Policies\TenantPolicy;
use App\Policies\TenantUnitPolicy;
use App\Policies\UnitPolicy;
use App\Policies\UnitOccupancyHistoryPolicy;
use App\Policies\UnifiedPaymentPolicy;
use App\Policies\SystemSettingsPolicy;
use App\Support\Diagnostics\SystemProbe;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        SystemProbe::register();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Property::class, PropertyPolicy::class);
        Gate::policy(Unit::class, UnitPolicy::class);
        Gate::policy(Tenant::class, TenantPolicy::class);
        Gate::policy(TenantUnit::class, TenantUnitPolicy::class);
        Gate::policy(MaintenanceRequest::class, MaintenanceRequestPolicy::class);
        Gate::policy(Asset::class, AssetPolicy::class);
        Gate::policy(Notification::class, NotificationPolicy::class);
        Gate::policy(AssetType::class, AssetTypePolicy::class);
        Gate::policy(FinancialRecord::class, FinancialRecordPolicy::class);
        Gate::policy(RentInvoice::class, RentInvoicePolicy::class);
        Gate::policy(MaintenanceInvoice::class, MaintenanceInvoicePolicy::class);
        Gate::policy(SecurityDepositRefund::class, SecurityDepositRefundPolicy::class);
        Gate::policy(UnitOccupancyHistory::class, UnitOccupancyHistoryPolicy::class);
        Gate::policy(UnifiedPayment::class, UnifiedPaymentPolicy::class);
        Gate::policy(PaymentMethod::class, PaymentMethodPolicy::class);
        Gate::policy(Nationality::class, NationalityPolicy::class);
        Gate::policy(LandlordSetting::class, SystemSettingsPolicy::class);
    }
}
