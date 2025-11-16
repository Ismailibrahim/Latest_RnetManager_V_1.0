<?php

namespace App\Http\Requests;

use App\Models\MaintenanceInvoice;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMaintenanceInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var \App\Models\MaintenanceInvoice|null $invoice */
        $invoice = $this->route('maintenance_invoice');

        return $invoice
            ? ($this->user()?->can('update', $invoice) ?? false)
            : false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var \App\Models\MaintenanceInvoice|null $invoice */
        $invoice = $this->route('maintenance_invoice');
        $landlordId = $this->user()?->landlord_id;
        $invoiceId = $invoice?->id ?? 0;

        $tenantUnitRule = Rule::exists('tenant_units', 'id')->where('landlord_id', $landlordId);
        $maintenanceRequestRule = Rule::exists('maintenance_requests', 'id')->where('landlord_id', $landlordId);
        $uniqueInvoiceNumber = Rule::unique('maintenance_invoices', 'invoice_number')
            ->ignore($invoiceId)
            ->where('landlord_id', $landlordId);

        return [
            'tenant_unit_id' => ['sometimes', 'integer', $tenantUnitRule],
            'maintenance_request_id' => ['nullable', 'integer', $maintenanceRequestRule],
            'invoice_number' => ['sometimes', 'string', 'max:120', $uniqueInvoiceNumber],
            'invoice_date' => ['sometimes', 'date'],
            'due_date' => ['sometimes', 'date', 'after_or_equal:invoice_date'],
            'status' => ['sometimes', Rule::in(['draft', 'sent', 'approved', 'paid', 'overdue', 'cancelled'])],
            'labor_cost' => ['sometimes', 'numeric', 'min:0'],
            'parts_cost' => ['sometimes', 'numeric', 'min:0'],
            'tax_amount' => ['sometimes', 'numeric', 'min:0'],
            'misc_amount' => ['sometimes', 'numeric', 'min:0'],
            'discount_amount' => ['sometimes', 'numeric', 'min:0'],
            'grand_total' => ['sometimes', 'numeric', 'min:0'],
            'line_items' => ['nullable', 'array'],
            'line_items.*.description' => ['required_with:line_items', 'string', 'max:500'],
            'line_items.*.quantity' => ['required_with:line_items', 'numeric', 'min:0'],
            'line_items.*.unit_cost' => ['required_with:line_items', 'numeric', 'min:0'],
            'line_items.*.total' => ['required_with:line_items', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
            'paid_date' => ['nullable', 'date'],
            'payment_method' => ['nullable', Rule::exists('payment_methods', 'name')->where('is_active', true)],
            'reference_number' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $data = $this->validated();

            $hasCostUpdate = isset($data['labor_cost']) ||
                isset($data['parts_cost']) ||
                isset($data['tax_amount']) ||
                isset($data['misc_amount']) ||
                isset($data['discount_amount']) ||
                isset($data['grand_total']);

            if ($hasCostUpdate) {
                $invoice = $this->route('maintenance_invoice');

                $labor = $data['labor_cost'] ?? $invoice?->labor_cost ?? 0;
                $parts = $data['parts_cost'] ?? $invoice?->parts_cost ?? 0;
                $tax = $data['tax_amount'] ?? $invoice?->tax_amount ?? 0;
                $misc = $data['misc_amount'] ?? $invoice?->misc_amount ?? 0;
                $discount = $data['discount_amount'] ?? $invoice?->discount_amount ?? 0;
                $grandTotal = $data['grand_total'] ?? $invoice?->grand_total ?? 0;

                $expectedTotal = round(($labor + $parts + $tax + $misc - $discount), 2);
                if (round($grandTotal, 2) !== $expectedTotal) {
                    $validator->errors()->add('grand_total', 'Grand total must equal labor + parts + tax + misc − discount.');
                }
            }

            if (!empty($data['line_items']) && is_array($data['line_items'])) {
                foreach ($data['line_items'] as $index => $item) {
                    if (!isset($item['total'], $item['quantity'], $item['unit_cost'])) {
                        continue;
                    }

                    $calculated = round(($item['quantity'] ?? 0) * ($item['unit_cost'] ?? 0), 2);
                    if (round($item['total'], 2) !== $calculated) {
                        $validator->errors()->add("line_items.$index.total", 'Total must equal quantity × unit cost.');
                    }
                }
            }
        });
    }
}

