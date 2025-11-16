<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Asset extends Model
{
    use HasFactory;

    protected $fillable = [
        'asset_type_id',
        'unit_id',
        'ownership',
        'tenant_id',
        'name',
        'brand',
        'model',
        'location',
        'installation_date',
        'status',
    ];

    protected $casts = [
        'installation_date' => 'date',
    ];

    public function assetType(): BelongsTo
    {
        return $this->belongsTo(AssetType::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}

