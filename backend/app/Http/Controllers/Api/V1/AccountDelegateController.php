<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\ResetDelegatePasswordRequest;
use App\Http\Requests\Account\StoreDelegateRequest;
use App\Http\Requests\Account\UpdateDelegateRequest;
use App\Http\Resources\DelegateResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AccountDelegateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $delegates = User::query()
            ->where('landlord_id', $user->landlord_id)
            ->whereKeyNot($user->id)
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get();

        return response()->json([
            'delegates' => DelegateResource::collection($delegates),
        ]);
    }

    public function store(StoreDelegateRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->ensureUserCanManageDelegates($user);

        $payload = $request->validated();

        $delegate = null;

        DB::transaction(function () use ($user, $payload, &$delegate): void {
            $delegate = User::create([
                'landlord_id' => $user->landlord_id,
                'first_name' => $payload['first_name'],
                'last_name' => $payload['last_name'],
                'email' => $payload['email'],
                'mobile' => $payload['mobile'],
                'role' => $payload['role'],
                'is_active' => $payload['is_active'] ?? true,
                'password_hash' => Str::random(32),
            ]);
        });

        return response()->json([
            'message' => 'Delegate created successfully.',
            'delegate' => new DelegateResource($delegate->fresh()),
        ], 201);
    }

    public function update(UpdateDelegateRequest $request, User $delegate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->ensureUserCanManageDelegates($user);
        $this->ensureDelegateBelongsToTenant($user, $delegate);

        $delegate->fill($request->validated());
        $delegate->save();

        return response()->json([
            'message' => 'Delegate updated successfully.',
            'delegate' => new DelegateResource($delegate),
        ]);
    }

    public function destroy(Request $request, User $delegate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->ensureUserCanManageDelegates($user);
        $this->ensureDelegateBelongsToTenant($user, $delegate);

        $delegate->delete();

        return response()->json([
            'message' => 'Delegate removed successfully.',
        ]);
    }

    public function resetPassword(ResetDelegatePasswordRequest $request, $delegateId): JsonResponse
    {
        try {
            /** @var \App\Models\User $user */
            $user = $request->user();

            // Get delegate directly to avoid route model binding issues
            $delegate = User::withoutGlobalScopes()->findOrFail($delegateId);

            $this->ensureUserCanManageDelegates($user);
            $this->ensureDelegateBelongsToTenant($user, $delegate);

            $validated = $request->validated();

            if (!isset($validated['password']) || empty($validated['password'])) {
                return response()->json([
                    'message' => 'Password is required.',
                    'errors' => [
                        'password' => ['Password is required.'],
                    ],
                ], 422);
            }

            // Hash the password
            $hashedPassword = Hash::make($validated['password']);

            // Update directly using DB to bypass mutators
            $updated = DB::table('users')
                ->where('id', $delegate->id)
                ->update([
                    'password_hash' => $hashedPassword,
                    'updated_at' => now(),
                ]);

            if (!$updated) {
                throw new \Exception('Failed to update password in database.');
            }

            // Revoke all existing tokens for security (force re-login)
            $delegate->tokens()->delete();

            return response()->json([
                'message' => 'Password reset successfully. The delegate will need to log in again.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Delegate not found.',
            ], 404);
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 403);
        } catch (\Exception $e) {
            Log::error('Password reset failed', [
                'delegate_id' => $delegateId ?? null,
                'user_id' => $request->user()?->id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'An error occurred while resetting the password. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    protected function ensureDelegateBelongsToTenant(User $user, User $delegate): void
    {
        if ($delegate->landlord_id !== $user->landlord_id || $delegate->is($user)) {
            abort(403, 'You are not allowed to manage this delegate.');
        }
    }

    protected function ensureUserCanManageDelegates(User $user): void
    {
        if (! $user->isOwner() && ! $user->isAdmin() && ! $user->isManager()) {
            abort(403, 'You are not allowed to manage delegates.');
        }
    }
}

