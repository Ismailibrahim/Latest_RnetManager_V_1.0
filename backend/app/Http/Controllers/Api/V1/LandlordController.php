<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Landlord\StoreLandlordRequest;
use App\Models\Landlord;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class LandlordController extends Controller
{
    public function store(StoreLandlordRequest $request): JsonResponse
    {
        $validated = $request->validated();

        /** @var array{company_name:string,subscription_tier?:string,owner?:array} $validated */

        $landlord = DB::transaction(function () use ($validated) {
            $landlord = Landlord::query()->create([
                'company_name' => $validated['company_name'],
                'subscription_tier' => $validated['subscription_tier'] ?? Landlord::TIER_BASIC,
            ]);

            $owner = $validated['owner'] ?? null;
            if ($owner) {
                $password = $owner['password'] ?? 'Password123!';
                User::query()->create([
                    'landlord_id' => $landlord->id,
                    'first_name' => $owner['first_name'],
                    'last_name' => $owner['last_name'],
                    'email' => $owner['email'],
                    'mobile' => $owner['mobile'],
                    'password_hash' => $password,
                    'role' => User::ROLE_OWNER,
                    'is_active' => true,
                ]);
            }

            return $landlord->fresh();
        });

        return response()->json(['data' => $landlord], 201);
    }
}


