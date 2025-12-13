<?php

namespace App\Models;

use App\Models\Concerns\BelongsToLandlord;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantPaymentSubmission extends Model
{
    use HasFactory;
    use BelongsToLandlord;

    protected $fillable = [
        'tenant_unit_id',
        'rent_invoice_id',
        'landlord_id',
        'payment_amount',
        'payment_date',
        'payment_method',
        'receipt_path',
        'status',
        'confirmed_by',
        'confirmed_at',
        'notes',
    ];

    protected $casts = [
        'payment_amount' => 'decimal:2',
        'payment_date' => 'date',
        'confirmed_at' => 'datetime',
    ];

    public function tenantUnit(): BelongsTo
    {
        return $this->belongsTo(TenantUnit::class);
    }

    public function rentInvoice(): BelongsTo
    {
        return $this->belongsTo(RentInvoice::class);
    }

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(Landlord::class);
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
