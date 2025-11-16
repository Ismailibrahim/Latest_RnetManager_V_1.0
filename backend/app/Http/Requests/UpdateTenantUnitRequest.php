<?php

namespace App\Http\Requests;

use App\Models\TenantUnit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTenantUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        $tenantUnit = $this->route('tenant_unit');

        if (! $tenantUnit instanceof TenantUnit) {
            return false;
        }

        return $this->user()?->can('update', $tenantUnit) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var TenantUnit|null $tenantUnit */
        $tenantUnit = $this->route('tenant_unit');
        $landlordId = $this->user()?->landlord_id;

        $tenantRule = Rule::exists('tenants', 'id')
            ->where('landlord_id', $landlordId);

        $unitRule = Rule::exists('units', 'id')
            ->where('landlord_id', $landlordId);

        return [
            'tenant_id' => ['sometimes', 'required', 'integer', $tenantRule],
            'unit_id' => ['sometimes', 'required', 'integer', $unitRule],
            'lease_start' => ['sometimes', 'required', 'date'],
            'lease_end' => ['sometimes', 'required', 'date', 'after:lease_start'],
            'monthly_rent' => ['sometimes', 'required', 'numeric', 'min:0'],
            'security_deposit_paid' => ['sometimes', 'required', 'numeric', 'min:0'],
            'advance_rent_months' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'advance_rent_amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'notice_period_days' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'lock_in_period_months' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'lease_document_path' => ['sometimes', 'nullable', 'string', 'max:500'],
            'lease_document' => ['sometimes', 'nullable', 'file', 'mimes:pdf', 'max:20480'],
            'status' => ['sometimes', 'required', Rule::in(['active', 'ended', 'cancelled'])],
        ];
    }
}
