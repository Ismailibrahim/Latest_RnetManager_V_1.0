<?php

namespace Database\Factories;

use App\Models\AssetType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AssetType>
 */
class AssetTypeFactory extends Factory
{
    protected $model = AssetType::class;

    public function definition(): array
    {
        static $categories = ['appliance', 'furniture', 'electronic', 'fixture', 'other'];
        static $counter = 0;
        $names = ['Refrigerator', 'Washing Machine', 'Air Conditioner', 'Television', 'Microwave', 'Dishwasher'];
        
        return [
            'name' => $names[$counter++ % count($names)],
            'category' => $categories[$counter % count($categories)],
            'is_active' => true,
        ];
    }
}
