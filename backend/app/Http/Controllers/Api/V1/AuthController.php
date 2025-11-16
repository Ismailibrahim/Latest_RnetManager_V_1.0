<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User|null $user */
        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! $user->is_active || ! Hash::check($credentials['password'], $user->password_hash)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        $token = $user->createToken($credentials['device_name'] ?? 'api')->plainTextToken;

        $user->forceFill([
            'last_login_at' => now(),
        ])->save();

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load('landlord'),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->load('landlord'),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $user->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}

