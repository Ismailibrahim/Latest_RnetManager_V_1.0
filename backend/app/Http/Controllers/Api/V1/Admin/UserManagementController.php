<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\UserPermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    public function __construct(
        private UserPermissionService $permissionService
    ) {
        // Only super admins and admins can access these endpoints
        $this->middleware(function ($request, $next) {
            $user = $request->user();
            if (!$user || (!$user->isSuperAdmin() && !$user->isAdmin())) {
                abort(403, 'Only administrators can access this resource.');
            }
            return $next($request);
        });
    }

    /**
     * List all users with their roles and permissions.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $perPage = $request->input('per_page', 50);
            $search = $request->input('search');
            $roleFilter = $request->input('role');
            $statusFilter = $request->input('status'); // active, inactive, all

            $query = User::with('landlord:id,company_name');

            // Filter by role
            if ($roleFilter && $roleFilter !== 'all') {
                $query->where('role', $roleFilter);
            }

            // Filter by status
            if ($statusFilter === 'active') {
                $query->where('is_active', true);
            } elseif ($statusFilter === 'inactive') {
                $query->where('is_active', false);
            }

            // Search
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            }

            // Super admins can see all users, admins only see users from their landlord
            $currentUser = $request->user();
            if (!$currentUser->isSuperAdmin() && $currentUser->landlord_id) {
                $query->where('landlord_id', $currentUser->landlord_id);
            }

            $users = $query->orderBy('created_at', 'desc')->paginate($perPage);

            $users->getCollection()->transform(function ($user) {
                return [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'mobile' => $user->mobile,
                    'role' => $user->role,
                    'is_active' => $user->is_active,
                    'last_login_at' => $user->last_login_at?->toIso8601String(),
                    'created_at' => $user->created_at->toIso8601String(),
                    'landlord' => $user->landlord ? [
                        'id' => $user->landlord->id,
                        'company_name' => $user->landlord->company_name,
                    ] : null,
                    'permissions' => $this->permissionService->getUserPermissions($user),
                ];
            });

            return response()->json([
                'data' => $users->items(),
                'meta' => [
                    'current_page' => $users->currentPage(),
                    'last_page' => $users->lastPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch users', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to fetch users.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get user's detailed permissions.
     */
    public function getUserPermissions(Request $request, User $user): JsonResponse
    {
        try {
            // Check if current user can view this user's permissions
            $currentUser = $request->user();
            if (!$currentUser->isSuperAdmin() && $user->landlord_id !== $currentUser->landlord_id) {
                abort(403, 'You do not have permission to view this user.');
            }

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->full_name,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
                'permissions' => $this->permissionService->getUserPermissions($user),
                'role_permissions' => $this->permissionService->getRolePermissions($user->role),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch user permissions', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to fetch user permissions.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Update user role.
     */
    public function updateRole(Request $request, User $user): JsonResponse
    {
        try {
            $validated = $request->validate([
                'role' => ['required', 'string', Rule::in(User::ROLES)],
            ]);

            $currentUser = $request->user();

            // Security checks
            if ($user->isSuperAdmin() && !$currentUser->isSuperAdmin()) {
                return response()->json([
                    'message' => 'Only super administrators can modify super admin roles.',
                ], 403);
            }

            if ($user->id === $currentUser->id && $validated['role'] !== $currentUser->role) {
                return response()->json([
                    'message' => 'You cannot change your own role.',
                ], 403);
            }

            // Admins can only assign manager and agent roles (not owner or super_admin)
            if (!$currentUser->isSuperAdmin() && in_array($validated['role'], [User::ROLE_OWNER, User::ROLE_SUPER_ADMIN])) {
                return response()->json([
                    'message' => 'You do not have permission to assign this role.',
                ], 403);
            }

            $oldRole = $user->role;
            $user->update(['role' => $validated['role']]);

            Log::info('User role updated', [
                'user_id' => $user->id,
                'old_role' => $oldRole,
                'new_role' => $validated['role'],
                'updated_by' => $currentUser->id,
            ]);

            return response()->json([
                'message' => 'User role updated successfully.',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'role' => $user->role,
                    ],
                    'permissions' => $this->permissionService->getUserPermissions($user),
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to update user role', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to update user role.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get permission matrix for all roles.
     */
    public function getPermissionMatrix(): JsonResponse
    {
        try {
            return response()->json([
                'matrix' => $this->permissionService->getPermissionMatrix(),
                'resources' => $this->permissionService->getResources(),
                'roles' => User::ROLES,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch permission matrix', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to fetch permission matrix.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get available resources and actions.
     */
    public function getResources(): JsonResponse
    {
        try {
            return response()->json([
                'resources' => $this->permissionService->getResources(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch resources', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to fetch resources.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}