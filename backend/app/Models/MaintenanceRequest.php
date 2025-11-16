<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceRequest extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'unit_id',
        'landlord_id',
        'description',
        'cost',
        'asset_id',
        'location',
        'serviced_by',
        'invoice_number',
        'is_billable',
        'billed_to_tenant',
        'tenant_share',
        'type',
        'maintenance_date',
    ];

    protected $casts = [
        'cost' => 'decimal:2',
        'tenant_share' => 'decimal:2',
        'is_billable' => 'boolean',
        'billed_to_tenant' => 'boolean',
        'maintenance_date' => 'date',
        'created_at' => 'datetime',
    ];

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(Landlord::class);
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }
}

