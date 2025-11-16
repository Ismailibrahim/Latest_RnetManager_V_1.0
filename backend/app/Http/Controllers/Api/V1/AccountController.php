<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\UpdateAccountRequest;
use App\Http\Requests\Account\UpdatePasswordRequest;
use App\Http\Resources\AccountResource;
use App\Http\Resources\DelegateResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AccountController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user()->load('landlord');

        $delegates = User::query()
            ->where('landlord_id', $user->landlord_id)
            ->whereKeyNot($user->id)
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get();

        return response()->json([
            'user' => new AccountResource($user),
            'delegates' => DelegateResource::collection($delegates),
            'meta' => [
                'roles' => User::ROLES,
                'delegates_count' => $delegates->count(),
            ],
        ]);
    }

    public function update(UpdateAccountRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $user->fill($request->validated());
        $user->save();

        return response()->json([
            'message' => 'Account updated successfully.',
            'user' => new AccountResource($user),
        ]);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $validated = $request->validated();

        if (! Hash::check($validated['current_password'], $user->password_hash)) {
            return response()->json([
                'message' => 'The provided password is incorrect.',
                'errors' => [
                    'current_password' => ['The provided password is incorrect.'],
                ],
            ], 422);
        }

        $user->forceFill([
            'password_hash' => $validated['password'],
        ])->save();

        $currentToken = $user->currentAccessToken();

        $user->tokens()
            ->when($currentToken, fn ($query) => $query->whereKeyNot($currentToken->id))
            ->delete();

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }
}

