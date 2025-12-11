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
            ['name' => 'Dishwasher', 'category' => 'appliance'],
            ['name' => 'Oven', 'category' => 'appliance'],
            ['name' => 'Stove', 'category' => 'appliance'],
            ['name' => 'Dryer', 'category' => 'appliance'],
            ['name' => 'Table', 'category' => 'furniture'],
            ['name' => 'Chair', 'category' => 'furniture'],
            ['name' => 'Sofa', 'category' => 'furniture'],
            ['name' => 'Bed', 'category' => 'furniture'],
            ['name' => 'Cabinet', 'category' => 'furniture'],
        ];

        foreach ($types as $type) {
            AssetType::query()->updateOrCreate(
                ['name' => $type['name']],
                ['category' => $type['category'], 'is_active' => true],
            );
        }
    }
}
