<?php

namespace App\Http\Requests;

use App\Models\UnitOccupancyHistory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnitOccupancyHistoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', UnitOccupancyHistory::class) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $landlordId = $this->user()?->landlord_id;

        $unitRule = Rule::exists('units', 'id')->where('landlord_id', $landlordId);
        $tenantRule = Rule::exists('tenants', 'id')->where('landlord_id', $landlordId);
        $tenantUnitRule = Rule::exists('tenant_units', 'id')
            ->where('landlord_id', $landlordId);

        return [
            'unit_id' => ['required', 'integer', $unitRule],
            'tenant_id' => ['required', 'integer', $tenantRule],
            'tenant_unit_id' => ['required', 'integer', $tenantUnitRule],
            'action' => ['required', Rule::in(['move_in', 'move_out'])],
            'action_date' => ['required', 'date'],
            'rent_amount' => ['nullable', 'numeric', 'min:0'],
            'security_deposit_amount' => ['nullable', 'numeric', 'min:0'],
            'lease_start_date' => ['nullable', 'date'],
            'lease_end_date' => ['nullable', 'date', 'after_or_equal:lease_start_date'],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $tenantUnitId = $this->input('tenant_unit_id');
            $tenantId = $this->input('tenant_id');
            $unitId = $this->input('unit_id');

            if ($tenantUnitId && $tenantId && $unitId) {
                $tenantUnit = \App\Models\TenantUnit::query()
                    ->where('id', $tenantUnitId)
                    ->where('tenant_id', $tenantId)
                    ->where('unit_id', $unitId)
                    ->first();

                if (! $tenantUnit) {
                    $validator->errors()->add('tenant_unit_id', 'tenant_unit_id must belong to the provided tenant and unit.');
                }
            }
        });
    }
}
