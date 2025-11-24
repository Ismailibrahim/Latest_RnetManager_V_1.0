<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ExtendSubscriptionRequest;
use App\Http\Requests\Admin\UpdateLandlordSubscriptionRequest;
use App\Http\Resources\Admin\LandlordResource;
use App\Models\Landlord;
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
     */
    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request);

        $query = Landlord::query()
            ->with(['subscriptionLimit', 'users' => function ($q) {
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

        // Search by company name
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('company_name', 'like', "%{$search}%");
        }

        // Sort
        $sortBy = $request->input('sort_by', 'id');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $landlords = $query->paginate($perPage)->withQueryString();

        return LandlordResource::collection($landlords);
    }

    /**
     * Get single landlord details.
     */
    public function show(Landlord $landlord): JsonResponse
    {
        $landlord->load([
            'subscriptionLimit',
            'users' => function ($q) {
                $q->where('role', 'owner')->limit(1);
            },
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
        $landlord->load(['subscriptionLimit', 'users' => function ($q) {
            $q->where('role', 'owner')->limit(1);
        }]);
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
        $landlord->load(['subscriptionLimit', 'users' => function ($q) {
            $q->where('role', 'owner')->limit(1);
        }]);
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
        $landlord->load(['subscriptionLimit', 'users' => function ($q) {
            $q->where('role', 'owner')->limit(1);
        }]);
        $landlord->loadCount(['properties', 'units', 'users']);

        return LandlordResource::make($landlord)->response();
    }

    /**
     * Activate subscription.
     */
    public function activateSubscription(Request $request, Landlord $landlord): JsonResponse
    {
        $months = $request->input('months', 1);
        $this->expiryService->activateSubscription($landlord, $months);

        $landlord->refresh();
        $landlord->load(['subscriptionLimit', 'users' => function ($q) {
            $q->where('role', 'owner')->limit(1);
        }]);
        $landlord->loadCount(['properties', 'units', 'users']);

        return LandlordResource::make($landlord)->response();
    }
}

