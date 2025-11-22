<?php

namespace App\Http\Requests;

use App\Models\Property;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePropertyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', Property::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->user();
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string'],
            'type' => ['required', 'string', Rule::in(['residential', 'commercial'])],
        ];

        // Super admins must specify landlord_id when creating properties
        if ($user && $user->isSuperAdmin()) {
            $rules['landlord_id'] = ['required', 'integer', Rule::exists('landlords', 'id')];
        }

        return $rules;
    }
}
