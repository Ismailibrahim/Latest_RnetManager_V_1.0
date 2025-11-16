<?php

namespace Tests\Feature\Api\V1;

use App\Models\Landlord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountSettingsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_fetch_account_details(): void
    {
        $user = $this->actingAsOwner();

        $delegate = User::factory()->create([
            'landlord_id' => $user->landlord_id,
            'role' => User::ROLE_MANAGER,
        ]);

        $response = $this->getJson('/api/v1/account');

        $response->assertOk()
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'first_name',
                    'last_name',
                    'email',
                    'mobile',
                    'landlord' => [
                        'id',
                        'company_name',
                        'subscription_tier',
                    ],
                ],
                'delegates',
                'meta' => [
                    'roles',
                    'delegates_count',
                ],
            ]);

        $this->assertEquals(1, $response->json('meta.delegates_count'));
        $this->assertContains(User::ROLE_MANAGER, $response->json('meta.roles'));
        $this->assertEquals(
            $user->landlord->company_name,
            $response->json('user.landlord.company_name')
        );
        $this->assertEquals($delegate->email, $response->json('delegates.0.email'));
    }

    public function test_can_update_account_details(): void
    {
        $user = $this->actingAsOwner();

        $payload = [
            'first_name' => 'Aisha',
            'last_name' => 'Ibrahim',
            'email' => 'aisha.updated@example.com',
            'mobile' => '+960 755-5555',
        ];

        $response = $this->patchJson('/api/v1/account', $payload);

        $response->assertOk()
            ->assertJsonPath('user.email', $payload['email']);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email' => $payload['email'],
            'mobile' => $payload['mobile'],
        ]);
    }

    public function test_can_list_delegates(): void
    {
        $user = $this->actingAsOwner();

        $delegate = User::factory()->create([
            'landlord_id' => $user->landlord_id,
            'role' => User::ROLE_MANAGER,
        ]);

        $response = $this->getJson('/api/v1/account/delegates');

        $response->assertOk()
            ->assertJsonPath('delegates.0.id', $delegate->id);
    }

    public function test_can_create_delegate(): void
    {
        $user = $this->actingAsOwner();

        $payload = [
            'first_name' => 'Ibrahim',
            'last_name' => 'Hussain',
            'email' => 'ibrahim@example.com',
            'mobile' => '+960 765-9090',
            'role' => User::ROLE_MANAGER,
            'is_active' => true,
        ];

        $response = $this->postJson('/api/v1/account/delegates', $payload);

        $response->assertCreated()
            ->assertJsonPath('delegate.email', $payload['email']);

        $this->assertDatabaseHas('users', [
            'landlord_id' => $user->landlord_id,
            'email' => $payload['email'],
            'role' => $payload['role'],
        ]);
    }

    public function test_can_update_delegate(): void
    {
        $user = $this->actingAsOwner();

        $delegate = User::factory()->create([
            'landlord_id' => $user->landlord_id,
            'role' => User::ROLE_MANAGER,
            'email' => 'old@example.com',
        ]);

        $response = $this->patchJson("/api/v1/account/delegates/{$delegate->id}", [
            'email' => 'new@example.com',
            'is_active' => false,
        ]);

        $response->assertOk()
            ->assertJsonPath('delegate.email', 'new@example.com')
            ->assertJsonPath('delegate.is_active', false);

        $this->assertDatabaseHas('users', [
            'id' => $delegate->id,
            'email' => 'new@example.com',
            'is_active' => false,
        ]);
    }

    public function test_can_delete_delegate(): void
    {
        $user = $this->actingAsOwner();

        $delegate = User::factory()->create([
            'landlord_id' => $user->landlord_id,
        ]);

        $response = $this->deleteJson("/api/v1/account/delegates/{$delegate->id}");

        $response->assertOk();

        $this->assertDatabaseMissing('users', [
            'id' => $delegate->id,
        ]);
    }

    public function test_cannot_manage_foreign_delegate(): void
    {
        $this->actingAsOwner();

        $foreignDelegate = User::factory()->create(); // different landlord

        $this->patchJson("/api/v1/account/delegates/{$foreignDelegate->id}", [
            'email' => 'unauthorised@example.com',
        ])->assertForbidden();

        $this->deleteJson("/api/v1/account/delegates/{$foreignDelegate->id}")
            ->assertForbidden();
    }

    public function test_owner_can_update_password(): void
    {
        $user = $this->actingAsOwner();

        $response = $this->patchJson('/api/v1/account/password', [
            'current_password' => 'password',
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Password updated successfully.');

        $this->assertTrue(Hash::check('new-secure-password', $user->fresh()->password_hash));
    }

    public function test_owner_must_provide_correct_current_password(): void
    {
        $this->actingAsOwner();

        $response = $this->patchJson('/api/v1/account/password', [
            'current_password' => 'wrong-password',
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);
    }
}

