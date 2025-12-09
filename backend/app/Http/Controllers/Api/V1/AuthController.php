<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\SignupRequest;
use App\Models\Landlord;
use App\Models\User;
use App\Services\SubscriptionExpiryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private SubscriptionExpiryService $expiryService
    ) {
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User|null $user */
        // Optimize: Select only needed columns
        $user = User::select([
            'id', 'landlord_id', 'first_name', 'last_name', 'email', 'mobile',
            'password_hash', 'is_active', 'role', 'last_login_at', 'approval_status'
        ])->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password_hash)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        // Check if user is active
        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => 'Your account has been deactivated. Please contact support.',
            ]);
        }

        // Check approval status
        if ($user->isPending()) {
            throw ValidationException::withMessages([
                'email' => 'Your account is pending approval. Please wait for administrator approval.',
            ]);
        }

        if ($user->isRejected()) {
            $reason = $user->rejected_reason ? " Reason: {$user->rejected_reason}" : '';
            throw ValidationException::withMessages([
                'email' => "Your account registration was rejected.{$reason}",
            ]);
        }

        // Load landlord to check subscription status
        $user->load('landlord:id,company_name,subscription_tier,subscription_status,subscription_expires_at');

        // Check subscription status (skip for super admins)
        if (! $user->isSuperAdmin() && $user->landlord) {
            if (! $user->landlord->isSubscriptionActive()) {
                $status = $user->landlord->subscription_status;
                $message = match($status) {
                    Landlord::STATUS_EXPIRED => 'Your subscription has expired. Please renew to continue using the system.',
                    Landlord::STATUS_SUSPENDED => 'Your subscription has been suspended. Please contact support.',
                    Landlord::STATUS_CANCELLED => 'Your subscription has been cancelled. Please contact support to reactivate.',
                    default => 'Your subscription is not active. Please contact support.',
                };
                
                throw ValidationException::withMessages([
                    'email' => $message,
                ]);
            }
        }

        $token = $user->createToken($credentials['device_name'] ?? 'api')->plainTextToken;

        // Update last login without triggering all events
        $user->forceFill([
            'last_login_at' => now(),
        ])->saveQuietly();

        // Load landlord with minimal fields
        $user->load('landlord:id,company_name,subscription_tier');

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        // Load landlord with minimal fields for performance
        $user->load('landlord:id,company_name,subscription_tier');
        
        return response()->json([
            'user' => $user,
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

    /**
     * Handle user registration/signup.
     */
    public function signup(SignupRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            DB::beginTransaction();

            // Split full_name into first_name and last_name
            $nameParts = explode(' ', trim($validated['full_name']), 2);
            $firstName = $nameParts[0];
            $lastName = $nameParts[1] ?? '';

            // Determine company name (use provided or fallback to full name)
            $companyName = $validated['company'] ?? trim($validated['full_name']);

            // Create Landlord
            $landlord = Landlord::create([
                'company_name' => $companyName,
                'subscription_tier' => $validated['subscription_tier'],
                'subscription_status' => Landlord::STATUS_ACTIVE, // Active but user needs approval
                'subscription_started_at' => now(),
                // For non-basic tiers, set expiry date (basic never expires)
                'subscription_expires_at' => $validated['subscription_tier'] !== Landlord::TIER_BASIC
                    ? $this->expiryService->calculateExpiryDate($validated['subscription_tier'], 1)
                    : null,
            ]);

            // Create User with pending approval
            $user = User::create([
                'landlord_id' => $landlord->id,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $validated['email'],
                'mobile' => $validated['mobile'],
                'password_hash' => $validated['password'],
                'role' => User::ROLE_OWNER,
                'is_active' => false, // Will be activated on approval
                'approval_status' => 'pending',
            ]);

            DB::commit();

            Log::info('New user signup', [
                'user_id' => $user->id,
                'email' => $user->email,
                'landlord_id' => $landlord->id,
                'subscription_tier' => $landlord->subscription_tier,
            ]);

            return response()->json([
                'message' => 'Signup successful. Your account is pending approval by an administrator.',
                'data' => [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'status' => 'pending',
                ],
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Signup failed', [
                'email' => $validated['email'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Registration failed. Please try again later.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get subscription limits for signup form.
     */
    public function getSubscriptionLimits(): JsonResponse
    {
        $limits = \App\Models\SubscriptionLimit::all()
            ->keyBy('tier')
            ->map(function ($limit) {
                return [
                    'tier' => $limit->tier,
                    'max_properties' => $limit->max_properties,
                    'max_units' => $limit->max_units,
                    'max_users' => $limit->max_users,
                    'monthly_price' => number_format((float) $limit->monthly_price, 2, '.', ''),
                    'features' => $limit->features ?? [],
                ];
            });

        return response()->json([
            'data' => $limits,
        ]);
    }
}

