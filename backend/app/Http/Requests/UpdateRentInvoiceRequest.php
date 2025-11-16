<?php

namespace App\Http\Requests;

use App\Models\RentInvoice;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRentInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $invoice = $this->route('rent_invoice');

        if (! $invoice instanceof RentInvoice) {
            return false;
        }

        return $this->user()?->can('update', $invoice) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var RentInvoice|null $invoice */
        $invoice = $this->route('rent_invoice');
        $landlordId = $this->user()?->landlord_id;

        $tenantUnitRule = Rule::exists('tenant_units', 'id')
            ->where('landlord_id', $landlordId);

        return [
            'tenant_unit_id' => ['sometimes', 'required', 'integer', $tenantUnitRule],
            'invoice_number' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
                Rule::unique('rent_invoices', 'invoice_number')
                    ->where('landlord_id', $landlordId)
                    ->ignore($invoice?->id),
            ],
            'invoice_date' => ['sometimes', 'required', 'date'],
            'due_date' => ['sometimes', 'required', 'date', 'after_or_equal:invoice_date'],
            'rent_amount' => ['sometimes', 'required', 'numeric', 'min:0'],
            'late_fee' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', 'required', Rule::in(['generated', 'sent', 'paid', 'overdue', 'cancelled'])],
            'paid_date' => ['sometimes', 'nullable', 'date'],
            'payment_method' => ['sometimes', 'nullable', Rule::exists('payment_methods', 'name')->where('is_active', true)],
        ];
    }
}