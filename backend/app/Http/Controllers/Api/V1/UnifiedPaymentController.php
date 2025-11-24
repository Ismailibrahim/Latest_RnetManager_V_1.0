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
            ->forLandlord($this->getLandlordId($request))
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

        try {
            $entry = $service->create($request->validated(), $this->getAuthenticatedUser($request));
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Re-throw validation exceptions as-is
            throw $e;
        } catch (\Illuminate\Database\QueryException $e) {
            \Log::error('Database error creating unified payment entry', [
                'error' => $e->getMessage(),
                'sql' => $e->getSql(),
                'bindings' => $e->getBindings(),
                'code' => $e->getCode(),
                'payload' => $request->validated(),
            ]);
            
            // Return detailed error
            return response()->json([
                'message' => $e->getMessage(),
                'error' => [
                    'message' => $e->getMessage(),
                    'code' => $e->getCode(),
                    'sql' => $e->getSql(),
                    'bindings' => $e->getBindings(),
                ],
            ], 500);
        } catch (\Exception $e) {
            \Log::error('Failed to create unified payment entry', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'payload' => $request->validated(),
                'class' => get_class($e),
            ]);
            
            // Return detailed error for debugging
            return response()->json([
                'message' => $e->getMessage(),
                'error' => [
                    'message' => $e->getMessage(),
                    'class' => get_class($e),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ],
            ], 500);
        }

        // Skip view query for now - return entry directly to avoid view-related errors
        $entry->refresh();
        
        // Load relationships if needed
        if ($entry->tenant_unit_id) {
            try {
                $entry->load('tenantUnit.tenant:id,full_name', 'tenantUnit.unit:id,unit_number');
            } catch (\Exception $e) {
                \Log::warning('Failed to load relationships', [
                    'error' => $e->getMessage(),
                    'entry_id' => $entry->id,
                ]);
            }
        }
        
        // Build response from entry directly
        $tenantUnit = $entry->tenantUnit;
        $tenant = $tenantUnit?->tenant;
        $unit = $tenantUnit?->unit;
        
        return response()->json([
            'data' => [
                'composite_id' => sprintf('unified_payment_entry:%d', $entry->id),
                'landlord_id' => $entry->landlord_id,
                'tenant_unit_id' => $entry->tenant_unit_id,
                'payment_type' => $entry->payment_type,
                'amount' => (float) $entry->amount,
                'currency' => $entry->currency,
                'description' => $entry->description,
                'transaction_date' => $entry->transaction_date?->toDateString(),
                'due_date' => $entry->due_date?->toDateString(),
                'payment_method' => $entry->payment_method,
                'reference_number' => $entry->reference_number,
                'status' => $entry->status,
                'flow_direction' => $entry->flow_direction,
                'metadata' => $entry->metadata ?? [],
                'source_type' => $entry->source_type,
                'source_id' => $entry->source_id,
                'entry_origin' => 'native',
                'unit_id' => $unit?->id,
                'tenant_name' => $tenant?->full_name,
                'vendor_name' => null,
                'invoice_number' => null,
                'created_at' => $entry->created_at?->toIso8601String(),
                'updated_at' => $entry->updated_at?->toIso8601String(),
                'captured_at' => $entry->captured_at?->toIso8601String(),
                'voided_at' => $entry->voided_at?->toIso8601String(),
            ],
        ], 201);
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
