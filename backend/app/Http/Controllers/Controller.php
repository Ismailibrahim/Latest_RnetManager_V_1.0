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
     *
     * @param Request $request
     * @return int
     * @throws \Illuminate\Http\Exceptions\HttpResponseException
     */
    protected function getLandlordId(Request $request): int
    {
        $user = $this->getAuthenticatedUser($request);

        if (!$user->landlord_id) {
            abort(403, 'User is not associated with a landlord.');
        }

        return $user->landlord_id;
    }
}
