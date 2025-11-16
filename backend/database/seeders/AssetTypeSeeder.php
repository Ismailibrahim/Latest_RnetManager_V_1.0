<?php

namespace Database\Seeders;

use App\Models\AssetType;
use Illuminate\Database\Seeder;

class AssetTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['name' => 'AC', 'category' => 'appliance'],
            ['name' => 'Refrigerator', 'category' => 'appliance'],
            ['name' => 'Washing Machine', 'category' => 'appliance'],
            ['name' => 'Water Heater', 'category' => 'appliance'],
            ['name' => 'Microwave', 'category' => 'appliance'],
            ['name' => 'Television', 'category' => 'electronic'],
            ['name' => 'Sofa', 'category' => 'furniture'],
            ['name' => 'Bed', 'category' => 'furniture'],
            ['name' => 'Dining Table', 'category' => 'furniture'],
            ['name' => 'Wardrobe', 'category' => 'furniture'],
            ['name' => 'Fan', 'category' => 'fixture'],
            ['name' => 'Light', 'category' => 'fixture'],
            ['name' => 'Curtains', 'category' => 'other'],
        ];

        foreach ($types as $type) {
            AssetType::query()->updateOrCreate(
                ['name' => $type['name']],
                ['category' => $type['category'], 'is_active' => true],
            );
        }

        $existingNames = AssetType::query()->pluck('name')->map('strtolower')->all();

        AssetType::factory()
            ->count(5)
            ->sequence(fn () => [
                'name' => $this->uniqueName($existingNames),
            ])
            ->create();
    }

    protected function uniqueName(array &$existing): string
    {
        do {
            $candidate = strtolower(fake()->unique()->word());
        } while (in_array($candidate, $existing, true));

        $existing[] = $candidate;

        return ucfirst($candidate);
    }
}

