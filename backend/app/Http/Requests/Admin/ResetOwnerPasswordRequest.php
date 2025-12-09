<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ResetOwnerPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        try {
            $user = $this->user();

            if (! $user) {
                return false;
            }

            // Check if method exists before calling
            if (!method_exists($user, 'isSuperAdmin')) {
                \Log::error('isSuperAdmin method not found on user', [
                    'user_id' => $user->id ?? null,
                    'user_class' => get_class($user),
                ]);
                return false;
            }

            return $user->isSuperAdmin();
        } catch (\Exception $e) {
            \Log::error('Authorization check failed in ResetOwnerPasswordRequest', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return false;
        }
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'password' => ['required', 'string', Password::defaults(), 'confirmed'],
        ];
    }
}

