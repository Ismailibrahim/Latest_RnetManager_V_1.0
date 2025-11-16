<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\AssetType;
use App\Models\Landlord;
use App\Models\MaintenanceRequest;
use App\Models\Property;
use App\Models\Nationality;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\TenantUnit;
use App\Models\Unit;
use App\Models\UnitType;
use App\Models\User;
use Faker\Generator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        /** @var Generator $faker */
        $faker = app(Generator::class);

        $landlord = Landlord::query()->firstOrCreate(
            ['company_name' => 'RentApplicaiton Demo Estates'],
            ['subscription_tier' => Landlord::TIER_PRO],
        );

        if ($landlord->subscription_tier !== Landlord::TIER_PRO) {
            $landlord->forceFill(['subscription_tier' => Landlord::TIER_PRO])->save();
        }

        $this->seedTeam($landlord, $faker);

        $unitTypes = UnitType::all()->keyBy('name');

        if ($unitTypes->isEmpty()) {
            $this->command?->warn('Skipping demo property seeding because unit types have not been seeded.');

            return;
        }

        $assetTypes = AssetType::all();

        if ($assetTypes->isEmpty()) {
            $this->command?->warn('Skipping demo property seeding because asset types have not been seeded.');

            return;
        }

        $nationalities = collect([
            'Maldivian',
            'Sri Lankan',
            'Indian',
            'Bangladeshi',
        ])->map(function (string $name): Nationality {
            return Nationality::query()->firstOrCreate(['name' => $name]);
        });

        $properties = collect([
            ['name' => 'Coral View Apartments', 'type' => 'residential'],
            ['name' => 'Lagoon Plaza', 'type' => 'commercial'],
        ])->map(function (array $definition) use ($landlord, $faker): Property {
            $property = Property::query()->firstOrNew([
                'landlord_id' => $landlord->id,
                'name' => $definition['name'],
            ]);

            $property->fill([
                'type' => $definition['type'],
                'address' => $property->address ?? $faker->address(),
            ]);

            $property->save();

            return $property->fresh(['units.assets']);
        });

        $properties->each(function (Property $property) use ($landlord, $unitTypes, $assetTypes, $faker): void {
            $unitTypeIds = $unitTypes->pluck('id');

            $units = collect();

            for ($i = 1; $i <= 4; $i++) {
                $unitNumber = sprintf('U-%02d', $i);

                $unit = Unit::query()->firstOrCreate(
                    [
                        'property_id' => $property->id,
                        'unit_number' => $unitNumber,
                    ],
                    [
                        'landlord_id' => $landlord->id,
                        'unit_type_id' => $unitTypeIds->random(),
                        'rent_amount' => $faker->randomFloat(2, 8000, 25000),
                        'security_deposit' => $faker->randomFloat(2, 8000, 50000),
                        'is_occupied' => false,
                    ],
                );

                $units->push($unit->fresh('assets'));
            }

            $units->each(function (Unit $unit) use ($faker, $assetTypes): void {
                $existingAssets = $unit->assets()->count();
                $assetsToCreate = max(0, 2 - $existingAssets);

                if ($assetsToCreate === 0) {
                    return;
                }

                Asset::factory()
                    ->count($assetsToCreate)
                    ->for($unit)
                    ->create([
                        'asset_type_id' => $assetTypes->random()->id,
                        'ownership' => 'landlord',
                        'tenant_id' => null,
                        'name' => $faker->randomElement(['Air Conditioner', 'Fridge', 'Washer', 'Water Heater']),
                    ]);
            });
        });

        $existingTenantCount = Tenant::query()->where('landlord_id', $landlord->id)->count();
        $tenantsToCreate = max(0, 5 - $existingTenantCount);

        if ($tenantsToCreate > 0) {
            Tenant::factory()
                ->count($tenantsToCreate)
                ->for($landlord)
                ->state(function () use ($nationalities): array {
                    return [
                        'nationality_id' => $nationalities->random()->id,
                    ];
                })
                ->create();
        }

        Tenant::query()
            ->where('landlord_id', $landlord->id)
            ->get()
            ->each(function (Tenant $tenant) use ($landlord, $faker): void {
                if ($tenant->tenantUnits()->exists()) {
                    if ($tenant->status !== 'active') {
                        $tenant->forceFill(['status' => 'active'])->save();
                    }

                    return;
                }

                $unit = Unit::query()->where('landlord_id', $landlord->id)->inRandomOrder()->first();

                if (! $unit) {
                    return;
                }

                $tenantUnit = TenantUnit::factory()
                    ->for($tenant)
                    ->for($unit)
                    ->for($landlord)
                    ->create([
                        'status' => 'active',
                        'monthly_rent' => $unit->rent_amount,
                    ]);

                $assetId = $unit->assets()->inRandomOrder()->value('id');

                if ($assetId) {
                    MaintenanceRequest::factory()
                        ->count(1)
                        ->for($unit)
                        ->for($landlord)
                        ->create([
                            'description' => $faker->sentence(),
                            'billed_to_tenant' => false,
                            'asset_id' => $assetId,
                        ]);
                }

                $tenant->forceFill(['status' => 'active'])->save();
            });

        $subscriptionLimit = $landlord->subscriptionLimit()
            ->first();

        if (! Schema::hasTable('subscription_invoices')) {
            $this->command?->warn('Skipping subscription invoice seeding because the table does not exist.');

            return;
        }

        for ($monthsAgo = 0; $monthsAgo < 6; $monthsAgo++) {
            $issuedAt = now()->startOfMonth()->subMonths($monthsAgo);
            $periodStart = $issuedAt->copy();
            $periodEnd = $issuedAt->copy()->endOfMonth();
            $status = $monthsAgo === 0 ? 'pending' : 'paid';

            SubscriptionInvoice::query()->updateOrCreate(
                [
                    'landlord_id' => $landlord->id,
                    'invoice_number' => sprintf('SUB-%s', $issuedAt->format('Ym')),
                ],
                [
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                    'issued_at' => $issuedAt,
                    'due_at' => $issuedAt->copy()->addDays(7),
                    'paid_at' => $status === 'paid' ? $issuedAt->copy()->addDays(3) : null,
                    'amount' => $subscriptionLimit?->monthly_price ?? 0,
                    'currency' => 'USD',
                    'status' => $status,
                    'download_url' => null,
                    'metadata' => [
                        'notes' => $status === 'paid'
                            ? 'Paid via corporate card'
                            : 'Awaiting payment',
                    ],
                ]
            );
        }
    }

    protected function seedTeam(Landlord $landlord, Generator $faker): void
    {
        $users = [
            ['role' => User::ROLE_OWNER, 'email' => 'owner@rentapp.test', 'first_name' => 'Aisha', 'last_name' => 'Ibrahim'],
            ['role' => User::ROLE_ADMIN, 'email' => 'admin@rentapp.test', 'first_name' => 'Moosa', 'last_name' => 'Hassan'],
            ['role' => User::ROLE_MANAGER, 'email' => 'manager@rentapp.test', 'first_name' => 'Ziyad', 'last_name' => 'Abdul'],
            ['role' => User::ROLE_AGENT, 'email' => 'agent@rentapp.test', 'first_name' => 'Raisa', 'last_name' => 'Ahmed'],
        ];

        foreach ($users as $user) {
            $existing = User::query()->where('email', $user['email'])->first();

            $attributes = [
                'landlord_id' => $landlord->id,
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'mobile' => $faker->phoneNumber(),
                'password_hash' => 'Password123!', // mutator hashes automatically
                'role' => $user['role'],
                'is_active' => true,
            ];

            if ($existing) {
                $existing->fill($attributes);
                $existing->save();

                if (! $existing->remember_token) {
                    $existing->forceFill(['remember_token' => Str::random(10)])->save();
                }

                continue;
            }

            User::factory()->create(array_merge(
                [
                    'email' => $user['email'],
                ],
                $attributes,
            ));
        }
    }
}

