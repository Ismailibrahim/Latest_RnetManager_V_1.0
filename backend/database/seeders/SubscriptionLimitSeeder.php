<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SubscriptionLimitSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            [
                'tier' => 'basic',
                'max_properties' => 1,
                'max_units' => 5,
                'max_users' => 1,
                'monthly_price' => 0.00,
                'features' => json_encode(['basic_reports', 'email_support']),
            ],
            [
                'tier' => 'pro',
                'max_properties' => 10,
                'max_units' => 50,
                'max_users' => 5,
                'monthly_price' => 999.00,
                'features' => json_encode(['advanced_reports', 'phone_support', 'maintenance_tracking']),
            ],
            [
                'tier' => 'enterprise',
                'max_properties' => 100,
                'max_units' => 1000,
                'max_users' => 50,
                'monthly_price' => 4999.00,
                'features' => json_encode(['all_features', 'dedicated_support', 'api_access', 'custom_reports']),
            ],
        ];

        // Use insertOrIgnore to avoid errors if data already exists
        // Then use updateOrInsert to ensure data is correct
        foreach ($data as $limit) {
            DB::table('subscription_limits')->updateOrInsert(
                ['tier' => $limit['tier']],
                $limit
            );
        }
    }
}

