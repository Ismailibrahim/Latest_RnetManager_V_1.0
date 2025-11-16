<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TenantUnit extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'unit_id',
        'landlord_id',
        'lease_start',
        'lease_end',
        'monthly_rent',
        'security_deposit_paid',
        'advance_rent_months',
        'advance_rent_amount',
        'notice_period_days',
        'lock_in_period_months',
        'lease_document_path',
        'status',
    ];

    protected $casts = [
        'lease_start' => 'date',
        'lease_end' => 'date',
        'monthly_rent' => 'decimal:2',
        'security_deposit_paid' => 'decimal:2',
        'advance_rent_amount' => 'decimal:2',
    ];

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(Landlord::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function financialRecords(): HasMany
    {
        return $this->hasMany(FinancialRecord::class);
    }

    public function rentInvoices(): HasMany
    {
        return $this->hasMany(RentInvoice::class);
    }

    public function securityDepositRefunds(): HasMany
    {
        return $this->hasMany(SecurityDepositRefund::class);
    }
}

