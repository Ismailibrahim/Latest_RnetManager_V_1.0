<?php

namespace App\Http\Requests;

use App\Models\UnifiedPayment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListUnifiedPaymentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', UnifiedPayment::class) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'payment_type' => ['nullable', Rule::in(['rent', 'maintenance_expense', 'security_refund', 'fee', 'other_income', 'other_outgoing'])],
            'flow_direction' => ['nullable', Rule::in(['income', 'outgoing'])],
            'status' => ['nullable', 'string'],
            'tenant_unit_id' => ['nullable', 'integer'],
            'unit_id' => ['nullable', 'integer'],
            'entry_origin' => ['nullable', Rule::in(['native', 'legacy'])],
            'source_type' => ['nullable', 'string'],
            'composite_id' => ['nullable', 'string'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ];
    }
}

