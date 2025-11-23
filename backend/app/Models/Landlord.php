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
        'subscription_started_at',
        'subscription_expires_at',
        'subscription_status',
        'subscription_auto_renew',
    ];

    public const TIER_BASIC = 'basic';
    public const TIER_PRO = 'pro';
    public const TIER_ENTERPRISE = 'enterprise';

    public const STATUS_ACTIVE = 'active';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_CANCELLED = 'cancelled';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'subscription_started_at' => 'date',
            'subscription_expires_at' => 'date',
            'subscription_auto_renew' => 'boolean',
        ];
    }

    /**
     * Check if subscription is currently active.
     */
    public function isSubscriptionActive(): bool
    {
        if ($this->subscription_status !== self::STATUS_ACTIVE) {
            return false;
        }

        // Basic tier never expires
        if ($this->subscription_tier === self::TIER_BASIC) {
            return true;
        }

        // Check if expired
        if ($this->subscription_expires_at && $this->subscription_expires_at->isPast()) {
            return false;
        }

        return true;
    }

    /**
     * Check if subscription is expired.
     */
    public function isExpired(): bool
    {
        if ($this->subscription_status === self::STATUS_EXPIRED) {
            return true;
        }

        // Basic tier never expires
        if ($this->subscription_tier === self::TIER_BASIC) {
            return false;
        }

        // Check if expiry date has passed
        if ($this->subscription_expires_at && $this->subscription_expires_at->isPast()) {
            return true;
        }

        return false;
    }

    /**
     * Get days until expiry (negative if expired).
     */
    public function daysUntilExpiry(): ?int
    {
        if ($this->subscription_tier === self::TIER_BASIC || !$this->subscription_expires_at) {
            return null; // Never expires
        }

        return now()->diffInDays($this->subscription_expires_at, false);
    }

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

