<?php

namespace App\Models;

use App\Models\Concerns\BelongsToLandlord;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

class UnitOccupancyHistory extends Model
{
    use HasFactory;
    use BelongsToLandlord;

    protected $table = 'unit_occupancy_history';

    public $timestamps = false;

    protected $fillable = [
        'unit_id',
        'tenant_id',
        'tenant_unit_id',
        'action',
        'action_date',
        'rent_amount',
        'security_deposit_amount',
        'lease_start_date',
        'lease_end_date',
        'notes',
    ];

    protected $casts = [
        'action_date' => 'date',
        'lease_start_date' => 'date',
        'lease_end_date' => 'date',
        'rent_amount' => 'decimal:2',
        'security_deposit_amount' => 'decimal:2',
    ];

    /**
     * The "booted" method of the model.
     * UnitOccupancyHistory is filtered through unit's landlord_id.
     */
    protected static function booted(): void
    {
        static::addGlobalScope('landlord', function ($query) {
            $landlordId = Auth::user()?->landlord_id;
            if ($landlordId !== null) {
                $query->whereHas('unit', function ($q) use ($landlordId) {
                    $q->where('landlord_id', $landlordId);
                });
            }
        });
    }

    /**
     * Resolve the route binding value for the model.
     * UnitOccupancyHistory is filtered through unit's landlord_id.
     *
     * @param  mixed  $value
     * @param  string|null  $field
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function resolveRouteBinding($value, $field = null)
    {
        $landlordId = Auth::user()?->landlord_id;

        if ($landlordId === null) {
            return null;
        }

        $field = $field ?: $this->getRouteKeyName();

        // First check if the resource exists at all
        $model = $this->withoutGlobalScopes()
            ->where($field, $value)
            ->first();

        if (! $model) {
            return null; // Resource doesn't exist - return 404
        }

        // Load unit to check landlord_id
        $model->load('unit');

        // If resource exists but unit doesn't belong to landlord, still return it
        // so policy can handle authorization and return 403 instead of 404
        if (! $model->unit || $model->unit->landlord_id !== $landlordId) {
            return $model; // Return model so policy can check and return 403
        }

        return $model;
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function tenantUnit(): BelongsTo
    {
        return $this->belongsTo(TenantUnit::class);
    }
}

