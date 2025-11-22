<?php

namespace App\Models;

use App\Models\Concerns\BelongsToLandlord;
use App\Services\NumberGeneratorService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class MaintenanceInvoice extends Model
{
    use HasFactory;
    use BelongsToLandlord;

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

        // Create financial record when invoice is created
        static::created(function (MaintenanceInvoice $invoice) {
            $invoice->createFinancialRecord();
        });

        // Update financial record when invoice is updated (especially status changes)
        static::updated(function (MaintenanceInvoice $invoice) {
            $invoice->updateFinancialRecord();
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

    public function maintenanceRequest(): BelongsTo
    {
        return $this->belongsTo(MaintenanceRequest::class);
    }

    /**
     * Create a financial record for this maintenance invoice.
     */
    public function createFinancialRecord(): void
    {
        if (!$this->tenant_unit_id || !$this->landlord_id) {
            return; // Cannot create financial record without tenant unit
        }

        // Check if financial record already exists for this invoice
        $existingRecord = FinancialRecord::query()
            ->where('landlord_id', $this->landlord_id)
            ->where('tenant_unit_id', $this->tenant_unit_id)
            ->where('invoice_number', $this->invoice_number)
            ->where('type', 'fee')
            ->where('category', 'maintenance')
            ->first();

        if ($existingRecord) {
            return; // Financial record already exists
        }

        // Build description from invoice details
        $description = "Maintenance Invoice {$this->invoice_number}";
        
        // Load maintenance request if not already loaded
        if ($this->maintenance_request_id && !$this->relationLoaded('maintenanceRequest')) {
            $this->load('maintenanceRequest');
        }
        
        if ($this->maintenanceRequest) {
            $description .= " - {$this->maintenanceRequest->description}";
        } elseif ($this->notes) {
            $description .= " - " . substr($this->notes, 0, 200);
        }

        // Determine status based on invoice status
        $status = match ($this->status) {
            'paid' => 'completed',
            'cancelled' => 'cancelled',
            'overdue' => 'overdue',
            default => 'pending',
        };

        try {
            FinancialRecord::create([
                'landlord_id' => $this->landlord_id,
                'tenant_unit_id' => $this->tenant_unit_id,
                'type' => 'fee',
                'category' => 'maintenance',
                'amount' => $this->grand_total,
                'description' => $description,
                'due_date' => $this->due_date,
                'paid_date' => $this->paid_date,
                'transaction_date' => $this->invoice_date,
                'invoice_number' => $this->invoice_number,
                'payment_method' => $this->payment_method,
                'reference_number' => $this->reference_number,
                'status' => $status,
            ]);
        } catch (\Exception $e) {
            // Log error but don't fail invoice creation
            Log::error('Failed to create financial record for maintenance invoice', [
                'invoice_id' => $this->id,
                'invoice_number' => $this->invoice_number,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Update the financial record when invoice is updated.
     */
    public function updateFinancialRecord(): void
    {
        if (!$this->tenant_unit_id || !$this->landlord_id) {
            return;
        }

        // Find existing financial record
        $financialRecord = FinancialRecord::query()
            ->where('landlord_id', $this->landlord_id)
            ->where('tenant_unit_id', $this->tenant_unit_id)
            ->where('invoice_number', $this->invoice_number)
            ->where('type', 'fee')
            ->where('category', 'maintenance')
            ->first();

        if (!$financialRecord) {
            // If record doesn't exist, create it
            $this->createFinancialRecord();
            return;
        }

        // Update financial record based on invoice changes
        $updates = [];

        // Update amount if grand_total changed
        if ($financialRecord->amount != $this->grand_total) {
            $updates['amount'] = $this->grand_total;
        }

        // Update due date if changed
        if ($financialRecord->due_date != $this->due_date) {
            $updates['due_date'] = $this->due_date;
        }

        // Update status based on invoice status
        $newStatus = match ($this->status) {
            'paid' => 'completed',
            'cancelled' => 'cancelled',
            'overdue' => 'overdue',
            default => 'pending',
        };

        if ($financialRecord->status != $newStatus) {
            $updates['status'] = $newStatus;
        }

        // Update paid date if invoice is paid
        if ($this->status === 'paid' && $this->paid_date) {
            $updates['paid_date'] = $this->paid_date;
            $updates['payment_method'] = $this->payment_method;
            $updates['reference_number'] = $this->reference_number;
        }

        if (!empty($updates)) {
            try {
                $financialRecord->update($updates);
            } catch (\Exception $e) {
                Log::error('Failed to update financial record for maintenance invoice', [
                    'invoice_id' => $this->id,
                    'invoice_number' => $this->invoice_number,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}

