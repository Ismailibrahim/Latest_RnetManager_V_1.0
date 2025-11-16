<?php

namespace App\Http\Requests;

use App\Models\MaintenanceInvoice;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMaintenanceInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', MaintenanceInvoice::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $landlordId = $this->user()?->landlord_id;

        $tenantUnitRule = Rule::exists('tenant_units', 'id')->where('landlord_id', $landlordId);
        $maintenanceRequestRule = Rule::exists('maintenance_requests', 'id')->where('landlord_id', $landlordId);
        $uniqueInvoiceNumber = Rule::unique('maintenance_invoices', 'invoice_number')->where('landlord_id', $landlordId);

        return [
            'tenant_unit_id' => ['required', 'integer', $tenantUnitRule],
            'maintenance_request_id' => ['nullable', 'integer', $maintenanceRequestRule],
            'invoice_number' => ['nullable', 'string', 'max:120', $uniqueInvoiceNumber],
            'invoice_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:invoice_date'],
            'status' => ['nullable', Rule::in(['draft', 'sent', 'approved', 'paid', 'overdue', 'cancelled'])],
            'labor_cost' => ['required', 'numeric', 'min:0'],
            'parts_cost' => ['required', 'numeric', 'min:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'misc_amount' => ['nullable', 'numeric', 'min:0'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'grand_total' => ['required', 'numeric', 'min:0'],
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

            $expectedTotal = round(
                ($data['labor_cost'] ?? 0)
                + ($data['parts_cost'] ?? 0)
                + ($data['tax_amount'] ?? 0)
                + ($data['misc_amount'] ?? 0)
                - ($data['discount_amount'] ?? 0),
                2
            );

            if (isset($data['grand_total']) && round($data['grand_total'], 2) !== $expectedTotal) {
                $validator->errors()->add('grand_total', 'Grand total must equal labor + parts + tax + misc − discount.');
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

