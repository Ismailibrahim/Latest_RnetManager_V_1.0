<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class VoidUnifiedPaymentEntryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->is_active ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', Rule::in(['cancelled', 'failed', 'refunded'])],
            'voided_at' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }
}


