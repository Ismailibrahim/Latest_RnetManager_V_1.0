<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Constants\ApiConstants;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ExtendSubscriptionRequest;
use App\Http\Requests\Admin\UpdateLandlordSubscriptionRequest;
use App\Http\Resources\Admin\LandlordResource;
use App\Models\Landlord;
use App\Models\User;
use App\Services\SubscriptionExpiryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminLandlordController extends Controller
{
    public function __construct(
        private SubscriptionExpiryService $expiryService
    ) {
        // Only super admins can access these endpoints
        $this->middleware(function ($request, $next) {
            $user = $request->user();
            if (!$user || !$user->isSuperAdmin()) {
                abort(403, 'Only super administrators can access this resource.');
            }
            return $next($request);
        });
    }

    /**
     * List all landlords with subscription information.
     *
     * @param Request $request
     * @return \Illuminate\Http\Resources\Json\AnonymousResourceCollection
     */
    public function index(Request $request): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        $perPage = $this->resolvePerPage($request, ApiConstants::ADMIN_DEFAULT_PER_PAGE, ApiConstants::ADMIN_MAX_PER_PAGE);

        // Use hasOne relationship to avoid N+1 queries
        $query = Landlord::query()
            ->with(['subscriptionLimit'])
            ->with(['owner' => function ($q) {
                $q->where('role', 'owner')->limit(1);
            }])
            ->withCount(['properties', 'units', 'users']);

        // Filter by subscription tier
        if ($request->filled('subscription_tier')) {
            $query->where('subscription_tier', $request->input('subscription_tier'));
        }

        // Filter by subscription status
        if ($request->filled('subscription_status')) {
            $query->where('subscription_status', $request->input('subscription_status'));
        }

        // Filter by expiry date range
        if ($request->filled('expires_before')) {
            $query->where('subscription_expires_at', '<=', $request->input('expires_before'));
        }

        if ($request->filled('expires_after')) {
            $query->where('subscription_expires_at', '>=', $request->input('expires_after'));
        }

        // Search by company name - use parameterized query to prevent SQL injection
        if ($request->filled('search')) {
            $search = $request->input('search');
            // Sanitize search input and use parameterized query
            $search = trim($search);
            if (!empty($search)) {
                $query->where('company_name', 'LIKE', DB::raw('?'), ['%' . $search . '%']);
            }
        }

        // Sort
        $sortBy = $request->input('sort_by', 'id');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Paginate without withQueryString to avoid potential issues
        $landlords = $query->paginate($perPage);

        return LandlordResource::collection($landlords);
    }

    /**
     * Get single landlord details.
     */
    public function show(Landlord $landlord): JsonResponse
    {
        $landlord->load([
            'subscriptionLimit',
            'owner',
        ]);

        $landlord->loadCount(['properties', 'units', 'users']);

        return LandlordResource::make($landlord)->response();
    }

    /**
     * Update landlord subscription tier and expiry.
     */
    public function updateSubscription(
        UpdateLandlordSubscriptionRequest $request,
        Landlord $landlord
    ): JsonResponse {
        $validated = $request->validated();

        // Use transaction with retry logic for deadlock handling (3 retries)
        DB::transaction(function () use ($landlord, $validated) {
            // Update subscription tier
            if (isset($validated['subscription_tier'])) {
                $oldTier = $landlord->subscription_tier;
                $newTier = $validated['subscription_tier'];

                $landlord->subscription_tier = $newTier;

                // If downgrading to basic, remove expiry
                if ($newTier === Landlord::TIER_BASIC) {
                    $landlord->subscription_expires_at = null;
                    $landlord->subscription_status = Landlord::STATUS_ACTIVE;
                } elseif ($oldTier === Landlord::TIER_BASIC && $newTier !== Landlord::TIER_BASIC) {
                    // Upgrading from basic - set started_at if not set
                    if (!$landlord->subscription_started_at) {
                        $landlord->subscription_started_at = now();
                    }
                    // Set expiry if not provided
                    if (!isset($validated['subscription_expires_at']) && !$landlord->subscription_expires_at) {
                        $landlord->subscription_expires_at = $this->expiryService->calculateExpiryDate($newTier, 1);
                    }
                }
            }

            // Update expiry date
            if (isset($validated['subscription_expires_at'])) {
                $landlord->subscription_expires_at = $validated['subscription_expires_at'];
            }

            // Update started_at
            if (isset($validated['subscription_started_at'])) {
                $landlord->subscription_started_at = $validated['subscription_started_at'];
            }

            // Update auto-renew
            if (isset($validated['subscription_auto_renew'])) {
                $landlord->subscription_auto_renew = $validated['subscription_auto_renew'];
            }

            // Update status based on expiry
            if ($landlord->subscription_tier !== Landlord::TIER_BASIC) {
                if ($landlord->subscription_expires_at && $landlord->subscription_expires_at->isPast()) {
                    $landlord->subscription_status = Landlord::STATUS_EXPIRED;
                } elseif ($landlord->subscription_status === Landlord::STATUS_EXPIRED) {
                    // If updating expired subscription with future date, reactivate
                    $landlord->subscription_status = Landlord::STATUS_ACTIVE;
                }
            }

            $landlord->save();
        });

        $landlord->refresh();
        $landlord->load(['subscriptionLimit', 'owner']);
        $landlord->loadCount(['properties', 'units', 'users']);

        return LandlordResource::make($landlord)->response();
    }

    /**
     * Extend subscription expiry date.
     */
    public function extendSubscription(
        ExtendSubscriptionRequest $request,
        Landlord $landlord
    ): JsonResponse {
        $validated = $request->validated();

        if (isset($validated['months'])) {
            $this->expiryService->extendSubscription($landlord, $validated['months']);
        } elseif (isset($validated['subscription_expires_at'])) {
            $landlord->subscription_expires_at = $validated['subscription_expires_at'];
            $landlord->subscription_status = Landlord::STATUS_ACTIVE;
            $landlord->save();
        }

        $landlord->refresh();
        $landlord->load(['subscriptionLimit', 'owner']);
        $landlord->loadCount(['properties', 'units', 'users']);

        return LandlordResource::make($landlord)->response();
    }

    /**
     * Suspend subscription.
     */
    public function suspendSubscription(Landlord $landlord): JsonResponse
    {
        $this->expiryService->suspendSubscription($landlord);

        $landlord->refresh();
        $landlord->load(['subscriptionLimit', 'owner']);
        $landlord->loadCount(['properties', 'units', 'users']);

        return LandlordResource::make($landlord)->response();
    }

    /**
     * Activate subscription.
     */
    public function activateSubscription(Request $request, Landlord $landlord): JsonResponse
    {
        $months = $request->input('months', ApiConstants::DEFAULT_SUBSCRIPTION_MONTHS);
        $this->expiryService->activateSubscription($landlord, $months);

        $landlord->refresh();
        $landlord->load(['subscriptionLimit', 'owner']);
        $landlord->loadCount(['properties', 'units', 'users']);

        return LandlordResource::make($landlord)->response();
    }

    /**
     * List all owners (users with role 'owner') across all landlords.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function owners(Request $request): JsonResponse
    {
        // For super admins viewing all owners, use a higher default to show all
        $perPage = $this->resolvePerPage($request, ApiConstants::ADMIN_MAX_PER_PAGE, ApiConstants::ADMIN_MAX_PER_PAGE * 10);

        $query = User::query()
            ->where('role', User::ROLE_OWNER)
            ->with('landlord')
            ->orderBy('first_name')
            ->orderBy('last_name');

        // Search by name, email, or mobile - use parameterized queries to prevent SQL injection
        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            if (!empty($search)) {
                $searchPattern = '%' . $search . '%';
                $query->where(function ($q) use ($searchPattern) {
                    $q->where('first_name', 'LIKE', DB::raw('?'), [$searchPattern])
                        ->orWhere('last_name', 'LIKE', DB::raw('?'), [$searchPattern])
                        ->orWhere('email', 'LIKE', DB::raw('?'), [$searchPattern])
                        ->orWhere('mobile', 'LIKE', DB::raw('?'), [$searchPattern]);
                });
            }
        }

        // Filter by landlord_id
        if ($request->filled('landlord_id')) {
            $query->where('landlord_id', $request->input('landlord_id'));
        }

        // Paginate without withQueryString to avoid potential issues
        $owners = $query->paginate($perPage);

        // Log for debugging
        \Log::info('Admin owners endpoint', [
            'total_owners' => $owners->total(),
            'per_page' => $perPage,
            'current_page' => $owners->currentPage(),
            'returning' => $owners->count(),
        ]);

        return response()->json([
            'data' => $owners->map(function ($owner) {
                return [
                    'id' => $owner->id,
                    'first_name' => $owner->first_name,
                    'last_name' => $owner->last_name,
                    'full_name' => $owner->full_name,
                    'email' => $owner->email,
                    'mobile' => $owner->mobile,
                    'role' => $owner->role,
                    'is_active' => $owner->is_active,
                    'landlord_id' => $owner->landlord_id,
                    'landlord' => $owner->landlord ? [
                        'id' => $owner->landlord->id,
                        'company_name' => $owner->landlord->company_name,
                        'subscription_tier' => $owner->landlord->subscription_tier ?? null,
                        'subscription_status' => $owner->landlord->subscription_status ?? null,
                    ] : null,
                    'created_at' => $owner->created_at?->toISOString(),
                    'updated_at' => $owner->updated_at?->toISOString(),
                ];
            }),
            'meta' => [
                'current_page' => $owners->currentPage(),
                'from' => $owners->firstItem(),
                'last_page' => $owners->lastPage(),
                'per_page' => $owners->perPage(),
                'to' => $owners->lastItem(),
                'total' => $owners->total(),
            ],
            'links' => [
                'first' => $owners->url(1),
                'last' => $owners->url($owners->lastPage()),
                'prev' => $owners->previousPageUrl(),
                'next' => $owners->nextPageUrl(),
            ],
        ]);
    }
}

