<?php

namespace App\Models;

use App\Services\NumberGeneratorService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_unit_id',
        'landlord_id',
        'maintenance_request_id',
        'invoice_number',
        'invoice_date',
        'due_date',
        'status',
        'labor_cost',
        'parts_cost',
        'tax_amount',
        'misc_amount',
        'discount_amount',
        'grand_total',
        'line_items',
        'notes',
        'paid_date',
        'payment_method',
        'reference_number',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'paid_date' => 'date',
        'line_items' => 'array',
        'labor_cost' => 'decimal:2',
        'parts_cost' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'misc_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'grand_total' => 'decimal:2',
    ];

    /**
     * Boot the model.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (MaintenanceInvoice $invoice) {
            if (empty($invoice->invoice_number) && $invoice->landlord_id) {
                $invoice->invoice_number = app(NumberGeneratorService::class)
                    ->generateMaintenanceInvoiceNumber($invoice->landlord_id);
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

    public function maintenanceRequest(): BelongsTo
    {
        return $this->belongsTo(MaintenanceRequest::class);
    }
}

