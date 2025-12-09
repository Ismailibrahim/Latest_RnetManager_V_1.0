<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\DocumentTemplate\PreviewDocumentTemplateRequest;
use App\Http\Requests\DocumentTemplate\StoreDocumentTemplateRequest;
use App\Http\Requests\DocumentTemplate\UpdateDocumentTemplateRequest;
use App\Models\DocumentTemplate;
use App\Services\DocumentTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentTemplateController extends Controller
{
    public function __construct(
        private readonly DocumentTemplateService $templateService
    ) {
    }

    /**
     * Display a listing of document templates.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Super admins can view all templates, others only their landlord's
        if ($user->isSuperAdmin()) {
            $query = DocumentTemplate::whereNotNull('landlord_id')
                ->orderBy('type')
                ->orderBy('is_default', 'desc')
                ->orderBy('name');
        } else {
            $landlordId = $user->landlord_id;
            if (!$landlordId) {
                return response()->json([
                    'message' => 'User is not associated with a landlord.',
                ], 403);
            }

            $query = DocumentTemplate::where('landlord_id', $landlordId)
                ->orderBy('type')
                ->orderBy('is_default', 'desc')
                ->orderBy('name');
        }

        // Filter by type if provided
        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        $templates = $query->get();

        // Also include default templates (system-wide)
        $defaultTemplates = DocumentTemplate::whereNull('landlord_id')
            ->where('is_default', true)
            ->orderBy('type')
            ->get();

        return response()->json([
            'data' => $templates,
            'defaults' => $defaultTemplates,
        ]);
    }

    /**
     * Store a newly created document template.
     */
    public function store(StoreDocumentTemplateRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $validated = $request->validated();

        // Super admins must specify landlord_id when creating templates
        if ($user->isSuperAdmin()) {
            if (!isset($validated['landlord_id'])) {
                return response()->json([
                    'message' => 'Super admin must specify landlord_id when creating document templates.',
                    'errors' => [
                        'landlord_id' => ['The landlord_id field is required for super admin users.'],
                    ],
                ], 422);
            }
            $landlordId = $validated['landlord_id'];
        } else {
            $landlordId = $user->landlord_id;
            if (!$landlordId) {
                return response()->json([
                    'message' => 'User is not associated with a landlord.',
                ], 403);
            }
        }

        // If setting as default, unset other defaults for the same type
        if ($validated['is_default'] ?? false) {
            DocumentTemplate::where('landlord_id', $landlordId)
                ->where('type', $validated['type'])
                ->update(['is_default' => false]);
        }

        $template = DocumentTemplate::create([
            'landlord_id' => $landlordId,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'template_html' => $validated['template_html'],
            'variables' => $validated['variables'] ?? [],
            'is_default' => $validated['is_default'] ?? false,
        ]);

        return response()->json([
            'message' => 'Document template created successfully.',
            'data' => $template,
        ], 201);
    }

    /**
     * Display the specified document template.
     */
    public function show(DocumentTemplate $documentTemplate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = request()->user();

        // Super admins can view any template, others only their landlord's or system defaults
        if (!$user->isSuperAdmin()) {
            if ($documentTemplate->landlord_id !== null && $documentTemplate->landlord_id !== $user->landlord_id) {
                return response()->json([
                    'message' => 'Template not found.',
                ], 404);
            }
        }

        return response()->json([
            'data' => $documentTemplate,
        ]);
    }

    /**
     * Update the specified document template.
     */
    public function update(UpdateDocumentTemplateRequest $request, DocumentTemplate $documentTemplate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Cannot edit system defaults (even super admins)
        if ($documentTemplate->landlord_id === null) {
            return response()->json([
                'message' => 'Cannot edit system default templates. Create a custom template instead.',
            ], 403);
        }

        // Super admins can update any template, others only their landlord's
        if (!$user->isSuperAdmin()) {
            if ($documentTemplate->landlord_id !== $user->landlord_id) {
                return response()->json([
                    'message' => 'Template not found.',
                ], 404);
            }
        }

        $validated = $request->validated();

        // If setting as default, unset other defaults for the same type
        if (isset($validated['is_default']) && $validated['is_default']) {
            DocumentTemplate::where('landlord_id', $documentTemplate->landlord_id)
                ->where('type', $documentTemplate->type)
                ->where('id', '!=', $documentTemplate->id)
                ->update(['is_default' => false]);
        }

        $documentTemplate->update($validated);

        return response()->json([
            'message' => 'Document template updated successfully.',
            'data' => $documentTemplate->fresh(),
        ]);
    }

    /**
     * Remove the specified document template.
     */
    public function destroy(DocumentTemplate $documentTemplate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = request()->user();

        // Cannot delete system defaults (even super admins)
        if ($documentTemplate->landlord_id === null) {
            return response()->json([
                'message' => 'Cannot delete system default templates.',
            ], 403);
        }

        // Super admins can delete any template, others only their landlord's
        if (!$user->isSuperAdmin()) {
            if ($documentTemplate->landlord_id !== $user->landlord_id) {
                return response()->json([
                    'message' => 'Template not found.',
                ], 404);
            }
        }

        $documentTemplate->delete();

        return response()->json([
            'message' => 'Document template deleted successfully.',
        ]);
    }

    /**
     * Set template as default for its type.
     */
    public function setDefault(Request $request, DocumentTemplate $documentTemplate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Cannot set system defaults (they're already default)
        if ($documentTemplate->landlord_id === null) {
            return response()->json([
                'message' => 'System default templates are already set as default.',
            ], 403);
        }

        // Super admins can set any template as default, others only their landlord's
        if (!$user->isSuperAdmin()) {
            if ($documentTemplate->landlord_id !== $user->landlord_id) {
                return response()->json([
                    'message' => 'Template not found.',
                ], 404);
            }
        }

        DB::transaction(function () use ($documentTemplate) {
            // Unset other defaults for the same type
            DocumentTemplate::where('landlord_id', $documentTemplate->landlord_id)
                ->where('type', $documentTemplate->type)
                ->where('id', '!=', $documentTemplate->id)
                ->update(['is_default' => false]);

            // Set this template as default
            $documentTemplate->update(['is_default' => true]);
        });

        return response()->json([
            'message' => 'Template set as default successfully.',
            'data' => $documentTemplate->fresh(),
        ]);
    }

    /**
     * Preview template with sample data.
     */
    public function preview(PreviewDocumentTemplateRequest $request, DocumentTemplate $documentTemplate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Super admins can preview any template, others only their landlord's or system defaults
        if (!$user->isSuperAdmin()) {
            if ($documentTemplate->landlord_id !== null && $documentTemplate->landlord_id !== $user->landlord_id) {
                return response()->json([
                    'message' => 'Template not found.',
                ], 404);
            }
        }

        $sampleData = $request->validated()['data'] ?? $this->getSampleData($documentTemplate->type);

        $rendered = $this->templateService->renderTemplate($documentTemplate->template_html, $sampleData);

        return response()->json([
            'html' => $rendered,
        ]);
    }

    /**
     * Get sample data for template type.
     *
     * @param  string  $type  Template type
     * @return array<string, mixed>
     */
    protected function getSampleData(string $type): array
    {
        $baseData = [
            'company' => [
                'name' => 'Rental Management Suite',
                'address' => '123 Business Street, Malé, Maldives',
                'phone' => '+960 123-4567',
                'email' => 'info@rentalmanagement.com',
            ],
            'customer' => [
                'name' => 'John Doe',
                'phone' => '+960 987-6543',
                'email' => 'john.doe@example.com',
            ],
            'unit' => [
                'number' => '101',
            ],
            'property' => [
                'name' => 'Ocean View Apartments',
            ],
        ];

        return match ($type) {
            'rent_invoice' => array_merge($baseData, [
                'document' => [
                    'number' => 'RINV-202501-001',
                    'date' => now()->format('d M Y'),
                    'due_date' => now()->addDays(7)->format('d M Y'),
                    'status' => 'generated',
                    'payment_method' => '',
                ],
                'amount' => [
                    'rent' => '15000.00',
                    'late_fee' => '0.00',
                    'subtotal' => '15000.00',
                    'advance_rent_applied' => '0.00',
                    'total' => '15000.00',
                    'amount_due' => '15000.00',
                    'currency' => 'MVR',
                ],
                'advance_rent' => [
                    'applied' => false,
                    'amount' => '0.00',
                    'fully_covered' => false,
                ],
            ]),
            'maintenance_invoice' => array_merge($baseData, [
                'document' => [
                    'number' => 'MINV-202501-001',
                    'date' => now()->format('d M Y'),
                    'due_date' => now()->addDays(7)->format('d M Y'),
                    'status' => 'generated',
                    'payment_method' => '',
                    'reference_number' => '',
                    'notes' => 'Sample maintenance work completed',
                ],
                'amount' => [
                    'labor_cost' => '500.00',
                    'parts_cost' => '300.00',
                    'misc_amount' => '0.00',
                    'cost' => '800.00',
                    'subtotal' => '800.00',
                    'tax' => '48.00',
                    'discount' => '0.00',
                    'total' => '848.00',
                    'currency' => 'MVR',
                ],
                'maintenance_request' => [
                    'id' => '1',
                    'description' => 'Fix leaking faucet',
                ],
            ]),
            'security_deposit_slip' => array_merge($baseData, [
                'document' => [
                    'number' => 'SD-202501-001',
                    'date' => now()->format('d M Y'),
                    'status' => 'completed',
                    'payment_method' => 'BANK TRANSFER',
                ],
                'amount' => [
                    'total' => '10000.00',
                    'currency' => 'MVR',
                ],
                'payment' => [
                    'type' => 'Security Deposit',
                    'description' => 'Security deposit collection',
                    'reference_number' => 'REF-123456',
                ],
            ]),
            'advance_rent_receipt' => array_merge($baseData, [
                'document' => [
                    'number' => 'AR-202501-001',
                    'date' => now()->format('d M Y'),
                    'paid_date' => now()->format('d M Y'),
                    'status' => 'completed',
                    'payment_method' => 'BANK TRANSFER',
                    'reference_number' => 'REF-123456',
                ],
                'amount' => [
                    'total' => '45000.00',
                    'currency' => 'MVR',
                ],
                'advance_rent' => [
                    'months' => '3',
                    'amount' => '45000.00',
                    'collected_date' => now()->format('d M Y'),
                ],
            ]),
            'fee_collection_receipt' => array_merge($baseData, [
                'document' => [
                    'number' => 'FEE-202501-001',
                    'date' => now()->format('d M Y'),
                    'status' => 'completed',
                    'payment_method' => 'CASH',
                ],
                'amount' => [
                    'total' => '500.00',
                    'currency' => 'MVR',
                ],
                'payment' => [
                    'type' => 'Fee',
                    'description' => 'Late fee collection',
                    'reference_number' => 'REF-123456',
                ],
            ]),
            'security_deposit_refund' => array_merge($baseData, [
                'document' => [
                    'number' => 'SDR-202501-001',
                    'receipt_number' => 'RCPT-202501-001',
                    'date' => now()->format('d M Y'),
                    'status' => 'processed',
                    'payment_method' => 'BANK TRANSFER',
                    'transaction_reference' => 'TXN-123456',
                ],
                'amount' => [
                    'original_deposit' => '10000.00',
                    'deductions' => '500.00',
                    'total' => '9500.00',
                    'currency' => 'MVR',
                ],
                'deduction_reasons' => ['Cleaning fee', 'Minor repairs'],
            ]),
            'other_income_receipt' => array_merge($baseData, [
                'document' => [
                    'number' => 'OI-202501-001',
                    'date' => now()->format('d M Y'),
                    'status' => 'completed',
                    'payment_method' => 'CASH',
                ],
                'amount' => [
                    'total' => '2000.00',
                    'currency' => 'MVR',
                ],
                'payment' => [
                    'type' => 'Other Income',
                    'description' => 'Parking fee collection',
                    'reference_number' => 'REF-123456',
                ],
            ]),
            'payment_voucher' => array_merge($baseData, [
                'document' => [
                    'number' => 'VOUCHER-202501-001',
                    'date' => now()->format('d M Y'),
                    'status' => 'completed',
                    'payment_method' => 'BANK TRANSFER',
                ],
                'amount' => [
                    'total' => '5000.00',
                    'currency' => 'MVR',
                ],
                'payment' => [
                    'type' => 'Maintenance Expense',
                    'description' => 'Vendor payment',
                    'reference_number' => 'REF-123456',
                ],
            ]),
            'unified_payment_entry' => array_merge($baseData, [
                'document' => [
                    'number' => 'PAYMENT-202501-001',
                    'date' => now()->format('d M Y'),
                    'status' => 'completed',
                    'payment_method' => 'BANK TRANSFER',
                    'type' => 'Receipt',
                ],
                'amount' => [
                    'total' => '15000.00',
                    'currency' => 'MVR',
                ],
                'payment' => [
                    'type' => 'Rent',
                    'description' => 'Monthly rent payment',
                    'reference_number' => 'REF-123456',
                    'flow_direction' => 'income',
                ],
            ]),
            default => $baseData,
        };
    }
}
