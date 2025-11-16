<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentMethodRequest;
use App\Http\Requests\UpdatePaymentMethodRequest;
use App\Http\Resources\PaymentMethodResource;
use App\Models\PaymentMethod;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentMethodController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', PaymentMethod::class);

        $perPage = $this->resolvePerPage($request, 25);

        $query = PaymentMethod::query()->orderBy('sort_order')->orderBy('name');

        if ($request->boolean('only_active')) {
            $query->where('is_active', true);
        }

        $methods = $query->paginate($perPage)->withQueryString();

        return PaymentMethodResource::collection($methods);
    }

    public function store(StorePaymentMethodRequest $request): JsonResponse
    {
        $method = PaymentMethod::create($request->validated());

        return PaymentMethodResource::make($method)
            ->response()
            ->setStatusCode(201);
    }

    public function show(PaymentMethod $paymentMethod)
    {
        $this->authorize('view', $paymentMethod);

        return PaymentMethodResource::make($paymentMethod);
    }

    public function update(UpdatePaymentMethodRequest $request, PaymentMethod $paymentMethod)
    {
        $validated = $request->validated();

        if (! empty($validated)) {
            $paymentMethod->update($validated);
        }

        return PaymentMethodResource::make($paymentMethod);
    }

    public function destroy(PaymentMethod $paymentMethod)
    {
        $this->authorize('delete', $paymentMethod);

        $paymentMethod->delete();

        return response()->noContent();
    }
}

