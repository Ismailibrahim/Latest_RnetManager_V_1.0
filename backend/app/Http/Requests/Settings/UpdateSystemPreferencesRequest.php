<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSystemPreferencesRequest extends FormRequest
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
            'timezone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'date_format' => ['sometimes', 'nullable', 'string', 'max:20'],
            'time_format' => ['sometimes', 'nullable', 'string', 'in:12h,24h'],
            'locale' => ['sometimes', 'nullable', 'string', 'max:10'],
        ];
    }
}

