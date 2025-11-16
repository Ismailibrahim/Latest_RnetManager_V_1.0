<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDocumentSettingsRequest extends FormRequest
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
            'retention_years' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100'],
            'export_format' => ['sometimes', 'nullable', 'string', 'in:csv,excel,pdf'],
            'auto_export' => ['sometimes', 'boolean'],
            'export_email' => ['sometimes', 'nullable', 'email', 'max:255'],
        ];
    }
}

