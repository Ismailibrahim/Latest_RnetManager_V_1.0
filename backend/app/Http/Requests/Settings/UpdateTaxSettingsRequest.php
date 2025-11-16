<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaxSettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'gst_percentage' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'gst_enabled' => ['sometimes', 'boolean'],
            'gst_registration_number' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }
}

