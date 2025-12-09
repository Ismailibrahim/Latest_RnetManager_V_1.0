<?php

namespace App\Models;

use App\Models\Concerns\BelongsToLandlord;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;

class TenantUnit extends Model
{
    use HasFactory;
    use BelongsToLandlord;

    protected $fillable = [
        'tenant_id',
        'unit_id',
        'landlord_id',
        'lease_start',
        'lease_end',
        'monthly_rent',
        'currency',
        'security_deposit_paid',
        'advance_rent_months',
        'advance_rent_amount',
        'advance_rent_used',
        'advance_rent_collected_date',
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
        'advance_rent_used' => 'decimal:2',
        'advance_rent_collected_date' => 'date',
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::addGlobalScope('landlord', function ($query) {
            $user = Auth::user();
            // Super admins can see all tenant units
            if ($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
                return; // Don't filter for super admins
            }
            
            $landlordId = $user?->landlord_id;
            if ($landlordId !== null) {
                $query->where('landlord_id', $landlordId);
            }
        });
    }

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

    /**
     * Get remaining advance rent amount.
     */
    public function getAdvanceRentRemainingAttribute(): float
    {
        $used = (float) ($this->advance_rent_used ?? 0);
        $amount = (float) ($this->advance_rent_amount ?? 0);

        return max(0, $amount - $used);
    }

    /**
     * Check if invoice date falls within advance rent coverage period.
     */
    public function isInvoiceDateCoveredByAdvanceRent(Carbon|string $invoiceDate): bool
    {
        if (!$this->advance_rent_months || $this->advance_rent_months <= 0) {
            return false;
        }

        if (!$this->lease_start) {
            return false;
        }

        $invoiceDate = is_string($invoiceDate) ? Carbon::parse($invoiceDate) : $invoiceDate;
        $leaseStart = Carbon::parse($this->lease_start)->startOfDay();
        $coverageEnd = $leaseStart->copy()->addMonths($this->advance_rent_months)->subDay()->endOfDay();

        return $invoiceDate->between($leaseStart, $coverageEnd);
    }

    /**
     * Get advance rent coverage period.
     *
     * @return array{start: Carbon, end: Carbon}|null
     */
    public function getAdvanceRentCoveragePeriod(): ?array
    {
        if (!$this->advance_rent_months || $this->advance_rent_months <= 0) {
            return null;
        }

        if (!$this->lease_start) {
            return null;
        }

        $start = Carbon::parse($this->lease_start)->startOfDay();
        $end = $start->copy()->addMonths($this->advance_rent_months)->subDay()->endOfDay();

        return [
            'start' => $start,
            'end' => $end,
        ];
    }

    /**
     * Check if advance rent has been fully used.
     */
    public function isAdvanceRentFullyUsed(): bool
    {
        return $this->advance_rent_remaining <= 0;
    }

    /**
     * Get months remaining in advance rent coverage.
     */
    public function getAdvanceRentMonthsRemaining(?Carbon $referenceDate = null): int
    {
        if (!$this->advance_rent_months || $this->advance_rent_months <= 0) {
            return 0;
        }

        if (!$this->lease_start) {
            return 0;
        }

        $referenceDate = $referenceDate ?? Carbon::now();
        $leaseStart = Carbon::parse($this->lease_start)->startOfDay();
        $coverageEnd = $leaseStart->copy()->addMonths($this->advance_rent_months);

        if ($referenceDate->gte($coverageEnd)) {
            return 0;
        }

        $monthsElapsed = $leaseStart->diffInMonths($referenceDate);
        return max(0, $this->advance_rent_months - $monthsElapsed);
    }
}

