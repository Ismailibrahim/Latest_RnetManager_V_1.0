<?php

namespace App\Http\Requests;

use App\Models\Asset;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        $asset = $this->route('asset');

        if (! $asset instanceof Asset) {
            return false;
        }

        return $this->user()?->can('update', $asset) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Asset|null $asset */
        $asset = $this->route('asset');
        $landlordId = $this->user()?->landlord_id;

        $assetTypeRule = Rule::exists('asset_types', 'id');
        $unitRule = Rule::exists('units', 'id')->where('landlord_id', $landlordId);
        $tenantRule = Rule::exists('tenants', 'id')->where('landlord_id', $landlordId);

        return [
            'asset_type_id' => ['sometimes', 'required', 'integer', $assetTypeRule],
            'unit_id' => ['sometimes', 'required', 'integer', $unitRule],
            'ownership' => ['sometimes', 'nullable', Rule::in(['landlord', 'tenant'])],
            'tenant_id' => ['sometimes', 'nullable', 'integer', $tenantRule],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'brand' => ['sometimes', 'nullable', 'string', 'max:100'],
            'model' => ['sometimes', 'nullable', 'string', 'max:100'],
            'location' => ['sometimes', 'nullable', 'string', 'max:100'],
            'installation_date' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', 'required', Rule::in(['working', 'maintenance', 'broken'])],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            /** @var Asset|null $asset */
            $asset = $this->route('asset');
            $ownership = $this->input('ownership', $asset?->ownership ?? 'landlord');

            if ($ownership === 'tenant' && ! $this->filled('tenant_id') && ! $asset?->tenant_id) {
                $validator->errors()->add('tenant_id', 'Asset owned by tenant requires tenant_id.');
            }

            if ($this->filled('tenant_id') && $ownership !== 'tenant') {
                $validator->errors()->add('tenant_id', 'Provide ownership of tenant when assigning tenant_id.');
            }
        });
    }

    public function validated($key = null, $default = null)
    {
        $data = parent::validated($key, $default);

        if (array_key_exists('ownership', $data) && $data['ownership'] !== 'tenant') {
            $data['tenant_id'] = null;
        }

        return $data;
    }
}
