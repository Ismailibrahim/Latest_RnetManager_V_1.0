<?php

namespace App\Http\Requests;

use App\Models\Tenant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        $tenant = $this->route('tenant');

        if (! $tenant instanceof Tenant) {
            return false;
        }

        return $this->user()?->can('update', $tenant) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Tenant|null $tenant */
        $tenant = $this->route('tenant');
        $landlordId = $this->user()?->landlord_id;

        return [
            'full_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'nullable',
                'email',
                'max:255',
                Rule::unique('tenants', 'email')
                    ->where('landlord_id', $landlordId)
                    ->ignore($tenant?->id),
            ],
            'phone' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                Rule::unique('tenants', 'phone')
                    ->where('landlord_id', $landlordId)
                    ->ignore($tenant?->id),
            ],
            'alternate_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'emergency_contact_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'emergency_contact_relationship' => ['sometimes', 'nullable', 'string', 'max:100'],
            'nationality_id' => ['sometimes', 'nullable', 'integer', 'exists:nationalities,id'],
            'id_proof_type' => ['sometimes', 'nullable', Rule::in(['national_id', 'passport'])],
            'id_proof_number' => ['sometimes', 'required', 'string', 'max:100'],
            'id_proof_document_id' => ['sometimes', 'nullable', 'integer', 'exists:tenant_documents,id'],
            'status' => ['sometimes', 'required', Rule::in(['active', 'inactive', 'former'])],
        ];
    }
}
