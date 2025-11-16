<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UnitOccupancyHistory extends Model
{
    use HasFactory;

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

