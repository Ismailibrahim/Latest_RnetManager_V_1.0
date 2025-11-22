<?php

namespace App\Http\Requests;

use App\Models\Property;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePropertyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $property = $this->route('property');

        if (! $property instanceof Property) {
            return false;
        }

        return $this->user()?->can('update', $property) ?? false;
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
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'address' => ['sometimes', 'required', 'string'],
            'type' => ['sometimes', 'required', 'string', Rule::in(['residential', 'commercial'])],
        ];

        // Super admins can optionally update landlord_id
        if ($user && $user->isSuperAdmin()) {
            $rules['landlord_id'] = ['sometimes', 'required', 'integer', Rule::exists('landlords', 'id')];
        }

        return $rules;
    }
}
