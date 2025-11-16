<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Tenant */
class TenantResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'landlord_id' => $this->landlord_id,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'alternate_phone' => $this->alternate_phone,
            'emergency_contact_name' => $this->emergency_contact_name,
            'emergency_contact_phone' => $this->emergency_contact_phone,
            'emergency_contact_relationship' => $this->emergency_contact_relationship,
            'nationality_id' => $this->nationality_id,
            'nationality' => $this->whenLoaded('nationality', fn () => NationalityResource::make($this->nationality)),
            'id_proof_type' => $this->id_proof_type,
            'id_proof_number' => $this->id_proof_number,
            'id_proof_document' => $this->whenLoaded('idProofDocument', fn () => TenantDocumentResource::make($this->idProofDocument)),
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'documents' => TenantDocumentResource::collection($this->whenLoaded('documents')),
            'active_leases' => TenantUnitResource::collection($this->whenLoaded('tenantUnits')),
            'tenant_units_count' => $this->whenCounted('tenantUnits'),
            'assets_count' => $this->whenCounted('assets'),
            'occupancy_history_count' => $this->whenCounted('occupancyHistory'),
            'can_be_deleted' => $this->when(
                isset($this->tenant_units_count, $this->assets_count, $this->occupancy_history_count),
                fn () => $this->tenant_units_count === 0
                    && $this->assets_count === 0
                    && $this->occupancy_history_count === 0,
            ),
        ];
    }
}

