<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SmsTemplate\PreviewSmsTemplateRequest;
use App\Http\Requests\SmsTemplate\StoreSmsTemplateRequest;
use App\Http\Requests\SmsTemplate\UpdateSmsTemplateRequest;
use App\Models\SmsTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SmsTemplateController extends Controller
{
    /**
     * Display a listing of SMS templates.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $landlordId = $user->landlord_id;

        $query = SmsTemplate::where('landlord_id', $landlordId)
            ->orderBy('type')
            ->orderBy('is_default', 'desc')
            ->orderBy('name');

        // Filter by type if provided
        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        $templates = $query->get();

        return response()->json([
            'data' => $templates,
        ]);
    }

    /**
     * Store a newly created SMS template.
     */
    public function store(StoreSmsTemplateRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $landlordId = $user->landlord_id;
        $validated = $request->validated();

        // If setting as default, unset other defaults for the same type
        if ($validated['is_default'] ?? false) {
            SmsTemplate::where('landlord_id', $landlordId)
                ->where('type', $validated['type'] ?? null)
                ->update(['is_default' => false]);
        }

        $template = SmsTemplate::create([
            'landlord_id' => $landlordId,
            'name' => $validated['name'],
            'type' => $validated['type'] ?? null,
            'message' => $validated['message'],
            'variables' => $validated['variables'] ?? [],
            'is_default' => $validated['is_default'] ?? false,
        ]);

        return response()->json([
            'message' => 'SMS template created successfully.',
            'data' => $template,
        ], 201);
    }

    /**
     * Display the specified SMS template.
     */
    public function show(SmsTemplate $smsTemplate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = request()->user();

        // Ensure template belongs to user's landlord
        if ($smsTemplate->landlord_id !== $user->landlord_id) {
            return response()->json([
                'message' => 'Template not found.',
            ], 404);
        }

        return response()->json([
            'data' => $smsTemplate,
        ]);
    }

    /**
     * Update the specified SMS template.
     */
    public function update(UpdateSmsTemplateRequest $request, SmsTemplate $smsTemplate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Ensure template belongs to user's landlord
        if ($smsTemplate->landlord_id !== $user->landlord_id) {
            return response()->json([
                'message' => 'Template not found.',
            ], 404);
        }

        $validated = $request->validated();

        // If setting as default, unset other defaults for the same type
        if (isset($validated['is_default']) && $validated['is_default']) {
            SmsTemplate::where('landlord_id', $smsTemplate->landlord_id)
                ->where('type', $smsTemplate->type)
                ->where('id', '!=', $smsTemplate->id)
                ->update(['is_default' => false]);
        }

        $smsTemplate->update($validated);

        return response()->json([
            'message' => 'SMS template updated successfully.',
            'data' => $smsTemplate->fresh(),
        ]);
    }

    /**
     * Remove the specified SMS template.
     */
    public function destroy(SmsTemplate $smsTemplate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = request()->user();

        // Ensure template belongs to user's landlord
        if ($smsTemplate->landlord_id !== $user->landlord_id) {
            return response()->json([
                'message' => 'Template not found.',
            ], 404);
        }

        $smsTemplate->delete();

        return response()->json([
            'message' => 'SMS template deleted successfully.',
        ]);
    }

    /**
     * Set template as default for its type.
     */
    public function setDefault(Request $request, SmsTemplate $smsTemplate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Ensure template belongs to user's landlord
        if ($smsTemplate->landlord_id !== $user->landlord_id) {
            return response()->json([
                'message' => 'Template not found.',
            ], 404);
        }

        DB::transaction(function () use ($smsTemplate) {
            // Unset other defaults for the same type
            SmsTemplate::where('landlord_id', $smsTemplate->landlord_id)
                ->where('type', $smsTemplate->type)
                ->where('id', '!=', $smsTemplate->id)
                ->update(['is_default' => false]);

            // Set this template as default
            $smsTemplate->update(['is_default' => true]);
        });

        return response()->json([
            'message' => 'Template set as default successfully.',
            'data' => $smsTemplate->fresh(),
        ]);
    }

    /**
     * Preview template with sample data.
     */
    public function preview(PreviewSmsTemplateRequest $request, SmsTemplate $smsTemplate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Ensure template belongs to user's landlord
        if ($smsTemplate->landlord_id !== $user->landlord_id) {
            return response()->json([
                'message' => 'Template not found.',
            ], 404);
        }

        $sampleData = $request->validated()['data'] ?? $this->getSampleData($smsTemplate->type);

        $rendered = $smsTemplate->render($sampleData);

        return response()->json([
            'message' => $rendered,
        ]);
    }

    /**
     * Get sample data for template type.
     *
     * @param  string|null  $type  Template type
     * @return array<string, mixed>
     */
    protected function getSampleData(?string $type): array
    {
        return match ($type) {
            'rent_due' => [
                'tenant_name' => 'John Doe',
                'unit_number' => '101',
                'amount' => '5000.00',
                'due_date' => now()->addDays(7)->format('Y-m-d'),
                'invoice_number' => 'RINV-202501-001',
            ],
            'rent_received' => [
                'tenant_name' => 'John Doe',
                'unit_number' => '101',
                'amount' => '5000.00',
                'payment_date' => now()->format('Y-m-d'),
                'invoice_number' => 'RINV-202501-001',
            ],
            'maintenance_request' => [
                'tenant_name' => 'John Doe',
                'unit_number' => '101',
                'request_title' => 'Leaky Faucet',
                'status' => 'In Progress',
                'request_number' => 'MREQ-202501-001',
            ],
            'lease_expiry' => [
                'tenant_name' => 'John Doe',
                'unit_number' => '101',
                'expiry_date' => now()->addMonths(1)->format('Y-m-d'),
            ],
            'security_deposit' => [
                'tenant_name' => 'John Doe',
                'unit_number' => '101',
                'amount' => '10000.00',
                'status' => 'Refunded',
            ],
            default => [
                'message' => 'Sample notification message',
                'date' => now()->format('Y-m-d'),
            ],
        };
    }
}

