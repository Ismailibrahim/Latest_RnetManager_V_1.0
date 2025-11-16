<?php

namespace App\Http\Requests\Account;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDelegateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        return $user->isOwner() || $user->isAdmin() || $user->isManager();
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        /** @var \App\Models\User|null $delegate */
        $delegate = $this->route('delegate');

        return [
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'email' => [
                'sometimes',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($delegate?->id),
            ],
            'mobile' => ['sometimes', 'string', 'max:30'],
            'role' => ['sometimes', 'string', Rule::in(User::ROLES)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}

