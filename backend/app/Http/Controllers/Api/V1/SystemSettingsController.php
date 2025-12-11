<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateCompanySettingsRequest;
use App\Http\Requests\Settings\UpdateCurrencySettingsRequest;
use App\Http\Requests\Settings\UpdateDocumentSettingsRequest;
use App\Http\Requests\Settings\UpdateInvoiceNumberingRequest;
use App\Http\Requests\Settings\UpdatePaymentTermsRequest;
use App\Http\Requests\Settings\UpdateSystemPreferencesRequest;
use App\Http\Requests\Settings\UpdateSystemSettingsRequest;
use App\Http\Requests\Settings\UpdateTaxSettingsRequest;
use App\Http\Requests\Settings\UpdateEmailSettingsRequest;
use App\Http\Requests\Settings\TestEmailRequest;
use App\Http\Requests\Settings\UpdateSmsSettingsRequest;
use App\Http\Requests\Settings\TestSmsRequest;
use App\Http\Requests\Settings\UpdateTelegramSettingsRequest;
use App\Http\Requests\Settings\TestTelegramRequest;
use App\Services\Email\EmailServiceFactory;
use App\Services\Sms\SmsServiceFactory;
use App\Services\SmsNotificationService;
use App\Services\TelegramNotificationService;
use App\Services\Telegram\TelegramService;
use App\Helpers\EmailConfigHelper;
use App\Helpers\SmsConfigHelper;
use App\Helpers\TelegramConfigHelper;
use App\Http\Resources\SystemSettingsResource;
use App\Models\LandlordSetting;
use App\Services\SystemSettingsService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SystemSettingsController extends Controller
{
    public function __construct(
        private readonly SystemSettingsService $settingsService
    ) {
    }

    /**
     * NOTE: CORS headers are now handled by ForceCors middleware
     * This method is kept for backward compatibility but is no longer used
     * All CORS headers are automatically added by middleware to all API responses
     * 
     * @deprecated Use ForceCors middleware instead
     */
    private function getCorsHeaders(Request $request): array
    {
        // CORS is handled by ForceCors middleware - this method is deprecated
        return [];
    }

    /**
     * Get landlord_id for the current request, handling super admins.
     * Optimized: Super admins can use default (first landlord) if none specified.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  bool  $required  Whether landlord_id is required (false for GET, true for POST/PATCH)
     * @return int|\Illuminate\Http\JsonResponse|null
     */
    protected function getLandlordIdForSettings(Request $request, bool $required = true): int|\Illuminate\Http\JsonResponse|null
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $corsHeaders = $this->getCorsHeaders($request);

        // Super admins can specify landlord_id, or use default (first landlord)
        if ($user->isSuperAdmin()) {
            $landlordId = $request->input('landlord_id');
            
            if (! $landlordId) {
                // For GET requests, try to use first landlord as default
                if (! $required) {
                    try {
                        $startTime = microtime(true);
                        $firstLandlord = \App\Models\Landlord::orderBy('id')->limit(1)->first();
                        
                        $duration = microtime(true) - $startTime;
                        if ($duration > 2) {
                            Log::warning('SystemSettingsController: Default landlord query took longer than 2 seconds', [
                                'duration' => $duration,
                            ]);
                        }
                        
                        if ($firstLandlord) {
                            Log::info('SystemSettingsController: Super admin using default landlord', [
                                'landlord_id' => $firstLandlord->id,
                                'duration' => round($duration, 3),
                            ]);
                            return $firstLandlord->id;
                        }
                    } catch (\Exception $e) {
                        Log::warning('SystemSettingsController: Could not get default landlord', [
                            'error' => $e->getMessage(),
                            'file' => $e->getFile(),
                            'line' => $e->getLine(),
                        ]);
                    }
                    // Return null if no landlords exist
                    return null;
                }
                
                // For POST/PATCH in settings, allow using default (first) landlord
                // This makes it easier for super admins to configure default settings
                try {
                    $startTime = microtime(true);
                    $firstLandlord = \App\Models\Landlord::orderBy('id')->limit(1)->first();
                    
                    $duration = microtime(true) - $startTime;
                    if ($duration > 2) {
                        Log::warning('SystemSettingsController: Default landlord query took longer than 2 seconds', [
                            'duration' => $duration,
                        ]);
                    }
                    
                    if ($firstLandlord) {
                        Log::info('SystemSettingsController: Super admin using default landlord for PATCH', [
                            'landlord_id' => $firstLandlord->id,
                            'duration' => round($duration, 3),
                        ]);
                        return $firstLandlord->id;
                    }
                } catch (\Exception $e) {
                    Log::warning('SystemSettingsController: Could not get default landlord for PATCH', [
                        'error' => $e->getMessage(),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                    ]);
                }
                
                // If no landlords exist, require landlord_id
                $response = response()->json([
                    'message' => 'Super admin must specify landlord_id. No default landlord found.',
                    'errors' => [
                        'landlord_id' => ['The landlord_id parameter is required for super admin users.'],
                    ],
                ], 422, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                
                // CORS headers are handled by ForceCors middleware
                return $response;
            }
            
            // Validate landlord exists (with timeout protection)
            try {
                $startTime = microtime(true);
                $landlord = \App\Models\Landlord::find($landlordId);
                
                $duration = microtime(true) - $startTime;
                if ($duration > 2) {
                    Log::warning('SystemSettingsController: Landlord validation query took longer than 2 seconds', [
                        'duration' => $duration,
                        'landlord_id' => $landlordId,
                    ]);
                }
                
                if (!$landlord) {
                    // CRITICAL: Use response()->json() to return JsonResponse
                    $response = response()->json([
                        'message' => 'Landlord not found.',
                        'errors' => [
                            'landlord_id' => ['The specified landlord does not exist.'],
                        ],
                    ], 404, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                    
                    foreach ($corsHeaders as $key => $value) {
                        $response->header($key, $value);
                    }
                    
                    return $response;
                }
            } catch (\Exception $e) {
                Log::error('SystemSettingsController: Error validating landlord', [
                    'landlord_id' => $landlordId,
                    'error' => $e->getMessage(),
                ]);
            }
            
            return (int) $landlordId;
        }

        // Regular users use their own landlord_id
        $landlordId = $user->landlord_id;
        if (! $landlordId) {
            $response = response()->json([
                'message' => 'User is not associated with a landlord.',
            ], 403);
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            return $response;
        }

        return $landlordId;
    }

    /**
     * Get all system settings.
     */
    public function show(Request $request): JsonResponse
    {
        Log::info('SystemSettingsController::show called', [
            'path' => $request->path(),
            'method' => $request->method(),
            'has_user' => $request->user() !== null,
        ]);

        /** @var \App\Models\User|null $user */
        $user = $request->user();

        $corsHeaders = $this->getCorsHeaders($request);
        
        if (! $user) {
            Log::warning('SystemSettingsController::show - Unauthenticated');
            // CRITICAL: Use response()->json() to return JsonResponse
            $response = response()->json([
                'message' => 'Unauthenticated.',
            ], 401, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            
            // Force set CORS headers using header() method
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            
            return $response;
        }

        Log::info('SystemSettingsController::show - User authenticated', [
            'user_id' => $user->id,
            'is_super_admin' => $user->isSuperAdmin(),
            'landlord_id' => $user->landlord_id,
        ]);

        // Check authorization
        if (! $user->is_active) {
            Log::warning('SystemSettingsController::show - User not active', ['user_id' => $user->id]);
            // CRITICAL: Use response()->json() to return JsonResponse
            $response = response()->json([
                'message' => 'Your account is not active.',
            ], 403, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            
            return $response;
        }

        $landlordIdResult = $this->getLandlordIdForSettings($request, false);
        if ($landlordIdResult instanceof JsonResponse) {
            Log::info('SystemSettingsController::show - getLandlordIdForSettings returned JsonResponse');
            // Ensure CORS headers on JsonResponse
            foreach ($corsHeaders as $key => $value) {
                $landlordIdResult->header($key, $value);
            }
            // CRITICAL: Ensure Content-Type is set
            $landlordIdResult->header('Content-Type', 'application/json; charset=utf-8');
            return $landlordIdResult;
        }
        
        // Super admin without landlord_id - return empty settings with available landlords
        if ($landlordIdResult === null) {
            Log::info('SystemSettingsController::show - Super admin without landlord_id');
            
            // Get list of landlords for selection (with timeout protection)
            $landlords = [];
            try {
                $startTime = microtime(true);
                $landlords = \App\Models\Landlord::select('id', 'name', 'email')
                    ->orderBy('name')
                    ->limit(100) // Limit to prevent huge queries
                    ->get()
                    ->map(function ($landlord) {
                        return [
                            'id' => $landlord->id,
                            'name' => $landlord->name,
                            'email' => $landlord->email,
                        ];
                    })
                    ->toArray();
                
                $duration = microtime(true) - $startTime;
                if ($duration > 2) {
                    Log::warning('SystemSettingsController: Landlord query took longer than 2 seconds', [
                        'duration' => $duration,
                        'count' => count($landlords),
                    ]);
                }
            } catch (\Exception $e) {
                Log::warning('SystemSettingsController: Could not fetch landlords', [
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);
            }
            
            $responseData = [
                'company' => [],
                'currency' => [],
                'invoice_numbering' => [],
                'payment_terms' => [],
                'lease' => [],
                'system' => [],
                'documents' => [],
                'tax' => [],
                'auto_invoice' => [],
                'super_admin' => true,
                'landlords' => $landlords,
                'message' => count($landlords) > 0 
                    ? 'Super admin: Please select a landlord to view settings, or provide landlord_id as a query parameter.'
                    : 'No landlords found. Please create a landlord first.',
            ];
            
            // CRITICAL: Use response()->json() to return JsonResponse
            $response = response()->json($responseData, 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            
            // Ensure Content-Type is set correctly
            $response->header('Content-Type', 'application/json; charset=utf-8');
            
            return $response;
        }
        
        $landlordId = $landlordIdResult;
        Log::info('SystemSettingsController::show - Fetching settings', ['landlord_id' => $landlordId]);

        try {
            $startTime = microtime(true);
            Log::info('SystemSettingsController::show - Calling getSettings', ['landlord_id' => $landlordId]);
            
            $settings = $this->settingsService->getSettings($landlordId);
            
            $duration = microtime(true) - $startTime;
            Log::info('SystemSettingsController::show - Settings retrieved successfully', [
                'has_company' => isset($settings['company']),
                'has_currency' => isset($settings['currency']),
                'duration_seconds' => round($duration, 3),
            ]);
            
            if ($duration > 5) {
                Log::warning('SystemSettingsController::show - getSettings took longer than 5 seconds', [
                    'duration' => $duration,
                    'landlord_id' => $landlordId,
                ]);
            }

            // Format settings to ensure all categories are present
            $formattedSettings = [
                'company' => $settings['company'] ?? [],
                'currency' => $settings['currency'] ?? [],
                'invoice_numbering' => $settings['invoice_numbering'] ?? [],
                'payment_terms' => $settings['payment_terms'] ?? [],
                'lease' => $settings['lease'] ?? [],
                'system' => $settings['system'] ?? [],
                'documents' => $settings['documents'] ?? [],
                'tax' => $settings['tax'] ?? [],
                'auto_invoice' => $settings['auto_invoice'] ?? [],
            ];
        
            Log::info('SystemSettingsController::show - Creating response');
            
            // CRITICAL: Use response()->json() to return JsonResponse, not Response
            // This ensures type compatibility and proper JSON encoding
            // response()->json() automatically handles JSON encoding with proper flags
            $response = response()->json($formattedSettings, 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            
            // Force set CORS headers using header() method - more reliable than withHeaders()
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            
            // Ensure Content-Type is set correctly
            $response->header('Content-Type', 'application/json; charset=utf-8');
            
            Log::info('SystemSettingsController::show - Response created', [
                'has_origin' => $response->headers->has('Access-Control-Allow-Origin'),
                'status' => $response->getStatusCode(),
                'content_type' => $response->headers->get('Content-Type'),
                'response_type' => get_class($response),
                'is_json_response' => $response instanceof JsonResponse,
            ]);
            
            // CRITICAL: Verify we're returning JsonResponse, not Response
            if (!($response instanceof JsonResponse)) {
                Log::error('SystemSettingsController::show - Response is not JsonResponse!', [
                    'actual_type' => get_class($response),
                    'expected_type' => JsonResponse::class,
                ]);
                // Convert to JsonResponse
                $response = response()->json($formattedSettings, 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                foreach ($corsHeaders as $key => $value) {
                    $response->header($key, $value);
                }
                $response->header('Content-Type', 'application/json; charset=utf-8');
            }
            
            return $response;
        } catch (\Illuminate\Database\QueryException $e) {
            // Database error - likely table doesn't exist
            Log::error('Database error in SystemSettingsController', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            $errorData = [
                'message' => 'System settings are not available. Please run migrations: php artisan migrate',
            ];
            if (config('app.debug')) {
                $errorData['error'] = $e->getMessage();
            }
            
            // CRITICAL: Use response()->json() to return JsonResponse
            $response = response()->json($errorData, 500, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            
            // Ensure Content-Type is set correctly
            $response->header('Content-Type', 'application/json; charset=utf-8');
            
            return $response;
        } catch (\Exception $e) {
            Log::error('Error in SystemSettingsController', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'exception_class' => get_class($e),
            ]);
            
            $errorData = [
                'message' => 'Failed to retrieve system settings.',
            ];
            if (config('app.debug')) {
                $errorData['error'] = $e->getMessage();
                $errorData['debug_info'] = [
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ];
            }
            
            // CRITICAL: Use response()->json() to return JsonResponse
            $response = response()->json($errorData, 500, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            
            // Ensure Content-Type is set correctly
            $response->header('Content-Type', 'application/json; charset=utf-8');
            
            return $response;
        }
    }

    /**
     * Update system settings.
     */
    public function update(UpdateSystemSettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $corsHeaders = $this->getCorsHeaders($request);
        
        $landlordIdResult = $this->getLandlordIdForSettings($request, true);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        $landlordId = $landlordIdResult;
        $validated = $request->validated();

        $setting = $this->settingsService->updateSettings($landlordId, $validated);
        $settings = $this->settingsService->getSettings($landlordId);

        return response()->json([
            'message' => 'System settings updated successfully.',
            'data' => SystemSettingsResource::fromSettings($settings)->toArray($request),
        ])->withHeaders($corsHeaders);
    }

    /**
     * Get company settings.
     */
    public function getCompany(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $corsHeaders = $this->getCorsHeaders($request);
        
        $landlordIdResult = $this->getLandlordIdForSettings($request, false);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        
        if ($landlordIdResult === null) {
            // Super admin without landlord_id - return empty settings
            $response = response()->json([
                'company' => [],
            ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            return $response;
        }
        
        $landlordId = $landlordIdResult;
        $companySettings = $this->settingsService->getCompanySettings($landlordId);

        $response = response()->json([
            'company' => $companySettings,
        ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
        foreach ($corsHeaders as $key => $value) {
            $response->header($key, $value);
        }
        
        return $response;
    }

    /**
     * Update company settings.
     */
    public function updateCompany(UpdateCompanySettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordIdResult = $this->getLandlordIdForSettings($request, true);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        $landlordId = $landlordIdResult;
        $validated = $request->validated();

        $this->settingsService->updateCompanySettings($landlordId, $validated);
        $companySettings = $this->settingsService->getCompanySettings($landlordId);

        return response()->json([
            'message' => 'Company settings updated successfully.',
            'company' => $companySettings,
        ]);
    }

    /**
     * Get currency settings.
     */
    public function getCurrency(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $corsHeaders = $this->getCorsHeaders($request);
        
        $landlordIdResult = $this->getLandlordIdForSettings($request, false);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        if ($landlordIdResult === null) {
            // Super admin without landlord_id - return empty settings
            $response = response()->json([
                'currency' => [],
            ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            return $response;
        }
        $landlordId = $landlordIdResult;
        $currencySettings = $this->settingsService->getCurrencySettings($landlordId);

        $response = response()->json([
            'currency' => $currencySettings,
        ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
        foreach ($corsHeaders as $key => $value) {
            $response->header($key, $value);
        }
        
        return $response;
    }

    /**
     * Update currency settings.
     */
    public function updateCurrency(UpdateCurrencySettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordIdResult = $this->getLandlordIdForSettings($request, true);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        $landlordId = $landlordIdResult;
        $validated = $request->validated();

        $this->settingsService->updateCurrencySettings($landlordId, $validated);
        $currencySettings = $this->settingsService->getCurrencySettings($landlordId);

        return response()->json([
            'message' => 'Currency settings updated successfully.',
            'currency' => $currencySettings,
        ]);
    }

    /**
     * Get invoice numbering settings.
     */
    public function getInvoiceNumbering(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $corsHeaders = $this->getCorsHeaders($request);
        
        $landlordIdResult = $this->getLandlordIdForSettings($request, false);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        if ($landlordIdResult === null) {
            // Super admin without landlord_id - return empty settings
            $response = response()->json([
                'invoice_numbering' => [],
            ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            return $response;
        }
        $landlordId = $landlordIdResult;
        $invoiceNumberingSettings = $this->settingsService->getInvoiceNumberingSettings($landlordId);

        $response = response()->json([
            'invoice_numbering' => $invoiceNumberingSettings,
        ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
        foreach ($corsHeaders as $key => $value) {
            $response->header($key, $value);
        }
        
        return $response;
    }

    /**
     * Update invoice numbering settings.
     */
    public function updateInvoiceNumbering(UpdateInvoiceNumberingRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordIdResult = $this->getLandlordIdForSettings($request, true);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        $landlordId = $landlordIdResult;
        $validated = $request->validated();

        $this->settingsService->updateInvoiceNumberingSettings($landlordId, $validated);
        $invoiceNumberingSettings = $this->settingsService->getInvoiceNumberingSettings($landlordId);

        return response()->json([
            'message' => 'Invoice numbering settings updated successfully.',
            'invoice_numbering' => $invoiceNumberingSettings,
        ]);
    }

    /**
     * Get payment terms settings.
     */
    public function getPaymentTerms(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $corsHeaders = $this->getCorsHeaders($request);
        
        $landlordIdResult = $this->getLandlordIdForSettings($request, false);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        if ($landlordIdResult === null) {
            // Super admin without landlord_id - return empty settings
            $response = response()->json([
                'payment_terms' => [],
            ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            return $response;
        }
        $landlordId = $landlordIdResult;
        $paymentTermsSettings = $this->settingsService->getPaymentTermsSettings($landlordId);

        $response = response()->json([
            'payment_terms' => $paymentTermsSettings,
        ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
        foreach ($corsHeaders as $key => $value) {
            $response->header($key, $value);
        }
        
        return $response;
    }

    /**
     * Update payment terms settings.
     */
    public function updatePaymentTerms(UpdatePaymentTermsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordIdResult = $this->getLandlordIdForSettings($request, true);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        $landlordId = $landlordIdResult;
        $validated = $request->validated();

        $this->settingsService->updatePaymentTermsSettings($landlordId, $validated);
        $paymentTermsSettings = $this->settingsService->getPaymentTermsSettings($landlordId);

        return response()->json([
            'message' => 'Payment terms settings updated successfully.',
            'payment_terms' => $paymentTermsSettings,
        ]);
    }

    /**
     * Get system preferences settings.
     */
    public function getSystemPreferences(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $corsHeaders = $this->getCorsHeaders($request);
        
        $landlordIdResult = $this->getLandlordIdForSettings($request, false);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        if ($landlordIdResult === null) {
            // Super admin without landlord_id - return empty settings
            $response = response()->json([
                'system' => [],
            ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            return $response;
        }
        $landlordId = $landlordIdResult;
        $systemPreferencesSettings = $this->settingsService->getSystemPreferencesSettings($landlordId);

        $response = response()->json([
            'system' => $systemPreferencesSettings,
        ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
        foreach ($corsHeaders as $key => $value) {
            $response->header($key, $value);
        }
        
        return $response;
    }

    /**
     * Update system preferences settings.
     */
    public function updateSystemPreferences(UpdateSystemPreferencesRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordIdResult = $this->getLandlordIdForSettings($request, true);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        $landlordId = $landlordIdResult;
        $validated = $request->validated();

        $this->settingsService->updateSystemPreferencesSettings($landlordId, $validated);
        $systemPreferencesSettings = $this->settingsService->getSystemPreferencesSettings($landlordId);

        return response()->json([
            'message' => 'System preferences settings updated successfully.',
            'system' => $systemPreferencesSettings,
        ]);
    }

    /**
     * Get document settings.
     */
    public function getDocumentSettings(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $corsHeaders = $this->getCorsHeaders($request);
        
        $landlordIdResult = $this->getLandlordIdForSettings($request, false);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        if ($landlordIdResult === null) {
            // Super admin without landlord_id - return empty settings
            $response = response()->json([
                'documents' => [],
            ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            return $response;
        }
        $landlordId = $landlordIdResult;
        $documentSettings = $this->settingsService->getDocumentSettings($landlordId);

        $response = response()->json([
            'documents' => $documentSettings,
        ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
        foreach ($corsHeaders as $key => $value) {
            $response->header($key, $value);
        }
        
        return $response;
    }

    /**
     * Update document settings.
     */
    public function updateDocumentSettings(UpdateDocumentSettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordIdResult = $this->getLandlordIdForSettings($request, true);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        $landlordId = $landlordIdResult;
        $validated = $request->validated();

        $this->settingsService->updateDocumentSettings($landlordId, $validated);
        $documentSettings = $this->settingsService->getDocumentSettings($landlordId);

        return response()->json([
            'message' => 'Document settings updated successfully.',
            'documents' => $documentSettings,
        ]);
    }

    /**
     * Get tax settings.
     */
    public function getTaxSettings(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $corsHeaders = $this->getCorsHeaders($request);
        
        $landlordIdResult = $this->getLandlordIdForSettings($request, false);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        if ($landlordIdResult === null) {
            // Super admin without landlord_id - return empty settings
            $response = response()->json([
                'tax' => [],
            ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            return $response;
        }
        $landlordId = $landlordIdResult;
        $taxSettings = $this->settingsService->getTaxSettings($landlordId);

        $response = response()->json([
            'tax' => $taxSettings,
        ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
        foreach ($corsHeaders as $key => $value) {
            $response->header($key, $value);
        }
        
        return $response;
    }

    /**
     * Update tax settings.
     */
    public function updateTaxSettings(UpdateTaxSettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordIdResult = $this->getLandlordIdForSettings($request, true);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        $landlordId = $landlordIdResult;
        $validated = $request->validated();

        $this->settingsService->updateTaxSettings($landlordId, $validated);
        $taxSettings = $this->settingsService->getTaxSettings($landlordId);

        return response()->json([
            'message' => 'Tax settings updated successfully.',
            'tax' => $taxSettings,
        ]);
    }

    /**
     * Get email settings.
     */
    public function getEmailSettings(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $corsHeaders = $this->getCorsHeaders($request);
        
        $landlordIdResult = $this->getLandlordIdForSettings($request, false);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        if ($landlordIdResult === null) {
            // Super admin without landlord_id - return empty settings
            $response = response()->json([
                'email' => [],
            ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            return $response;
        }
        $landlordId = $landlordIdResult;
        $emailSettings = $this->settingsService->getEmailSettings($landlordId);

        // Prepare for response (remove passwords)
        $emailSettings = EmailConfigHelper::prepareForResponse($emailSettings, false);

        $response = response()->json([
            'email' => $emailSettings,
        ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
        foreach ($corsHeaders as $key => $value) {
            $response->header($key, $value);
        }
        
        return $response;
    }

    /**
     * Update email settings.
     */
    public function updateEmailSettings(UpdateEmailSettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordIdResult = $this->getLandlordIdForSettings($request, true);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        $landlordId = $landlordIdResult;
        $validated = $request->validated();

        // If password is provided but empty, don't update it
        if (isset($validated['smtp_password']) && empty($validated['smtp_password'])) {
            unset($validated['smtp_password']);
        }

        // If oauth_client_secret is provided but empty, don't update it
        if (isset($validated['oauth_client_secret']) && empty($validated['oauth_client_secret'])) {
            unset($validated['oauth_client_secret']);
        }

        $this->settingsService->updateEmailSettings($landlordId, $validated);
        $emailSettings = $this->settingsService->getEmailSettings($landlordId);

        // Prepare for response (remove passwords)
        $emailSettings = EmailConfigHelper::prepareForResponse($emailSettings, false);

        return response()->json([
            'message' => 'Email settings updated successfully.',
            'email' => $emailSettings,
        ]);
    }

    /**
     * Test email connection.
     */
    public function testEmailConnection(TestEmailRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordIdResult = $this->getLandlordIdForSettings($request, true);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        $landlordId = $landlordIdResult;
        $emailSettings = $this->settingsService->getEmailSettings($landlordId);

        // Check if email is enabled
        if (! ($emailSettings['enabled'] ?? false)) {
            return response()->json([
                'message' => 'Email notifications are not enabled.',
                'success' => false,
            ], 400);
        }

        // Get provider
        $provider = $emailSettings['provider'] ?? 'gmail';

        // Prepare config for email service (decrypt password)
        $config = $emailSettings;
        if (! empty($config['smtp_password'])) {
            $config['smtp_password'] = EmailConfigHelper::decryptPassword($config['smtp_password']);
        }

        try {
            // Create email service
            $emailService = EmailServiceFactory::create($provider, $config);

            // Configure mail for landlord
            EmailConfigHelper::configureMailForLandlord($landlordId, $emailSettings);

            // Send test email
            $testEmail = $request->validated()['email'];
            $subject = 'Test Email - ' . config('app.name');
            $body = 'This is a test email to verify your email configuration is working correctly.';

            $success = $emailService->send($testEmail, $subject, $body);

            if ($success) {
                return response()->json([
                    'message' => 'Test email sent successfully.',
                    'success' => true,
                ]);
            } else {
                return response()->json([
                    'message' => 'Failed to send test email. Please check your configuration and try again.',
                    'success' => false,
                ], 500);
            }
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error sending test email: ' . $e->getMessage(),
                'success' => false,
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get SMS settings.
     */
    public function getSmsSettings(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $corsHeaders = $this->getCorsHeaders($request);
        
        $landlordIdResult = $this->getLandlordIdForSettings($request, false);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        if ($landlordIdResult === null) {
            // Super admin without landlord_id - return empty settings
            $response = response()->json([
                'sms' => [],
            ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            return $response;
        }
        $landlordId = $landlordIdResult;
        $smsSettings = $this->settingsService->getSmsSettings($landlordId);

        // Check if API key is set in settings or environment
        $hasSettingsKey = ! empty($smsSettings['api_key']);
        $hasEnvKey = ! empty(env('MSG_OWL_KEY'));

        // Prepare for response (remove API key)
        $smsSettings = SmsConfigHelper::prepareForResponse($smsSettings, false);

        // Add indicator if using environment variable
        if (! $hasSettingsKey && $hasEnvKey) {
            $smsSettings['api_key_source'] = 'environment';
            $smsSettings['api_key_configured'] = true;
        } elseif ($hasSettingsKey) {
            $smsSettings['api_key_source'] = 'settings';
            $smsSettings['api_key_configured'] = true;
        } else {
            $smsSettings['api_key_source'] = 'none';
            $smsSettings['api_key_configured'] = false;
        }

        // Get approved sender IDs if API key is available
        if (! empty($smsSettings['api_key']) || ! empty(env('MSG_OWL_KEY'))) {
            try {
                $config = $smsSettings;
                if (! empty($config['api_key'])) {
                    $config['api_key'] = SmsConfigHelper::decryptApiKey($config['api_key']);
                } elseif (empty($config['api_key']) && ! empty(env('MSG_OWL_KEY'))) {
                    $config['api_key'] = env('MSG_OWL_KEY');
                }

                $provider = $smsSettings['provider'] ?? 'msgowl';
                $smsService = SmsServiceFactory::create($provider, $config);
                
                if (method_exists($smsService, 'getApprovedSenderIds')) {
                    $approvedSenderIds = $smsService->getApprovedSenderIds();
                    $smsSettings['approved_sender_ids'] = $approvedSenderIds;
                }
            } catch (\Exception $e) {
                Log::error('Failed to fetch approved sender IDs', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $response = response()->json([
            'sms' => $smsSettings,
        ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
        foreach ($corsHeaders as $key => $value) {
            $response->header($key, $value);
        }
        
        return $response;
    }

    /**
     * Update SMS settings.
     */
    public function updateSmsSettings(UpdateSmsSettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordIdResult = $this->getLandlordIdForSettings($request, true);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        $landlordId = $landlordIdResult;
        $validated = $request->validated();

        // If API key is provided but empty, don't update it
        if (isset($validated['api_key']) && empty($validated['api_key'])) {
            unset($validated['api_key']);
        }

        $this->settingsService->updateSmsSettings($landlordId, $validated);
        $smsSettings = $this->settingsService->getSmsSettings($landlordId);

        // Prepare for response (remove API key)
        $smsSettings = SmsConfigHelper::prepareForResponse($smsSettings, false);

        return response()->json([
            'message' => 'SMS settings updated successfully.',
            'sms' => $smsSettings,
        ]);
    }

    /**
     * Test SMS connection.
     */
    public function testSmsConnection(TestSmsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordIdResult = $this->getLandlordIdForSettings($request, true);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        $landlordId = $landlordIdResult;
        $smsSettings = $this->settingsService->getSmsSettings($landlordId);

        // Debug logging
        Log::info('SMS test request', [
            'landlord_id' => $landlordId,
            'enabled' => $smsSettings['enabled'] ?? false,
            'has_api_key_in_settings' => ! empty($smsSettings['api_key']),
            'has_env_key' => ! empty(env('MSG_OWL_KEY')),
            'phone' => $request->input('phone'),
        ]);

        // Check if SMS is enabled
        if (! ($smsSettings['enabled'] ?? false)) {
            return response()->json([
                'message' => 'SMS notifications are not enabled. Please enable SMS notifications first.',
                'success' => false,
            ], 400);
        }

        // Get provider
        $provider = $smsSettings['provider'] ?? 'msgowl';

        // Prepare config for SMS service (decrypt API key or use env variable)
        $config = $smsSettings;
        if (! empty($config['api_key'])) {
            $config['api_key'] = SmsConfigHelper::decryptApiKey($config['api_key']);
        } elseif (empty($config['api_key']) && ! empty(env('MSG_OWL_KEY'))) {
            // Use environment variable as fallback
            $config['api_key'] = env('MSG_OWL_KEY');
        }

        // Check if we have an API key
        if (empty($config['api_key'])) {
            return response()->json([
                'message' => 'SMS API key is not configured. Please set MSG_OWL_KEY in your .env file or enter an API key in settings.',
                'success' => false,
            ], 400);
        }

        try {
            // Send test SMS
            $testPhone = $request->validated()['phone'];
            $smsNotificationService = app(SmsNotificationService::class);
            $result = $smsNotificationService->testSms($landlordId, $testPhone);

            if ($result === true) {
                return response()->json([
                    'message' => 'Test SMS sent successfully.',
                    'success' => true,
                ]);
            } else {
                // Get error message if available
                $errorMessage = 'Failed to send test SMS.';
                if (is_array($result) && isset($result['error'])) {
                    $errorMessage = $result['error'];
                }

                Log::error('SMS test failed', [
                    'landlord_id' => $landlordId,
                    'phone' => $testPhone,
                    'has_api_key' => ! empty($config['api_key']),
                    'error' => $errorMessage,
                ]);

                return response()->json([
                    'message' => $errorMessage,
                    'success' => false,
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('Exception in SMS test', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Error sending test SMS: ' . $e->getMessage(),
                'success' => false,
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get Telegram settings.
     */
    public function getTelegramSettings(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $corsHeaders = $this->getCorsHeaders($request);
        
        $landlordIdResult = $this->getLandlordIdForSettings($request, false);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        if ($landlordIdResult === null) {
            // Super admin without landlord_id - return empty settings
            $response = response()->json([
                'telegram' => [],
            ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            foreach ($corsHeaders as $key => $value) {
                $response->header($key, $value);
            }
            return $response;
        }
        $landlordId = $landlordIdResult;
        $telegramSettings = $this->settingsService->getTelegramSettings($landlordId);

        // Check if bot token is set in settings or environment
        $hasSettingsToken = ! empty($telegramSettings['bot_token']);
        $hasEnvToken = ! empty(env('TELEGRAM_BOT_TOKEN'));

        // Prepare for response (remove bot token)
        $telegramSettings = TelegramConfigHelper::prepareForResponse($telegramSettings, false);

        // Add indicator if using environment variable
        if (! $hasSettingsToken && $hasEnvToken) {
            $telegramSettings['bot_token_source'] = 'environment';
            $telegramSettings['bot_token_configured'] = true;
        } elseif ($hasSettingsToken) {
            $telegramSettings['bot_token_source'] = 'settings';
            $telegramSettings['bot_token_configured'] = true;
        } else {
            $telegramSettings['bot_token_source'] = 'none';
            $telegramSettings['bot_token_configured'] = false;
        }

        $response = response()->json([
            'telegram' => $telegramSettings,
        ], 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
        foreach ($corsHeaders as $key => $value) {
            $response->header($key, $value);
        }
        
        return $response;
    }

    /**
     * Update Telegram settings.
     */
    public function updateTelegramSettings(UpdateTelegramSettingsRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordIdResult = $this->getLandlordIdForSettings($request, true);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        $landlordId = $landlordIdResult;
        $validated = $request->validated();

        // If bot token is provided but empty, don't update it
        if (isset($validated['bot_token']) && empty($validated['bot_token'])) {
            unset($validated['bot_token']);
        }

        $this->settingsService->updateTelegramSettings($landlordId, $validated);
        $telegramSettings = $this->settingsService->getTelegramSettings($landlordId);

        // Check if bot token is set in settings or environment
        $hasSettingsToken = ! empty($telegramSettings['bot_token']);
        $hasEnvToken = ! empty(env('TELEGRAM_BOT_TOKEN'));

        // Prepare for response (remove bot token)
        $telegramSettings = TelegramConfigHelper::prepareForResponse($telegramSettings, false);

        // Add indicator if using environment variable
        if (! $hasSettingsToken && $hasEnvToken) {
            $telegramSettings['bot_token_source'] = 'environment';
            $telegramSettings['bot_token_configured'] = true;
        } elseif ($hasSettingsToken) {
            $telegramSettings['bot_token_source'] = 'settings';
            $telegramSettings['bot_token_configured'] = true;
        } else {
            $telegramSettings['bot_token_source'] = 'none';
            $telegramSettings['bot_token_configured'] = false;
        }

        return response()->json([
            'message' => 'Telegram settings updated successfully.',
            'telegram' => $telegramSettings,
        ]);
    }

    /**
     * Test Telegram connection.
     */
    public function testTelegramConnection(TestTelegramRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordIdResult = $this->getLandlordIdForSettings($request, true);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        $landlordId = $landlordIdResult;
        $telegramSettings = $this->settingsService->getTelegramSettings($landlordId);

        // Check if Telegram is enabled
        if (! ($telegramSettings['enabled'] ?? false)) {
            return response()->json([
                'message' => 'Telegram notifications are not enabled. Please enable Telegram notifications first.',
                'success' => false,
            ], 400);
        }

        // Get bot token (per-landlord or global)
        $botToken = $telegramSettings['bot_token'] ?? config('services.telegram.bot_token');
        
        // Decrypt if stored in settings
        if (! empty($telegramSettings['bot_token'])) {
            $botToken = TelegramConfigHelper::decryptBotToken($telegramSettings['bot_token']);
        } elseif (empty($botToken) && ! empty(env('TELEGRAM_BOT_TOKEN'))) {
            // Use environment variable as fallback
            $botToken = env('TELEGRAM_BOT_TOKEN');
        }

        // Check if we have a bot token
        if (empty($botToken)) {
            return response()->json([
                'message' => 'Telegram bot token is not configured. Please set TELEGRAM_BOT_TOKEN in your .env file or enter a bot token in settings.',
                'success' => false,
            ], 400);
        }

        try {
            // Send test Telegram message
            $testChatId = $request->validated()['chat_id'];
            $telegramNotificationService = app(TelegramNotificationService::class);
            
            // testTelegram will throw an exception if it fails, so we don't need to check the return value
            $telegramNotificationService->testTelegram($landlordId, $testChatId);

            // If we get here, the message was sent successfully
            return response()->json([
                'message' => 'Test Telegram message sent successfully.',
                'success' => true,
            ]);
        } catch (\Exception $e) {
            Log::error('Exception in Telegram test', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'landlord_id' => $landlordId,
                'chat_id' => $request->validated()['chat_id'] ?? null,
            ]);

            // Extract meaningful error message
            $errorMessage = $e->getMessage();
            
            // Common Telegram API errors - provide user-friendly messages
            if (str_contains($errorMessage, 'chat not found') || str_contains($errorMessage, 'Bad Request: chat not found')) {
                $errorMessage = 'Chat ID not found. Please make sure you have started a conversation with your bot first.';
            } elseif (str_contains($errorMessage, 'Unauthorized') || str_contains($errorMessage, 'invalid token')) {
                $errorMessage = 'Invalid bot token. Please check your Telegram bot token.';
            } elseif (str_contains($errorMessage, 'bot was blocked')) {
                $errorMessage = 'The bot was blocked by the user. Please unblock the bot and try again.';
            }

            return response()->json([
                'message' => $errorMessage,
                'success' => false,
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Get auto-invoice settings.
     */
    public function getAutoInvoiceSettings(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('viewAny', LandlordSetting::class);

        $landlordIdResult = $this->getLandlordIdForSettings($request, false);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        if ($landlordIdResult === null) {
            // Super admin without landlord_id - return empty settings
            return response()->json([
                'company' => [],
            ])->header('Access-Control-Allow-Origin', $request->headers->get('Origin', '*'))
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
                ->header('Access-Control-Allow-Credentials', 'true');
        }
        $landlordId = $landlordIdResult;
        $autoInvoiceSettings = $this->settingsService->getAutoInvoiceSettings($landlordId);

        return response()->json([
            'auto_invoice' => $autoInvoiceSettings,
        ]);
    }

    /**
     * Update auto-invoice settings.
     */
    public function updateAutoInvoiceSettings(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $this->authorize('update', LandlordSetting::class);

        $landlordIdResult = $this->getLandlordIdForSettings($request, true);
        if ($landlordIdResult instanceof JsonResponse) {
            return $landlordIdResult;
        }
        $landlordId = $landlordIdResult;
        
        $validated = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'day_of_month' => ['sometimes', 'integer', 'min:1', 'max:28'],
            'time' => ['sometimes', 'string', 'regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/'],
        ]);

        $this->settingsService->updateAutoInvoiceSettings($landlordId, $validated);
        $autoInvoiceSettings = $this->settingsService->getAutoInvoiceSettings($landlordId);

        return response()->json([
            'message' => 'Auto-invoice settings updated successfully.',
            'auto_invoice' => $autoInvoiceSettings,
        ]);
    }
}

