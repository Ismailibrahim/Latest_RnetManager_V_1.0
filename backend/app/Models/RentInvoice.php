<?php

namespace App\Models;

use App\Services\NumberGeneratorService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RentInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_unit_id',
        'landlord_id',
        'invoice_number',
        'invoice_date',
        'due_date',
        'rent_amount',
        'late_fee',
        'status',
        'paid_date',
        'payment_method',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'rent_amount' => 'decimal:2',
        'late_fee' => 'decimal:2',
        'paid_date' => 'date',
    ];

    /**
     * Boot the model.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (RentInvoice $invoice) {
            if (empty($invoice->invoice_number) && $invoice->landlord_id) {
                $invoice->invoice_number = app(NumberGeneratorService::class)
                    ->generateRentInvoiceNumber($invoice->landlord_id);
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

