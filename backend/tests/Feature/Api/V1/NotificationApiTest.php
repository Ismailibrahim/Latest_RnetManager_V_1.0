<?php

namespace Tests\Feature\Api\V1;

use App\Models\Landlord;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function actingOwner(): array
    {
        $landlord = Landlord::factory()->create();

        $user = User::factory()->create([
            'landlord_id' => $landlord->id,
            'role' => User::ROLE_OWNER,
            'is_active' => true,
        ]);

        Sanctum::actingAs($user);

        return compact('user', 'landlord');
    }

    public function test_owner_can_list_notifications(): void
    {
        ['user' => $user, 'landlord' => $landlord] = $this->actingOwner();

        Notification::factory()->count(3)->create([
            'landlord_id' => $landlord->id,
        ]);

        Notification::factory()->count(2)->create(); // other landlord

        $response = $this->getJson('/api/v1/notifications');

        $response->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_owner_can_mark_notification_as_read(): void
    {
        ['landlord' => $landlord] = $this->actingOwner();

        $notification = Notification::factory()->create([
            'landlord_id' => $landlord->id,
            'is_read' => false,
        ]);

        $response = $this->putJson("/api/v1/notifications/{$notification->id}", [
            'is_read' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.is_read', true);

        $this->assertDatabaseHas('notifications', [
            'id' => $notification->id,
            'is_read' => true,
        ]);
    }

    public function test_owner_can_delete_notification(): void
    {
        ['landlord' => $landlord] = $this->actingOwner();

        $notification = Notification::factory()->create([
            'landlord_id' => $landlord->id,
        ]);

        $this->deleteJson("/api/v1/notifications/{$notification->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('notifications', [
            'id' => $notification->id,
        ]);
    }

    public function test_cannot_access_foreign_notification(): void
    {
        $this->actingOwner();

        $foreign = Notification::factory()->create();

        $this->getJson("/api/v1/notifications/{$foreign->id}")
            ->assertForbidden();
    }
}
