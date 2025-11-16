<?php

namespace App\Http\Requests;

use App\Models\MaintenanceRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMaintenanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', MaintenanceRequest::class) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $landlordId = $this->user()?->landlord_id;

        $unitRule = Rule::exists('units', 'id')->where('landlord_id', $landlordId);
        $assetRule = Rule::exists('assets', 'id')->where(function ($query) use ($landlordId) {
            $query->whereIn('unit_id', function ($subQuery) use ($landlordId) {
                $subQuery->select('id')
                    ->from('units')
                    ->where('landlord_id', $landlordId);
            });
        });

        return [
            'unit_id' => ['required', 'integer', $unitRule],
            'description' => ['required', 'string'],
            'cost' => ['required', 'numeric', 'min:0'],
            'asset_id' => ['nullable', 'integer', $assetRule],
            'location' => ['nullable', 'string', 'max:100'],
            'serviced_by' => ['nullable', 'string', 'max:255'],
            'invoice_number' => ['nullable', 'string', 'max:100'],
            'is_billable' => ['boolean'],
            'billed_to_tenant' => ['boolean'],
            'tenant_share' => ['nullable', 'numeric', 'min:0'],
            'type' => ['nullable', Rule::in(['repair', 'replacement', 'service'])],
            'maintenance_date' => ['required', 'date'],
        ];
    }

    public function validated($key = null, $default = null)
    {
        $data = parent::validated($key, $default);
        $data['is_billable'] = $this->boolean('is_billable');
        $data['billed_to_tenant'] = $this->boolean('billed_to_tenant');

        return $data;
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if ($this->boolean('billed_to_tenant') && ! $this->filled('tenant_share')) {
                $validator->errors()->add('tenant_share', 'Tenant share is required when billed_to_tenant is true.');
            }
        });
    }
}
