<?php

namespace App\Models;

use App\Models\Concerns\BelongsToLandlord;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;

class Unit extends Model
{
    use HasFactory;
    use BelongsToLandlord;

    protected $fillable = [
        'property_id',
        'landlord_id',
        'unit_type_id',
        'unit_number',
        'rent_amount',
        'security_deposit',
        'is_occupied',
    ];

    protected $casts = [
        'rent_amount' => 'decimal:2',
        'security_deposit' => 'decimal:2',
        'is_occupied' => 'boolean',
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::addGlobalScope('landlord', function ($query) {
            $landlordId = Auth::user()?->landlord_id;
            if ($landlordId !== null) {
                $query->where('landlord_id', $landlordId);
            }
        });
    }

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(Landlord::class);
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function unitType(): BelongsTo
    {
        return $this->belongsTo(UnitType::class);
    }

    public function tenantUnits(): HasMany
    {
        return $this->hasMany(TenantUnit::class);
    }

    public function maintenanceRequests(): HasMany
    {
        return $this->hasMany(MaintenanceRequest::class);
    }

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }
}

