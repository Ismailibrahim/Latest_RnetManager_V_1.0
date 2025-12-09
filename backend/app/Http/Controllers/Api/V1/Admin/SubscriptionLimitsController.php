<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSubscriptionLimitsRequest;
use App\Models\SubscriptionLimit;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubscriptionLimitsController extends Controller
{
    /**
     * Only super admins can access these endpoints.
     */
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $user = $request->user();
            if (!$user || !$user->isSuperAdmin()) {
                abort(403, 'Only super administrators can access this resource.');
            }
            return $next($request);
        });
    }

    /**
     * Get all subscription limits.
     */
    public function index(): JsonResponse
    {
        $limits = SubscriptionLimit::all()
            ->map(function ($limit) {
                return [
                    'tier' => $limit->tier,
                    'max_properties' => (int) $limit->max_properties,
                    'max_units' => (int) $limit->max_units,
                    'max_users' => (int) $limit->max_users,
                    'monthly_price' => (float) $limit->monthly_price,
                    'features' => $limit->features ?? [],
                    'created_at' => $limit->getAttribute('created_at') ? \Carbon\Carbon::parse($limit->getAttribute('created_at'))->toIso8601String() : null,
                ];
            })
            ->values(); // Reset array keys and ensure it's a proper array

        return response()->json([
            'data' => $limits->toArray(), // Explicitly convert to array
        ]);
    }

    /**
     * Update subscription limits for a specific tier.
     */
    public function update(UpdateSubscriptionLimitsRequest $request, string $tier): JsonResponse
    {
        $validated = $request->validated();

        try {
            DB::beginTransaction();

            $limit = SubscriptionLimit::find($tier);

            if (!$limit) {
                return response()->json([
                    'message' => 'Subscription tier not found.',
                ], 404);
            }

            // Update limits
            $limit->update([
                'max_properties' => $validated['max_properties'],
                'max_units' => $validated['max_units'],
                'max_users' => $validated['max_users'],
                'monthly_price' => $validated['monthly_price'],
                'features' => $validated['features'] ?? $limit->features,
            ]);

            DB::commit();

            Log::info('Subscription limits updated', [
                'tier' => $tier,
                'updated_by' => $request->user()->id,
                'limits' => $validated,
            ]);

            return response()->json([
                'message' => 'Subscription limits updated successfully.',
                'data' => [
                    'tier' => $limit->tier,
                    'max_properties' => $limit->max_properties,
                    'max_units' => $limit->max_units,
                    'max_users' => $limit->max_users,
                    'monthly_price' => number_format((float) $limit->monthly_price, 2, '.', ''),
                    'features' => $limit->features ?? [],
                ],
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update subscription limits', [
                'tier' => $tier,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to update subscription limits.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
