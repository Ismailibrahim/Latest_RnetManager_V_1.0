<?php

namespace App\Models;

use App\Helpers\PaymentMethodNormalizer;
use App\Models\Concerns\BelongsToLandlord;
use App\Services\NumberGeneratorService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

class RentInvoice extends Model
{
    use HasFactory;
    use BelongsToLandlord;

    protected $fillable = [
        'tenant_unit_id',
        'landlord_id',
        'invoice_number',
        'invoice_date',
        'due_date',
        'rent_amount',
        'late_fee',
        'advance_rent_applied',
        'is_advance_covered',
        'status',
        'paid_date',
        'payment_method',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'rent_amount' => 'decimal:2',
        'late_fee' => 'decimal:2',
        'advance_rent_applied' => 'decimal:2',
        'is_advance_covered' => 'boolean',
        'paid_date' => 'date',
    ];

    /**
     * Normalize payment method to ENUM value when setting.
     * Rent invoices table has payment_method as ENUM: 'cash', 'bank_transfer', 'upi', 'card', 'cheque'
     */
    public function setPaymentMethodAttribute(?string $value): void
    {
        $this->attributes['payment_method'] = $value ? PaymentMethodNormalizer::normalize($value) : null;
    }

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

    public function tenantUnit(): BelongsTo
    {
        return $this->belongsTo(TenantUnit::class);
    }

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(Landlord::class);
    }
}

