<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

class PaymentMethodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $paymentMethods = [
            [
                'name' => 'Bank Deposit',
                'is_active' => true,
                'supports_reference' => false,
                'sort_order' => 1,
            ],
            [
                'name' => 'Bank Transfer',
                'is_active' => true,
                'supports_reference' => false,
                'sort_order' => 2,
            ],
            [
                'name' => 'Cash Payment',
                'is_active' => true,
                'supports_reference' => false,
                'sort_order' => 3,
            ],
            [
                'name' => 'Cheque',
                'is_active' => true,
                'supports_reference' => false,
                'sort_order' => 4,
            ],
        ];

        foreach ($paymentMethods as $method) {
            PaymentMethod::query()->updateOrCreate(
                ['name' => $method['name']],
                [
                    'is_active' => $method['is_active'],
                    'supports_reference' => $method['supports_reference'],
                    'sort_order' => $method['sort_order'],
                ]
            );
        }
    }
}

