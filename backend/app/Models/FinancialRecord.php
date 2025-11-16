<?php

namespace App\Models;

use App\Services\NumberGeneratorService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinancialRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'landlord_id',
        'tenant_unit_id',
        'type',
        'category',
        'amount',
        'description',
        'due_date',
        'paid_date',
        'transaction_date',
        'invoice_number',
        'payment_method',
        'reference_number',
        'parent_id',
        'is_installment',
        'installment_number',
        'total_installments',
        'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_date' => 'date',
        'paid_date' => 'date',
        'transaction_date' => 'date',
        'is_installment' => 'boolean',
    ];

    /**
     * Boot the model.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (FinancialRecord $record) {
            // Auto-generate invoice_number if not provided and type requires it
            // Only generate for certain types that typically need invoice numbers
            $typesThatNeedInvoice = ['fee', 'expense'];
            
            if (
                empty($record->invoice_number) 
                && $record->landlord_id 
                && in_array($record->type, $typesThatNeedInvoice, true)
            ) {
                $record->invoice_number = app(NumberGeneratorService::class)
                    ->generateFinancialRecordInvoiceNumber($record->landlord_id);
            }
        });
    }

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(Landlord::class);
    }

    public function tenantUnit(): BelongsTo
    {
        return $this->belongsTo(TenantUnit::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function installments(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }
}

