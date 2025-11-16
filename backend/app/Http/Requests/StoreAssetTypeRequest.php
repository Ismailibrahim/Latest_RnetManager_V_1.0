<?php

namespace App\Http\Requests;

use App\Models\AssetType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssetTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', AssetType::class) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100', 'unique:asset_types,name'],
            'category' => ['nullable', Rule::in(['appliance', 'furniture', 'electronic', 'fixture', 'other'])],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function validated($key = null, $default = null)
    {
        $data = parent::validated($key, $default);
        $data['is_active'] = array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true;

        return $data;
    }
}