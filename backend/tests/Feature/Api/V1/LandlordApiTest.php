<?php

namespace Tests\Feature\Api\V1;

use App\Models\Landlord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandlordApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_landlord_with_company_name(): void
    {
        $user = $this->actingAsOwner();

        $payload = [
            'company_name' => 'Test Properties Ltd',
            'subscription_tier' => 'pro',
            'owner' => [
                'first_name' => 'John',
                'last_name' => 'Doe',
                'email' => 'john@testproperties.com',
                'mobile' => '+960 1234567',
                'password' => 'Password123!',
            ],
        ];

        $response = $this->postJson('/api/v1/landlords', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.company_name', 'Test Properties Ltd');

        $this->assertDatabaseHas('landlords', [
            'company_name' => 'Test Properties Ltd',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'john@testproperties.com',
            'first_name' => 'John',
            'last_name' => 'Doe',
        ]);
    }

    public function test_can_create_landlord_without_company_name(): void
    {
        $user = $this->actingAsOwner();

        $payload = [
            'subscription_tier' => 'pro',
            'owner' => [
                'first_name' => 'Jane',
                'last_name' => 'Smith',
                'email' => 'jane@example.com',
                'mobile' => '+960 7654321',
                'password' => 'Password123!',
            ],
        ];

        $response = $this->postJson('/api/v1/landlords', $payload);

        $response->assertCreated();

        // Should use owner's full name as company_name
        $this->assertDatabaseHas('landlords', [
            'company_name' => 'Jane Smith',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'jane@example.com',
            'first_name' => 'Jane',
            'last_name' => 'Smith',
        ]);
    }

    public function test_can_create_landlord_with_empty_string_company_name(): void
    {
        $user = $this->actingAsOwner();

        $payload = [
            'company_name' => '',
            'subscription_tier' => 'basic',
            'owner' => [
                'first_name' => 'Bob',
                'last_name' => 'Johnson',
                'email' => 'bob@example.com',
                'mobile' => '+960 1111111',
            ],
        ];

        $response = $this->postJson('/api/v1/landlords', $payload);

        $response->assertCreated();

        // Should use owner's full name as company_name when empty string is provided
        $this->assertDatabaseHas('landlords', [
            'company_name' => 'Bob Johnson',
        ]);
    }

    public function test_can_create_landlord_with_whitespace_only_company_name(): void
    {
        $user = $this->actingAsOwner();

        $payload = [
            'company_name' => '   ',
            'subscription_tier' => 'basic',
            'owner' => [
                'first_name' => 'Alice',
                'last_name' => 'Williams',
                'email' => 'alice@example.com',
                'mobile' => '+960 2222222',
            ],
        ];

        $response = $this->postJson('/api/v1/landlords', $payload);

        $response->assertCreated();

        // Should use owner's full name as company_name when only whitespace is provided
        $this->assertDatabaseHas('landlords', [
            'company_name' => 'Alice Williams',
        ]);
    }

    public function test_company_name_uses_owner_name_when_not_provided(): void
    {
        $user = $this->actingAsOwner();

        $payload = [
            'subscription_tier' => 'basic',
            'owner' => [
                'first_name' => 'Charlie',
                'last_name' => 'Brown',
                'email' => 'charlie@example.com',
                'mobile' => '+960 3333333',
            ],
        ];

        $response = $this->postJson('/api/v1/landlords', $payload);

        $response->assertCreated();

        // Should use owner's full name when company_name is not provided
        $this->assertDatabaseHas('landlords', [
            'company_name' => 'Charlie Brown',
        ]);
    }

    public function test_company_name_uses_full_name_correctly(): void
    {
        $user = $this->actingAsOwner();

        $payload = [
            'subscription_tier' => 'basic',
            'owner' => [
                'first_name' => 'David',
                'last_name' => 'Lee',
                'email' => 'david@example.com',
                'mobile' => '+960 4444444',
            ],
        ];

        $response = $this->postJson('/api/v1/landlords', $payload);

        $response->assertCreated();

        // Should use full name (first_name + last_name) when company_name is not provided
        $this->assertDatabaseHas('landlords', [
            'company_name' => 'David Lee',
        ]);
    }

    public function test_validation_requires_owner_details(): void
    {
        $user = $this->actingAsOwner();

        $payload = [
            'company_name' => 'Test Company',
            'subscription_tier' => 'pro',
        ];

        $response = $this->postJson('/api/v1/landlords', $payload);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['owner.first_name', 'owner.last_name', 'owner.email', 'owner.mobile']);
    }
}

