<?php

namespace App\Http\Requests;

use App\Models\Tenant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkImportTenantsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', Tenant::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $landlordId = $this->user()?->landlord_id;
        $mode = $this->input('mode', 'create');

        return [
            'mode' => ['required', 'string', Rule::in(['create', 'upsert'])],
            'tenants' => ['required', 'array', 'min:1'],
            'tenants.*.full_name' => ['required', 'string', 'max:255'],
            'tenants.*.email' => [
                'nullable',
                'email',
                'max:255',
                function ($attribute, $value, $fail) use ($landlordId, $mode) {
                    if ($value && $mode === 'create') {
                        $exists = Tenant::where('landlord_id', $landlordId)
                            ->where('email', $value)
                            ->exists();
                        
                        if ($exists) {
                            $fail("Email '{$value}' already exists. Use 'upsert' mode to update existing tenants.");
                        }
                    }
                },
            ],
            'tenants.*.phone' => [
                'required',
                'string',
                'max:20',
                function ($attribute, $value, $fail) use ($landlordId, $mode) {
                    if ($mode === 'create') {
                        $exists = Tenant::where('landlord_id', $landlordId)
                            ->where('phone', $value)
                            ->exists();
                        
                        if ($exists) {
                            $fail("Phone '{$value}' already exists. Use 'upsert' mode to update existing tenants.");
                        }
                    }
                },
            ],
            'tenants.*.alternate_phone' => ['nullable', 'string', 'max:20'],
            'tenants.*.emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'tenants.*.emergency_contact_phone' => ['nullable', 'string', 'max:20'],
            'tenants.*.emergency_contact_relationship' => ['nullable', 'string', 'max:100'],
            'tenants.*.nationality_name' => ['nullable', 'string', 'max:255'],
            'tenants.*.nationality_id' => ['nullable', 'integer', 'exists:nationalities,id'],
            'tenants.*.id_proof_type' => ['nullable', Rule::in(['national_id', 'passport'])],
            'tenants.*.id_proof_number' => ['nullable', 'string', 'max:100'],
            'tenants.*.status' => ['nullable', Rule::in(['active', 'inactive', 'former'])],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'tenants.required' => 'At least one tenant is required for import.',
            'tenants.*.full_name.required' => 'Full name is required for all tenants.',
            'tenants.*.phone.required' => 'Phone is required for all tenants.',
            'tenants.*.email.email' => 'Email must be a valid email address.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $tenants = $this->input('tenants', []);

        foreach ($tenants as $index => $tenant) {
            // Ensure status has a default value
            if (!isset($tenant['status']) || $tenant['status'] === '') {
                $tenants[$index]['status'] = 'active';
            }
        }

        $this->merge(['tenants' => $tenants]);
    }
}

