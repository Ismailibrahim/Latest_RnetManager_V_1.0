<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CurrencyResource;
use App\Models\Currency;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class CurrencyController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', Currency::class);

        // If currencies table doesn't exist yet, return empty array
        if (!Schema::hasTable('currencies')) {
            return CurrencyResource::collection(collect([]));
        }

        $query = Currency::query()->ordered();

        if ($request->boolean('only_active')) {
            $query->active();
        }

        $currencies = $query->get();

        return CurrencyResource::collection($currencies);
    }
}

