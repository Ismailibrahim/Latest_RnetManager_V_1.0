<?php

namespace App\Http\Requests;

use App\Models\AssetType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAssetTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $assetType = $this->route('asset_type');

        if (! $assetType instanceof AssetType) {
            return false;
        }

        return $this->user()?->can('update', $assetType) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var AssetType|null $assetType */
        $assetType = $this->route('asset_type');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:100', Rule::unique('asset_types', 'name')->ignore($assetType?->id)],
            'category' => ['sometimes', 'nullable', Rule::in(['appliance', 'furniture', 'electronic', 'fixture', 'other'])],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function validated($key = null, $default = null)
    {
        $data = parent::validated($key, $default);

        if (array_key_exists('is_active', $data)) {
            $data['is_active'] = (bool) $data['is_active'];
        }

        return $data;
    }
}
