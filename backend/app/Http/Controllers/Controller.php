<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Http\Request;

abstract class Controller extends BaseController
{
    use AuthorizesRequests;

    protected function resolvePerPage(Request $request, int $default = 15, int $max = 100, string $param = 'per_page'): int
    {
        $perPage = $request->integer($param, $default);

        if ($perPage < 1) {
            return $default;
        }

        return (int) min($perPage, $max);
    }

    /**
     * Get the authenticated user, ensuring it exists.
     *
     * @param Request $request
     * @return \App\Models\User
     * @throws \Illuminate\Http\Exceptions\HttpResponseException
     */
    protected function getAuthenticatedUser(Request $request): \App\Models\User
    {
        $user = $request->user();

        if (!$user) {
            abort(401, 'Authentication required.');
        }

        return $user;
    }

    /**
     * Get the authenticated user's landlord_id, ensuring user and landlord_id exist.
     * Super admins may not have a landlord_id, so this will throw an error for them.
     * Use getLandlordIdOrNull() if you need to handle super admins.
     *
     * @param Request $request
     * @return int
     * @throws \Illuminate\Http\Exceptions\HttpResponseException
     */
    protected function getLandlordId(Request $request): int
    {
        $user = $this->getAuthenticatedUser($request);

        // Super admins don't have landlord_id, but this method requires it
        if (!$user->landlord_id && !$user->isSuperAdmin()) {
            abort(403, 'User is not associated with a landlord.');
        }

        // For super admins, we can't return a landlord_id
        if ($user->isSuperAdmin()) {
            abort(403, 'Super admins cannot use getLandlordId(). Use getLandlordIdOrNull() or check isSuperAdmin() first.');
        }

        return $user->landlord_id;
    }

    /**
     * Get the authenticated user's landlord_id, or null if super admin.
     *
     * @param Request $request
     * @return int|null
     * @throws \Illuminate\Http\Exceptions\HttpResponseException
     */
    protected function getLandlordIdOrNull(Request $request): ?int
    {
        $user = $this->getAuthenticatedUser($request);

        if ($user->isSuperAdmin()) {
            return null;
        }

        if (!$user->landlord_id) {
            abort(403, 'User is not associated with a landlord.');
        }

        return $user->landlord_id;
    }

    /**
     * Check if the authenticated user should filter by landlord_id.
     * Returns false for super admins, true for regular users.
     *
     * @param Request $request
     * @return bool
     */
    protected function shouldFilterByLandlord(Request $request): bool
    {
        $user = $this->getAuthenticatedUser($request);
        return !$user->isSuperAdmin();
    }
}
