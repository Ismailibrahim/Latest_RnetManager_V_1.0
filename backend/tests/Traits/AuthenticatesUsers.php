<?php

namespace Tests\Traits;

use App\Models\Landlord;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

/**
 * Trait for authenticating users in tests.
 * 
 * This trait provides helper methods for creating and authenticating users
 * with different roles. Use this in your test classes for consistent
 * authentication setup.
 */
trait AuthenticatesUsers
{
    /**
     * Create and authenticate a user with the specified role.
     */
    protected function actingAsUser(string $role = User::ROLE_OWNER, ?Landlord $landlord = null): User
    {
        $landlord = $landlord ?? Landlord::factory()->create();

        $user = User::factory()->create([
            'landlord_id' => $landlord->id,
            'role' => $role,
            'is_active' => true,
        ]);

        Sanctum::actingAs($user);

        return $user;
    }

    /**
     * Create and authenticate an owner user.
     */
    protected function actingAsOwner(?Landlord $landlord = null): User
    {
        return $this->actingAsUser(User::ROLE_OWNER, $landlord);
    }

    /**
     * Create and authenticate an admin user.
     */
    protected function actingAsAdmin(?Landlord $landlord = null): User
    {
        return $this->actingAsUser(User::ROLE_ADMIN, $landlord);
    }

    /**
     * Create and authenticate a manager user.
     */
    protected function actingAsManager(?Landlord $landlord = null): User
    {
        return $this->actingAsUser(User::ROLE_MANAGER, $landlord);
    }

    /**
     * Create and authenticate an agent user.
     */
    protected function actingAsAgent(?Landlord $landlord = null): User
    {
        return $this->actingAsUser(User::ROLE_AGENT, $landlord);
    }
}

