<?php

namespace App\Http\Requests;

use App\Models\MaintenanceRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMaintenanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $maintenanceRequest = $this->route('maintenance_request');

        if (! $maintenanceRequest instanceof MaintenanceRequest) {
            return false;
        }

        return $this->user()?->can('update', $maintenanceRequest) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var MaintenanceRequest|null $maintenanceRequest */
        $maintenanceRequest = $this->route('maintenance_request');
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
            'unit_id' => ['sometimes', 'required', 'integer', $unitRule],
            'description' => ['sometimes', 'required', 'string'],
            'cost' => ['sometimes', 'required', 'numeric', 'min:0'],
            'asset_id' => ['sometimes', 'nullable', 'integer', $assetRule],
            'location' => ['sometimes', 'nullable', 'string', 'max:100'],
            'serviced_by' => ['sometimes', 'nullable', 'string', 'max:255'],
            'invoice_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'is_billable' => ['sometimes', 'boolean'],
            'billed_to_tenant' => ['sometimes', 'boolean'],
            'tenant_share' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'type' => ['sometimes', 'nullable', Rule::in(['repair', 'replacement', 'service'])],
            'maintenance_date' => ['sometimes', 'required', 'date'],
        ];
    }

    public function validated($key = null, $default = null)
    {
        $data = parent::validated($key, $default);

        if (array_key_exists('is_billable', $data)) {
            $data['is_billable'] = $this->boolean('is_billable');
        }

        if (array_key_exists('billed_to_tenant', $data)) {
            $data['billed_to_tenant'] = $this->boolean('billed_to_tenant');
        }

        return $data;
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if ($this->has('billed_to_tenant') && $this->boolean('billed_to_tenant') && ! $this->filled('tenant_share')) {
                $validator->errors()->add('tenant_share', 'Tenant share is required when billed_to_tenant is true.');
            }
        });
    }
}
