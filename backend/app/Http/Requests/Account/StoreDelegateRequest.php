<?php

namespace App\Http\Requests\Account;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDelegateRequest extends FormRequest
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
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'mobile' => ['required', 'string', 'max:30'],
            'role' => ['required', 'string', Rule::in(User::ROLES)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}

