<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'landlord_id',
        'full_name',
        'email',
        'phone',
        'alternate_phone',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relationship',
        'nationality_id',
        'id_proof_type',
        'id_proof_number',
        'id_proof_document_id',
        'status',
    ];

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(Landlord::class);
    }

    public function tenantUnits(): HasMany
    {
        return $this->hasMany(TenantUnit::class);
    }

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function occupancyHistory(): HasMany
    {
        return $this->hasMany(UnitOccupancyHistory::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(TenantDocument::class)->latest();
    }

    public function nationality(): BelongsTo
    {
        return $this->belongsTo(Nationality::class);
    }

    public function idProofDocument(): BelongsTo
    {
        return $this->belongsTo(TenantDocument::class, 'id_proof_document_id');
    }
}

