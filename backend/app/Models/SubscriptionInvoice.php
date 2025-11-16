<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionInvoice extends Model
{
    use HasFactory;

    /**
     * Mass assignable attributes.
     *
     * @var list<string>
     */
    protected $fillable = [
        'landlord_id',
        'invoice_number',
        'period_start',
        'period_end',
        'issued_at',
        'due_at',
        'paid_at',
        'amount',
        'currency',
        'status',
        'download_url',
        'metadata',
    ];

    /**
     * Attribute casting.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'issued_at' => 'datetime',
            'due_at' => 'datetime',
            'paid_at' => 'datetime',
            'amount' => 'decimal:2',
            'metadata' => 'array',
        ];
    }

    /**
     * Boot the model.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (SubscriptionInvoice $invoice) {
            if (empty($invoice->invoice_number) && $invoice->landlord_id) {
                $invoice->invoice_number = app(\App\Services\NumberGeneratorService::class)
                    ->generateSubscriptionInvoiceNumber($invoice->landlord_id);
            }
        });
    }

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(Landlord::class);
    }

    public function getIsPaidAttribute(): bool
    {
        return $this->status === 'paid';
    }
}


