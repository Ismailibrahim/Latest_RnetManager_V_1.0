<?php

namespace App\Http\Controllers\Api\V1\Mobile;

use App\Http\Controllers\Controller;
use App\Http\Resources\UnifiedPaymentResource;
use App\Models\RentInvoice;
use App\Models\UnifiedPayment;
use App\Models\UnifiedPaymentEntry;
use App\Services\UnifiedPayments\UnifiedPaymentService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MobilePaymentController extends Controller
{
    use AuthorizesRequests;

    /**
     * Record a payment received (simplified for mobile).
     * 
     * Accepts:
     * - amount (required)
     * - invoice_id (optional - to link payment to invoice)
     * - unit_id (optional - to find tenant_unit)
     * - tenant_unit_id (optional - direct link)
     * - payment_method (required)
     * - reference_number (optional)
     * - transaction_date (optional, defaults to today)
     * - description (optional)
     */
    public function store(Request $request, UnifiedPaymentService $service): JsonResponse
    {
        $this->authorize('create', UnifiedPaymentEntry::class);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'invoice_id' => ['nullable', 'integer', 'exists:rent_invoices,id'],
            'unit_id' => ['nullable', 'integer', 'exists:units,id'],
            'tenant_unit_id' => ['nullable', 'integer', 'exists:tenant_units,id'],
            'payment_method' => ['required', 'string', 'max:150'],
            'reference_number' => ['nullable', 'string', 'max:150'],
            'transaction_date' => ['nullable', 'date'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $user = $request->user();
        $landlordId = $user->landlord_id;

        // Determine tenant_unit_id
        $tenantUnitId = null;

        if (!empty($validated['tenant_unit_id'])) {
            // Direct tenant_unit_id provided
            $tenantUnit = \App\Models\TenantUnit::query()
                ->where('id', $validated['tenant_unit_id'])
                ->where('landlord_id', $landlordId)
                ->first();

            if (!$tenantUnit) {
                return response()->json([
                    'message' => 'Invalid tenant unit.',
                    'errors' => ['tenant_unit_id' => ['The selected tenant unit is invalid.']],
                ], 422);
            }

            $tenantUnitId = $tenantUnit->id;
        } elseif (!empty($validated['invoice_id'])) {
            // Get tenant_unit_id from invoice
            $invoice = RentInvoice::query()
                ->where('id', $validated['invoice_id'])
                ->where('landlord_id', $landlordId)
                ->first();

            if (!$invoice) {
                return response()->json([
                    'message' => 'Invalid invoice.',
                    'errors' => ['invoice_id' => ['The selected invoice is invalid.']],
                ], 422);
            }

            $tenantUnitId = $invoice->tenant_unit_id;
        } elseif (!empty($validated['unit_id'])) {
            // Find active tenant_unit for this unit
            $tenantUnit = \App\Models\TenantUnit::query()
                ->where('unit_id', $validated['unit_id'])
                ->where('landlord_id', $landlordId)
                ->where('status', 'active')
                ->first();

            if (!$tenantUnit) {
                return response()->json([
                    'message' => 'No active tenant found for this unit.',
                    'errors' => ['unit_id' => ['This unit does not have an active tenant.']],
                ], 422);
            }

            $tenantUnitId = $tenantUnit->id;
        }

        if (!$tenantUnitId) {
            return response()->json([
                'message' => 'Unable to determine tenant unit. Please provide invoice_id, unit_id, or tenant_unit_id.',
                'errors' => ['tenant_unit_id' => ['A tenant unit is required to record this payment.']],
            ], 422);
        }

        // Prepare payment entry data
        $paymentData = [
            'payment_type' => 'rent', // Default to rent for mobile payments
            'tenant_unit_id' => $tenantUnitId,
            'amount' => $validated['amount'],
            'currency' => config('app.currency', 'MVR'),
            'description' => $validated['description'] ?? 'Payment received via mobile app',
            'transaction_date' => $validated['transaction_date'] ?? now()->toDateString(),
            'status' => 'completed', // Mobile payments are typically completed immediately
            'payment_method' => $validated['payment_method'],
            'reference_number' => $validated['reference_number'] ?? null,
            'source_type' => !empty($validated['invoice_id']) ? 'rent_invoice' : null,
            'source_id' => $validated['invoice_id'] ?? null,
        ];

        DB::beginTransaction();

        try {
            // Create payment entry using the service
            $entry = $service->create($paymentData, $user);

            // If linked to an invoice, update invoice status
            if (!empty($validated['invoice_id'])) {
                $invoice = RentInvoice::find($validated['invoice_id']);
                if ($invoice && $invoice->landlord_id === $landlordId) {
                    $totalPaid = $invoice->rent_amount + ($invoice->late_fee ?? 0) - ($invoice->advance_rent_applied ?? 0);
                    
                    if ($validated['amount'] >= $totalPaid) {
                        $invoice->update([
                            'status' => 'paid',
                            'paid_date' => $paymentData['transaction_date'],
                            'payment_method' => $validated['payment_method'],
                        ]);
                    } else {
                        $invoice->update([
                            'status' => 'partial',
                        ]);
                    }
                }
            }

            DB::commit();

            // Get the unified payment view
            $payment = UnifiedPayment::query()
                ->forLandlord($landlordId)
                ->where('composite_id', sprintf('unified_payment_entry:%d', $entry->id))
                ->firstOrFail();

            return UnifiedPaymentResource::make($payment)
                ->response()
                ->setStatusCode(201);
        } catch (ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to record payment: ' . $e->getMessage(),
            ], 500);
        }
    }
}

