<?php

namespace Database\Seeders;

use App\Models\Currency;
use Illuminate\Database\Seeder;

class CurrencySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $currencies = [
            [
                'code' => 'MVR',
                'name' => 'Maldivian Rufiyaa',
                'symbol' => 'ރ', // Official Thaana symbol (Unicode U+0783)
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'code' => 'USD',
                'name' => 'US Dollar',
                'symbol' => '$',
                'is_active' => true,
                'sort_order' => 2,
            ],
        ];

        foreach ($currencies as $currencyData) {
            Currency::query()->updateOrCreate(
                ['code' => $currencyData['code']],
                [
                    'name' => $currencyData['name'],
                    'symbol' => $currencyData['symbol'],
                    'is_active' => $currencyData['is_active'],
                    'sort_order' => $currencyData['sort_order'],
                ]
            );
        }
    }
}
