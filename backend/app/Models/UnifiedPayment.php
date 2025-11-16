<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $composite_id
 * @property int $landlord_id
 * @property int|null $tenant_unit_id
 * @property string $payment_type
 * @property string $flow_direction
 * @property string $status
 * @property string|null $transaction_date
 */
class UnifiedPayment extends Model
{
    protected $table = 'unified_payments';

    public $timestamps = false;

    public $incrementing = false;

    protected $primaryKey = 'composite_id';

    protected $keyType = 'string';

    protected $guarded = [];

    protected $casts = [
        'amount' => 'float',
        'transaction_date' => 'date',
        'due_date' => 'date',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'captured_at' => 'datetime',
        'voided_at' => 'datetime',
    ];

    public function getRouteKeyName(): string
    {
        return 'composite_id';
    }

    public function scopeForLandlord(Builder $query, int $landlordId): Builder
    {
        return $query->where('landlord_id', $landlordId);
    }

    public function tenantUnit(): BelongsTo
    {
        return $this->belongsTo(TenantUnit::class);
    }
}

