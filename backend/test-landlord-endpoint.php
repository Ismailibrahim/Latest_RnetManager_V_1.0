<?php

/**
 * Quick test script to verify landlord creation endpoint
 * Run: php test-landlord-endpoint.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\DB;

// Create a test user
$landlord = \App\Models\Landlord::factory()->create();
$user = User::factory()->create([
    'landlord_id' => $landlord->id,
    'role' => User::ROLE_OWNER,
    'is_active' => true,
]);

// Test payload WITHOUT company_name
$payload = [
    'subscription_tier' => 'pro',
    'owner' => [
        'first_name' => 'Test',
        'last_name' => 'User',
        'email' => 'test' . time() . '@example.com',
        'mobile' => '+960 1234567',
    ],
];

echo "Testing landlord creation WITHOUT company_name...\n";
echo "Payload: " . json_encode($payload, JSON_PRETTY_PRINT) . "\n\n";

// Create request
$request = \Illuminate\Http\Request::create('/api/v1/landlords', 'POST', $payload);
$request->setUserResolver(function () use ($user) {
    return $user;
});

// Validate using the request class
$formRequest = new \App\Http\Requests\Landlord\StoreLandlordRequest();
$formRequest->setContainer($app);
$formRequest->setRedirector($app->make('redirect'));
$formRequest->initialize($payload, [], [], [], [], [], $request->server->all());
$formRequest->setUserResolver($request->getUserResolver());

try {
    $validated = $formRequest->validated();
    echo "✅ Validation PASSED!\n";
    echo "Validated data: " . json_encode($validated, JSON_PRETTY_PRINT) . "\n";
    echo "\nCompany name in validated: " . ($validated['company_name'] ?? 'NOT_SET') . "\n";
} catch (\Illuminate\Validation\ValidationException $e) {
    echo "❌ Validation FAILED!\n";
    echo "Errors: " . json_encode($e->errors(), JSON_PRETTY_PRINT) . "\n";
}

// Cleanup
DB::table('users')->where('id', $user->id)->delete();
DB::table('landlords')->where('id', $landlord->id)->delete();

