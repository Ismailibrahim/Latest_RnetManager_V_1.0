<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Landlord\StoreLandlordRequest;
use App\Models\Landlord;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;

class LandlordController extends Controller
{
    public function store(StoreLandlordRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();
            
            // Get company_name from raw request (if provided)
            $rawData = json_decode($request->getContent(), true) ?? [];
            $companyName = $rawData['company_name'] ?? null;
            
            // Clean up company_name
            if (is_string($companyName)) {
                $companyName = trim($companyName);
                if ($companyName === '') {
                    $companyName = null;
                }
            }
            
            // If no company_name, use owner's full name as fallback
            if (empty($companyName) && isset($validated['owner'])) {
                $firstName = $validated['owner']['first_name'] ?? '';
                $lastName = $validated['owner']['last_name'] ?? '';
                $companyName = trim("$firstName $lastName");
                
                // If still empty, use email
                if (empty($companyName)) {
                    $companyName = $validated['owner']['email'] ?? 'Individual Owner';
                }
            }
            
            // Final fallback
            if (empty($companyName)) {
                $companyName = 'Individual Owner';
            }

            $landlord = DB::transaction(function () use ($validated, $companyName) {
                $landlord = Landlord::create([
                    'company_name' => $companyName,
                    'subscription_tier' => $validated['subscription_tier'] ?? Landlord::TIER_BASIC,
                ]);

                if (isset($validated['owner'])) {
                    $owner = $validated['owner'];
                    User::create([
                        'landlord_id' => $landlord->id,
                        'first_name' => $owner['first_name'],
                        'last_name' => $owner['last_name'],
                        'email' => $owner['email'],
                        'mobile' => $owner['mobile'],
                        'password_hash' => $owner['password'] ?? 'Password123!',
                        'role' => User::ROLE_OWNER,
                        'is_active' => true,
                    ]);
                }

                return $landlord->fresh();
            });

            return response()->json(['data' => $landlord], 201);
        } catch (QueryException $e) {
            // Handle database errors
            if (str_contains($e->getMessage(), 'company_name') && 
                str_contains($e->getMessage(), 'cannot be null')) {
                return response()->json([
                    'message' => 'Database error: company_name column must be nullable. Please run: php artisan migrate',
                ], 500);
            }
            
            if ($e->getCode() === '23000' && str_contains($e->getMessage(), 'email')) {
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'errors' => [
                        'owner.email' => ['This email address is already registered.'],
                    ],
                ], 422);
            }
            
            throw $e;
        }
    }
}
