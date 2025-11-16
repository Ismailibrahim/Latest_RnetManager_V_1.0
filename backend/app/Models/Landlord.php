<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Landlord extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_name',
        'subscription_tier',
    ];

    public const TIER_BASIC = 'basic';
    public const TIER_PRO = 'pro';
    public const TIER_ENTERPRISE = 'enterprise';

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }

    public function units(): HasMany
    {
        return $this->hasMany(Unit::class);
    }

    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class);
    }

    public function tenantUnits(): HasMany
    {
        return $this->hasMany(TenantUnit::class);
    }

    public function financialRecords(): HasMany
    {
        return $this->hasMany(FinancialRecord::class);
    }

    public function maintenanceRequests(): HasMany
    {
        return $this->hasMany(MaintenanceRequest::class);
    }

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function subscriptionInvoices(): HasMany
    {
        return $this->hasMany(SubscriptionInvoice::class);
    }

    public function subscriptionLimit(): BelongsTo
    {
        return $this->belongsTo(SubscriptionLimit::class, 'subscription_tier', 'tier');
    }

    public function settings(): HasOne
    {
        return $this->hasOne(LandlordSetting::class);
    }
}

