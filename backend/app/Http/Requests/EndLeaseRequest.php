<?php

namespace App\Http\Requests;

use App\Models\TenantUnit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class EndLeaseRequest extends FormRequest
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
        return [
            'move_out_date' => ['nullable', 'date', 'before_or_equal:' . now()->toDateString()],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var TenantUnit|null $tenantUnit */
            $tenantUnit = $this->route('tenant_unit');

            if (! $tenantUnit) {
                return;
            }

            if ($tenantUnit->status !== 'active') {
                $validator->errors()->add(
                    'tenant_unit',
                    'Cannot end a lease that is not active. Current status: ' . $tenantUnit->status
                );
            }
        });
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if (! $this->has('move_out_date')) {
            $this->merge([
                'move_out_date' => now()->toDateString(),
            ]);
        }
    }
}

