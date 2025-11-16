<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\StoreDelegateRequest;
use App\Http\Requests\Account\UpdateDelegateRequest;
use App\Http\Resources\DelegateResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

