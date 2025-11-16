<?php

namespace App\Http\Requests;

use App\Models\Nationality;
use Illuminate\Foundation\Http\FormRequest;

class StoreNationalityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Nationality::class) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'unique:nationalities,name'],
        ];
    }
}

