<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCurrencySettingsRequest extends FormRequest
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
            'primary' => ['sometimes', 'nullable', 'string', 'size:3', Rule::in(['MVR', 'USD'])],
            'secondary' => ['sometimes', 'nullable', 'string', 'size:3', Rule::in(['MVR', 'USD'])],
            'exchange_rate' => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ];
    }
}

