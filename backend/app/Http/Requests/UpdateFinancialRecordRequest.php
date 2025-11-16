<?php

namespace App\Http\Requests;

use App\Models\FinancialRecord;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFinancialRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        $record = $this->route('financial_record');

        if (! $record instanceof FinancialRecord) {
            return false;
        }

        return $this->user()?->can('update', $record) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var FinancialRecord|null $record */
        $record = $this->route('financial_record');
        $landlordId = $this->user()?->landlord_id;

        $tenantUnitRule = Rule::exists('tenant_units', 'id')
            ->where('landlord_id', $landlordId);

        $parentRule = Rule::exists('financial_records', 'id')
            ->where('landlord_id', $landlordId);

        return [
            'tenant_unit_id' => ['sometimes', 'required', 'integer', $tenantUnitRule],
            'type' => ['sometimes', 'required', Rule::in(['rent', 'expense', 'security_deposit', 'refund', 'fee'])],
            'category' => ['sometimes', 'required', Rule::in([
                'monthly_rent', 'late_fee', 'processing_fee',
                'maintenance', 'repair', 'utility', 'tax', 'insurance', 'management_fee', 'other',
            ])],
            'amount' => ['sometimes', 'required', 'numeric', 'min:0'],
            'description' => ['sometimes', 'required', 'string', 'max:500'],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'paid_date' => ['sometimes', 'nullable', 'date'],
            'transaction_date' => ['sometimes', 'required', 'date'],
            'invoice_number' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
                Rule::unique('financial_records', 'invoice_number')
                    ->where('landlord_id', $landlordId)
                    ->ignore($record?->id),
            ],
            'payment_method' => ['sometimes', 'nullable', Rule::exists('payment_methods', 'name')->where('is_active', true)],
            'reference_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'parent_id' => ['sometimes', 'nullable', 'integer', $parentRule],
            'is_installment' => ['sometimes', 'boolean'],
            'installment_number' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'total_installments' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'status' => ['sometimes', 'required', Rule::in(['pending', 'completed', 'cancelled', 'overdue', 'partial'])],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if ($this->has('is_installment') && $this->boolean('is_installment')) {
                if (! $this->filled('parent_id')) {
                    $validator->errors()->add('parent_id', 'Installment records must reference a parent financial record.');
                }

                if (! $this->filled('installment_number')) {
                    $validator->errors()->add('installment_number', 'Installment records require an installment number.');
                }

                if (! $this->filled('total_installments')) {
                    $validator->errors()->add('total_installments', 'Installment records require total installments.');
                }
            }
        });
    }
}
