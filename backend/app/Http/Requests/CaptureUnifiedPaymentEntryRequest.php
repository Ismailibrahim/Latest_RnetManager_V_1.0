<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CaptureUnifiedPaymentEntryRequest extends FormRequest
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
            'status' => ['nullable', Rule::in(['completed', 'partial'])],
            'transaction_date' => ['nullable', 'date'],
            'payment_method' => ['nullable', 'string', 'max:150'],
            'reference_number' => ['nullable', 'string', 'max:150'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}


