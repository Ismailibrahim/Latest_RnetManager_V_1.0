<?php

namespace App\Http\Requests;

use App\Models\Asset;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Asset::class) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $landlordId = $this->user()?->landlord_id;

        $assetTypeRule = Rule::exists('asset_types', 'id');

        $unitRule = Rule::exists('units', 'id')->where('landlord_id', $landlordId);

        $tenantRule = Rule::exists('tenants', 'id')->where('landlord_id', $landlordId);

        return [
            'asset_type_id' => ['required', 'integer', $assetTypeRule],
            'unit_id' => ['required', 'integer', $unitRule],
            'ownership' => ['nullable', Rule::in(['landlord', 'tenant'])],
            'tenant_id' => ['nullable', 'integer', $tenantRule],
            'name' => ['required', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:100'],
            'installation_date' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(['working', 'maintenance', 'broken'])],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $ownership = $this->input('ownership', 'landlord');

            if ($ownership === 'tenant' && ! $this->filled('tenant_id')) {
                $validator->errors()->add('tenant_id', 'Asset owned by tenant requires tenant_id.');
            }

            if ($ownership !== 'tenant' && $this->filled('tenant_id')) {
                $validator->errors()->add('tenant_id', 'Provide ownership of tenant when assigning tenant_id.');
            }
        });
    }

    public function validated($key = null, $default = null)
    {
        $data = parent::validated($key, $default);
        $data['ownership'] = $data['ownership'] ?? 'landlord';
        $data['status'] = $data['status'] ?? 'working';

        if (($data['ownership'] ?? 'landlord') !== 'tenant') {
            $data['tenant_id'] = null;
        }

        return $data;
    }
}