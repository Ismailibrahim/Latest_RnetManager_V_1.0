<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CaptureUnifiedPaymentEntryRequest;
use App\Http\Requests\ListUnifiedPaymentsRequest;
use App\Http\Requests\StoreUnifiedPaymentEntryRequest;
use App\Http\Requests\VoidUnifiedPaymentEntryRequest;
use App\Http\Resources\UnifiedPaymentResource;
use App\Models\UnifiedPayment;
use App\Models\UnifiedPaymentEntry;
use App\Services\UnifiedPayments\UnifiedPaymentService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class UnifiedPaymentController extends Controller
{
    use AuthorizesRequests;

    public function index(ListUnifiedPaymentsRequest $request)
    {
        $this->authorize('viewAny', UnifiedPayment::class);

        $perPage = $this->resolvePerPage($request);

        $query = UnifiedPayment::query()
            ->forLandlord($request->user()->landlord_id)
            ->orderByDesc('transaction_date')
            ->orderByDesc('composite_id');

        if ($paymentType = $request->input('payment_type')) {
            $query->where('payment_type', $paymentType);
        }

        if ($flowDirection = $request->input('flow_direction')) {
            $query->where('flow_direction', $flowDirection);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($tenantUnitId = $request->input('tenant_unit_id')) {
            $query->where('tenant_unit_id', $tenantUnitId);
        }

        if ($unitId = $request->input('unit_id')) {
            $query->where('unit_id', $unitId);
        }

        if ($entryOrigin = $request->input('entry_origin')) {
            $query->where('entry_origin', $entryOrigin);
        }

        if ($sourceType = $request->input('source_type')) {
            $query->where('source_type', $sourceType);
        }

        if ($compositeId = $request->input('composite_id')) {
            $query->where('composite_id', $compositeId);
        }

        if ($request->filled('from')) {
            $query->whereDate('transaction_date', '>=', $request->input('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('transaction_date', '<=', $request->input('to'));
        }

        $payments = $query
            ->paginate($perPage)
            ->withQueryString();

        return UnifiedPaymentResource::collection($payments);
    }

    public function store(
        StoreUnifiedPaymentEntryRequest $request,
        UnifiedPaymentService $service
    ): JsonResponse {
        $this->authorize('create', UnifiedPaymentEntry::class);

        $entry = $service->create($request->validated(), $request->user());

        $payment = UnifiedPayment::query()
            ->forLandlord($request->user()->landlord_id)
            ->where('composite_id', sprintf('unified_payment_entry:%d', $entry->id))
            ->firstOrFail();

        return UnifiedPaymentResource::make($payment)
            ->response()
            ->setStatusCode(201);
    }

    public function show(UnifiedPayment $payment): UnifiedPaymentResource
    {
        $this->authorize('view', $payment);

        return UnifiedPaymentResource::make($payment);
    }

    public function capture(
        UnifiedPayment $payment,
        CaptureUnifiedPaymentEntryRequest $request,
        UnifiedPaymentService $service
    ): UnifiedPaymentResource {
        $entry = $this->resolveNativeEntry($payment);

        $this->authorize('update', $entry);

        $service->capture($entry, $request->validated());

        $payment->refresh();

        return UnifiedPaymentResource::make($payment);
    }

    public function void(
        UnifiedPayment $payment,
        VoidUnifiedPaymentEntryRequest $request,
        UnifiedPaymentService $service
    ): UnifiedPaymentResource {
        $entry = $this->resolveNativeEntry($payment);

        $this->authorize('update', $entry);

        $service->void($entry, $request->validated());

        $payment->refresh();

        return UnifiedPaymentResource::make($payment);
    }

    private function resolveNativeEntry(UnifiedPayment $payment): UnifiedPaymentEntry
    {
        if ($payment->entry_origin !== 'native') {
            throw new UnprocessableEntityHttpException('This operation is only available for native unified payments.');
        }

        [$prefix, $identifier] = explode(':', $payment->composite_id) + [null, null];

        if ($prefix !== 'unified_payment_entry' || ! $identifier) {
            throw new UnprocessableEntityHttpException('Unable to resolve underlying payment entry.');
        }

        return UnifiedPaymentEntry::query()->findOrFail($identifier);
    }
}
