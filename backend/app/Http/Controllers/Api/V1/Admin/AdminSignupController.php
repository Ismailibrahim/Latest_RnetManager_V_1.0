<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RejectSignupRequest;
use App\Models\Landlord;
use App\Models\User;
use App\Services\SubscriptionExpiryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class AdminSignupController extends Controller
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
     * List all pending signups.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // Log that we're entering the method
            Log::info('AdminSignupController::index called', [
                'user_id' => $request->user()?->id,
                'is_super_admin' => $request->user()?->isSuperAdmin(),
            ]);
            
            // Check database connection
            try {
                DB::connection()->getPdo();
            } catch (\Exception $e) {
                Log::error('Database connection failed', ['error' => $e->getMessage()]);
                return response()->json([
                    'message' => 'Database connection failed. Please check your database configuration.',
                    'error' => 'Database connection error',
                ], 500);
            }
            
            // Check if approval_status column exists
            if (!Schema::hasColumn('users', 'approval_status')) {
                Log::error('approval_status column does not exist in users table');
                return response()->json([
                    'message' => 'Database migration required. Please run: php artisan migrate',
                    'error' => 'approval_status column missing',
                ], 500);
            }

            // Resolve per page with safe defaults
            try {
                $perPage = $this->resolvePerPage($request);
            } catch (\Exception $e) {
                Log::warning('Error resolving per page', ['error' => $e->getMessage()]);
                $perPage = 15; // Safe default
            }

            // Build query step by step for better error handling
            $query = User::query();
            
            // Add where clauses
            $query->where('approval_status', 'pending')
                  ->where('role', User::ROLE_OWNER)
                  ->whereNotNull('landlord_id');
            
            // Eager load landlord with selected columns
            $query->with(['landlord' => function ($q) {
                $q->select('id', 'company_name', 'subscription_tier');
            }]);
            
            // Order by created_at
            $query->orderBy('created_at', 'desc');

            // Filter by subscription tier
            if ($request->filled('subscription_tier')) {
                $query->whereHas('landlord', function ($q) use ($request) {
                    $q->where('subscription_tier', $request->input('subscription_tier'));
                });
            }

            // Search by email, name, or company
            if ($request->filled('search')) {
                $search = $request->input('search');
                $query->where(function ($q) use ($search) {
                    $q->where('email', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhereHas('landlord', function ($landlordQuery) use ($search) {
                            $landlordQuery->where('company_name', 'like', "%{$search}%");
                        });
                });
            }

            // Execute query and paginate (without withQueryString to avoid issues)
            Log::info('Executing signups query', ['per_page' => $perPage]);
            
            $signups = $query->paginate($perPage);
            
            Log::info('Query executed successfully', [
                'total' => $signups->total(),
                'count' => $signups->count(),
            ]);

            // Build pagination links defensively
            $links = [
                'first' => null,
                'last' => null,
                'prev' => null,
                'next' => null,
            ];
            
            // Only build links if we have valid pagination data
            if ($signups && $signups->total() > 0) {
                try {
                    $links['prev'] = $signups->previousPageUrl();
                } catch (\Exception $e) {
                    Log::warning('Could not get previous page URL', ['error' => $e->getMessage()]);
                }
                
                try {
                    $links['next'] = $signups->nextPageUrl();
                } catch (\Exception $e) {
                    Log::warning('Could not get next page URL', ['error' => $e->getMessage()]);
                }
                
                try {
                    $currentPage = $signups->currentPage();
                    $lastPage = $signups->lastPage();
                    
                    if ($currentPage > 0 && $lastPage > 0) {
                        $links['first'] = $signups->url(1);
                        if ($lastPage > 1) {
                            $links['last'] = $signups->url($lastPage);
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning('Could not build first/last page URLs', ['error' => $e->getMessage()]);
                }
            }

            // Build pagination response
            $response = [
                'data' => $signups->items(),
                'meta' => [
                    'current_page' => $signups->currentPage(),
                    'last_page' => $signups->lastPage(),
                    'per_page' => $signups->perPage(),
                    'total' => $signups->total(),
                ],
                'links' => $links,
            ];

            return response()->json($response);
        } catch (\Throwable $e) {
            // Log detailed error information
            $errorMessage = $e->getMessage();
            $errorFile = $e->getFile();
            $errorLine = $e->getLine();
            $errorClass = get_class($e);
            
            $errorDetails = [
                'error' => $errorMessage,
                'file' => $errorFile,
                'line' => $errorLine,
                'class' => $errorClass,
                'trace' => $e->getTraceAsString(),
            ];
            
            Log::error('Failed to fetch signups', $errorDetails);
            
            // Return detailed error in response for debugging
            try {
                return response()->json([
                    'message' => 'Failed to fetch signups.',
                    'error' => $errorMessage,
                    'file' => $errorFile,
                    'line' => $errorLine,
                    'class' => $errorClass,
                ], 500);
            } catch (\Exception $jsonError) {
                // If JSON encoding fails, return plain text
                Log::error('Failed to encode error response', ['error' => $jsonError->getMessage()]);
                return response("Failed to fetch signups. Error: {$errorMessage} in {$errorFile}:{$errorLine}", 500)
                    ->header('Content-Type', 'text/plain');
            }
        }
    }

    /**
     * Approve a pending signup.
     */
    public function approve(Request $request, User $user): JsonResponse
    {
        // Verify user is pending
        if (!$user->isPending()) {
            return response()->json([
                'message' => 'This user is not pending approval.',
            ], 422);
        }

        // Verify user is owner role
        if (!$user->isOwner()) {
            return response()->json([
                'message' => 'Only owner signups can be approved through this endpoint.',
            ], 422);
        }

        try {
            DB::beginTransaction();

            $approver = $request->user();

            // Update user
            $user->update([
                'approval_status' => 'approved',
                'approved_at' => now(),
                'approved_by' => $approver->id,
                'is_active' => true,
            ]);

            // Ensure landlord subscription is active (it should already be active from signup)
            $landlord = $user->landlord;
            if ($landlord) {
                // Activate subscription if not already set properly
                if ($landlord->subscription_status !== Landlord::STATUS_ACTIVE) {
                    $landlord->subscription_status = Landlord::STATUS_ACTIVE;
                }
                
                // Ensure subscription_started_at is set
                if (!$landlord->subscription_started_at) {
                    $landlord->subscription_started_at = now();
                }

                // For non-basic tiers, ensure expiry date is set
                if ($landlord->subscription_tier !== Landlord::TIER_BASIC && !$landlord->subscription_expires_at) {
                    $landlord->subscription_expires_at = $this->expiryService->calculateExpiryDate(
                        $landlord->subscription_tier,
                        1
                    );
                }

                $landlord->save();
            }

            DB::commit();

            Log::info('User signup approved', [
                'user_id' => $user->id,
                'email' => $user->email,
                'approved_by' => $approver->id,
                'landlord_id' => $landlord?->id,
            ]);

            $user->load('landlord:id,company_name,subscription_tier,subscription_status');

            return response()->json([
                'message' => 'User signup approved successfully.',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'email' => $user->email,
                        'full_name' => $user->full_name,
                        'approval_status' => $user->approval_status,
                        'approved_at' => $user->approved_at?->toIso8601String(),
                    ],
                    'landlord' => $landlord ? [
                        'id' => $landlord->id,
                        'company_name' => $landlord->company_name,
                        'subscription_tier' => $landlord->subscription_tier,
                        'subscription_status' => $landlord->subscription_status,
                    ] : null,
                ],
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to approve user signup', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to approve user signup.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Reject a pending signup.
     */
    public function reject(RejectSignupRequest $request, User $user): JsonResponse
    {
        // Verify user is pending
        if (!$user->isPending()) {
            return response()->json([
                'message' => 'This user is not pending approval.',
            ], 422);
        }

        // Verify user is owner role
        if (!$user->isOwner()) {
            return response()->json([
                'message' => 'Only owner signups can be rejected through this endpoint.',
            ], 422);
        }

        try {
            $rejector = $request->user();
            $validated = $request->validated();

            $user->update([
                'approval_status' => 'rejected',
                'is_active' => false,
                'rejected_at' => now(),
                'rejected_reason' => $validated['rejection_reason'],
            ]);

            Log::info('User signup rejected', [
                'user_id' => $user->id,
                'email' => $user->email,
                'rejected_by' => $rejector->id,
                'rejection_reason' => $validated['rejection_reason'],
            ]);

            return response()->json([
                'message' => 'User signup rejected successfully.',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'email' => $user->email,
                        'approval_status' => $user->approval_status,
                        'rejected_at' => $user->rejected_at?->toIso8601String(),
                    ],
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to reject user signup', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to reject user signup.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
