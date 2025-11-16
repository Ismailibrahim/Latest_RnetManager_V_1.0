<?php

namespace Database\Seeders;

use App\Models\UnitType;
use Illuminate\Database\Seeder;

class UnitTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['name' => 'Studio', 'description' => 'Single room with kitchenette'],
            ['name' => '1BHK', 'description' => '1 Bedroom, Hall, Kitchen'],
            ['name' => '2BHK', 'description' => '2 Bedrooms, Hall, Kitchen'],
            ['name' => '3BHK', 'description' => '3 Bedrooms, Hall, Kitchen'],
            ['name' => 'Shop', 'description' => 'Commercial retail space'],
            ['name' => 'Office', 'description' => 'Commercial office space'],
            ['name' => 'Warehouse', 'description' => 'Storage or industrial space'],
            ['name' => 'Penthouse', 'description' => 'Luxury top-floor apartment'],
        ];

        foreach ($types as $type) {
            UnitType::query()->updateOrCreate(
                ['name' => $type['name']],
                ['description' => $type['description'], 'is_active' => true],
            );
        }
    }
}

