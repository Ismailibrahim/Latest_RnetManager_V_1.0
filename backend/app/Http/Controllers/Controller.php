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
}
