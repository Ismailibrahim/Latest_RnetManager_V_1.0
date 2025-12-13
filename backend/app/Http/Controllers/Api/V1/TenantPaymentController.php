<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\RentInvoice;
use App\Models\TenantPaymentSubmission;
use App\Models\TenantUnit;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class TenantPaymentController extends Controller
{
    use AuthorizesRequests;

    /**
     * Get tenant's active units
     */
    public function getUnits(Request $request): JsonResponse
    {
        $user = $this->getAuthenticatedUser($request);
        
        // Only allow access if user is not a landlord/admin (has no landlord_id or is a tenant user)
        // Super admins should not access tenant payment features
        if ($user->isSuperAdmin()) {
            return response()->json([
                'message' => 'Access denied. This feature is only available to tenants.',
            ], 403);
        }

        // Find tenant by user's email or phone
        // Only match if user doesn't have landlord_id (meaning they're a tenant, not a landlord)
        $tenant = \App\Models\Tenant::where(function ($query) use ($user) {
            $query->where('email', $user->email)
                  ->orWhere('phone', $user->mobile ?? $user->phone ?? '');
        })->first();

        if (!$tenant) {
            return response()->json([
                'message' => 'Access denied. No tenant account found for this user.',
            ], 403);
        }

        // Additional security: If user has landlord_id, they should not access tenant features
        // unless explicitly allowed (e.g., if email matches tenant email)
        if ($user->landlord_id && $user->landlord_id !== $tenant->landlord_id) {
            return response()->json([
                'message' => 'Access denied. This feature is only available to tenants.',
            ], 403);
        }

        // Get active tenant units for this tenant
        $tenantUnits = TenantUnit::where('tenant_id', $tenant->id)
            ->where('status', 'active')
            ->with([
                'unit:id,unit_number,property_id',
                'unit.property:id,name',
            ])
            ->get();

        return response()->json([
            'data' => $tenantUnits->map(function ($tenantUnit) {
                return [
                    'id' => $tenantUnit->id,
                    'unit_number' => $tenantUnit->unit->unit_number ?? null,
                    'property_name' => $tenantUnit->unit->property->name ?? null,
                    'monthly_rent' => $tenantUnit->monthly_rent,
                    'currency' => $tenantUnit->currency ?? 'MVR',
                ];
            }),
        ]);
    }

    /**
     * Get invoices for a specific unit
     */
    public function getInvoices(Request $request, int $tenant_unit_id): JsonResponse
    {
        $user = $this->getAuthenticatedUser($request);
        
        // Only allow access if user is not a landlord/admin
        if ($user->isSuperAdmin()) {
            return response()->json([
                'message' => 'Access denied. This feature is only available to tenants.',
            ], 403);
        }

        // Verify tenant owns this unit
        $tenant = \App\Models\Tenant::where(function ($query) use ($user) {
            $query->where('email', $user->email)
                  ->orWhere('phone', $user->mobile ?? $user->phone ?? '');
        })->first();

        if (!$tenant) {
            return response()->json([
                'message' => 'Access denied. No tenant account found for this user.',
            ], 403);
        }

        // Additional security check
        if ($user->landlord_id && $user->landlord_id !== $tenant->landlord_id) {
            return response()->json([
                'message' => 'Access denied. This feature is only available to tenants.',
            ], 403);
        }

        $tenantUnit = TenantUnit::where('id', $tenant_unit_id)
            ->where('tenant_id', $tenant->id)
            ->where('status', 'active')
            ->first();

        if (!$tenantUnit) {
            return response()->json([
                'message' => 'Unit not found or you do not have access to this unit.',
            ], 404);
        }

        // Get invoices for this unit (unpaid or pending)
        $invoices = RentInvoice::where('tenant_unit_id', $tenant_unit_id)
            ->whereIn('status', ['generated', 'pending', 'overdue'])
            ->orderBy('invoice_date', 'desc')
            ->get()
            ->map(function ($invoice) {
                $totalAmount = (float) $invoice->rent_amount 
                    + (float) $invoice->late_fee 
                    - (float) $invoice->advance_rent_applied;
                
                return [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'invoice_date' => $invoice->invoice_date?->format('Y-m-d'),
                    'due_date' => $invoice->due_date?->format('Y-m-d'),
                    'rent_amount' => (float) $invoice->rent_amount,
                    'late_fee' => (float) $invoice->late_fee,
                    'advance_rent_applied' => (float) $invoice->advance_rent_applied,
                    'total_amount' => $totalAmount,
                    'status' => $invoice->status,
                ];
            });

        return response()->json([
            'data' => $invoices,
        ]);
    }

    /**
     * Get payment submissions for a specific invoice
     */
    public function getPaymentSubmissions(Request $request, int $rent_invoice_id): JsonResponse
    {
        $user = $this->getAuthenticatedUser($request);
        
        // Only allow access if user is not a landlord/admin
        if ($user->isSuperAdmin()) {
            return response()->json([
                'message' => 'Access denied. This feature is only available to tenants.',
            ], 403);
        }

        // Verify tenant
        $tenant = \App\Models\Tenant::where(function ($query) use ($user) {
            $query->where('email', $user->email)
                  ->orWhere('phone', $user->mobile ?? $user->phone ?? '');
        })->first();

        if (!$tenant) {
            return response()->json([
                'message' => 'Access denied. No tenant account found for this user.',
            ], 403);
        }

        // Additional security check
        if ($user->landlord_id && $user->landlord_id !== $tenant->landlord_id) {
            return response()->json([
                'message' => 'Access denied. This feature is only available to tenants.',
            ], 403);
        }

        // Verify invoice belongs to tenant
        $invoice = RentInvoice::where('id', $rent_invoice_id)
            ->whereHas('tenantUnit', function ($query) use ($tenant) {
                $query->where('tenant_id', $tenant->id);
            })
            ->first();

        if (!$invoice) {
            return response()->json([
                'message' => 'Invoice not found or you do not have access to this invoice.',
            ], 404);
        }

        // Get payment submissions for this invoice
        $submissions = TenantPaymentSubmission::where('rent_invoice_id', $rent_invoice_id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($submission) {
                return [
                    'id' => $submission->id,
                    'payment_amount' => (float) $submission->payment_amount,
                    'payment_date' => $submission->payment_date?->format('Y-m-d'),
                    'payment_method' => $submission->payment_method,
                    'status' => $submission->status,
                    'notes' => $submission->notes,
                    'created_at' => $submission->created_at?->toISOString(),
                    'confirmed_at' => $submission->confirmed_at?->toISOString(),
                ];
            });

        return response()->json([
            'data' => $submissions,
        ]);
    }

    /**
     * Submit a payment
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_unit_id' => 'required|exists:tenant_units,id',
            'rent_invoice_id' => 'required|exists:rent_invoices,id',
            'payment_amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'payment_method' => 'required|in:cash,bank_deposit,bank_transfer',
            'receipt' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB max
            'notes' => 'nullable|string|max:1000',
        ]);

        $user = $this->getAuthenticatedUser($request);
        
        // Only allow access if user is not a landlord/admin
        if ($user->isSuperAdmin()) {
            return response()->json([
                'message' => 'Access denied. This feature is only available to tenants.',
            ], 403);
        }

        // Verify tenant owns this unit
        $tenant = \App\Models\Tenant::where(function ($query) use ($user) {
            $query->where('email', $user->email)
                  ->orWhere('phone', $user->mobile ?? $user->phone ?? '');
        })->first();

        if (!$tenant) {
            return response()->json([
                'message' => 'Access denied. No tenant account found for this user.',
            ], 403);
        }

        // Additional security check
        if ($user->landlord_id && $user->landlord_id !== $tenant->landlord_id) {
            return response()->json([
                'message' => 'Access denied. This feature is only available to tenants.',
            ], 403);
        }

        $tenantUnit = TenantUnit::where('id', $validated['tenant_unit_id'])
            ->where('tenant_id', $tenant->id)
            ->where('status', 'active')
            ->first();

        if (!$tenantUnit) {
            return response()->json([
                'message' => 'Unit not found or you do not have access to this unit.',
            ], 404);
        }

        // Verify invoice belongs to this unit
        $invoice = RentInvoice::where('id', $validated['rent_invoice_id'])
            ->where('tenant_unit_id', $validated['tenant_unit_id'])
            ->first();

        if (!$invoice) {
            return response()->json([
                'message' => 'Invoice not found or does not belong to this unit.',
            ], 404);
        }

        // Check for existing pending submission for this invoice
        $existingPending = TenantPaymentSubmission::where('rent_invoice_id', $validated['rent_invoice_id'])
            ->where('status', 'pending')
            ->first();

        if ($existingPending) {
            return response()->json([
                'message' => 'You already have a pending payment submission for this invoice. Please wait for the owner to confirm or reject it before submitting another payment.',
                'existing_submission' => [
                    'id' => $existingPending->id,
                    'payment_amount' => (float) $existingPending->payment_amount,
                    'payment_date' => $existingPending->payment_date?->format('Y-m-d'),
                    'status' => $existingPending->status,
                    'created_at' => $existingPending->created_at?->toISOString(),
                ],
            ], 409);
        }

        // Validate receipt is required for deposit/transfer
        if (in_array($validated['payment_method'], ['bank_deposit', 'bank_transfer']) && !$request->hasFile('receipt')) {
            throw ValidationException::withMessages([
                'receipt' => ['Receipt is required for bank deposit and bank transfer payments.'],
            ]);
        }

        DB::beginTransaction();
        try {
            $receiptPath = null;
            
            // Handle receipt upload
            if ($request->hasFile('receipt')) {
                $file = $request->file('receipt');
                $disk = config('filesystems.default', 'local');
                $directory = "tenants/{$tenant->id}/payment-receipts";
                $receiptPath = $file->store($directory, $disk);
            }

            // Create payment submission
            $submission = TenantPaymentSubmission::create([
                'tenant_unit_id' => $validated['tenant_unit_id'],
                'rent_invoice_id' => $validated['rent_invoice_id'],
                'landlord_id' => $tenantUnit->landlord_id,
                'payment_amount' => $validated['payment_amount'],
                'payment_date' => $validated['payment_date'],
                'payment_method' => $validated['payment_method'],
                'receipt_path' => $receiptPath,
                'status' => 'pending',
                'notes' => $validated['notes'] ?? null,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Payment submitted successfully. Waiting for owner confirmation.',
                'data' => [
                    'id' => $submission->id,
                    'status' => $submission->status,
                    'payment_amount' => $submission->payment_amount,
                    'payment_date' => $submission->payment_date->format('Y-m-d'),
                ],
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error submitting tenant payment', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to submit payment. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
