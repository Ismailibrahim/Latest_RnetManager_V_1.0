<?php

namespace App\Models;

use App\Services\NumberGeneratorService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecurityDepositRefund extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_unit_id',
        'landlord_id',
        'refund_number',
        'refund_date',
        'original_deposit',
        'deductions',
        'refund_amount',
        'deduction_reasons',
        'status',
        'payment_method',
        'transaction_reference',
        'receipt_generated',
        'receipt_number',
    ];

    protected $casts = [
        'refund_date' => 'date',
        'original_deposit' => 'decimal:2',
        'deductions' => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'deduction_reasons' => 'array',
        'receipt_generated' => 'boolean',
    ];

    /**
     * Boot the model.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (SecurityDepositRefund $refund) {
            // Auto-generate refund_number if not provided
            if (empty($refund->refund_number) && $refund->landlord_id) {
                $refund->refund_number = app(NumberGeneratorService::class)
                    ->generateSecurityDepositRefundNumber($refund->landlord_id);
            }
        });

        static::updating(function (SecurityDepositRefund $refund) {
            // Auto-generate receipt_number when receipt is generated
            if ($refund->receipt_generated && empty($refund->receipt_number) && $refund->landlord_id) {
                $refund->receipt_number = app(NumberGeneratorService::class)
                    ->generateReceiptNumber($refund->landlord_id);
            }
        });
    }

    public function tenantUnit(): BelongsTo
    {
        return $this->belongsTo(TenantUnit::class);
    }

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(Landlord::class);
    }
}

