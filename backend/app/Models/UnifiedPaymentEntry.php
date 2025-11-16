<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class UnifiedPaymentEntry extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'landlord_id',
        'tenant_unit_id',
        'payment_type',
        'flow_direction',
        'amount',
        'currency',
        'description',
        'due_date',
        'transaction_date',
        'status',
        'payment_method',
        'reference_number',
        'source_type',
        'source_id',
        'metadata',
        'created_by',
        'captured_at',
        'voided_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'metadata' => 'array',
        'due_date' => 'date',
        'transaction_date' => 'date',
        'captured_at' => 'datetime',
        'voided_at' => 'datetime',
    ];

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(Landlord::class);
    }

    public function tenantUnit(): BelongsTo
    {
        return $this->belongsTo(TenantUnit::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}


