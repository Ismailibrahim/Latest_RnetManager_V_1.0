<?php

namespace App\Http\Requests;

use App\Models\Nationality;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNationalityRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Nationality|null $nationality */
        $nationality = $this->route('nationality');

        if (! $nationality instanceof Nationality) {
            return false;
        }

        return $this->user()?->can('update', $nationality) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Nationality|null $nationality */
        $nationality = $this->route('nationality');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('nationalities', 'name')->ignore($nationality?->id),
            ],
        ];
    }
}

