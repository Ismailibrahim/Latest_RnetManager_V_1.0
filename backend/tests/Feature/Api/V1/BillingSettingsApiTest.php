<?php

namespace Tests\Feature\Api\V1;

use App\Models\Landlord;
use App\Models\Property;
use App\Models\SubscriptionInvoice;
use App\Models\SubscriptionLimit;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BillingSettingsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_fetch_billing_settings(): void
    {
        $landlord = Landlord::factory()->create([
            'subscription_tier' => Landlord::TIER_PRO,
        ]);

        SubscriptionLimit::query()->updateOrCreate(
            ['tier' => $landlord->subscription_tier],
            [
                'max_properties' => 25,
                'max_units' => 120,
                'max_users' => 10,
                'monthly_price' => 229.00,
                'features' => ['advanced_reports', 'maintenance_tracking', 'priority_support'],
            ]
        );

        $owner = User::factory()->create([
            'landlord_id' => $landlord->id,
            'role' => User::ROLE_OWNER,
            'email' => 'owner@example.com',
        ]);

        User::factory()->create([
            'landlord_id' => $landlord->id,
            'role' => User::ROLE_ADMIN,
            'email' => 'admin@example.com',
        ]);

        $properties = Property::factory()
            ->count(2)
            ->for($landlord)
            ->create();

        $properties->each(function (Property $property) use ($landlord): void {
            Unit::factory()->for($landlord)->for($property)->create();
        });

        SubscriptionInvoice::factory()
            ->count(3)
            ->create([
                'landlord_id' => $landlord->id,
                'status' => 'paid',
            ]);

        Sanctum::actingAs($owner);

        $response = $this->getJson('/api/v1/settings/billing');

        $response->assertOk()
            ->assertJsonPath('plan.tier', Landlord::TIER_PRO)
            ->assertJsonPath('plan.currency', 'USD')
            ->assertJsonStructure([
                'plan' => [
                    'tier',
                    'name',
                    'monthly_price',
                    'currency',
                    'status',
                    'next_renewal_date',
                    'features',
                    'limits',
                ],
                'usage',
                'invoices' => [
                    ['invoice_number', 'amount', 'status'],
                ],
                'preferences' => [
                    'receipt_emails',
                    'billing_contacts',
                    'tax_registration',
                    'compliance_note',
                ],
            ]);

        $this->assertGreaterThanOrEqual(2, $response->json('usage.0.used'));
        $this->assertContains('owner@example.com', $response->json('preferences.receipt_emails'));
        $this->assertCount(3, $response->json('invoices'));
    }
}


