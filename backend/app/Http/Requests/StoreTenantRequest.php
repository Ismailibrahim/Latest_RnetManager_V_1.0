<?php

namespace App\Http\Requests;

use App\Models\Tenant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Tenant::class) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $landlordId = $this->user()?->landlord_id;

        return [
            'full_name' => ['required', 'string', 'max:255'],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('tenants', 'email')->where('landlord_id', $landlordId),
            ],
            'phone' => [
                'required',
                'string',
                'max:20',
                Rule::unique('tenants', 'phone')->where('landlord_id', $landlordId),
            ],
            'alternate_phone' => ['nullable', 'string', 'max:20'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:20'],
            'emergency_contact_relationship' => ['nullable', 'string', 'max:100'],
            'nationality_id' => ['nullable', 'integer', 'exists:nationalities,id'],
            'id_proof_type' => ['nullable', Rule::in(['national_id', 'passport'])],
            'id_proof_number' => ['required', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'former'])],
        ];
    }
}
