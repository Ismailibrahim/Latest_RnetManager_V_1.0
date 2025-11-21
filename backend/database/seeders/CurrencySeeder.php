<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CurrencySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $currencies = [
            ['code' => 'AED', 'name' => 'United Arab Emirates Dirham', 'symbol' => 'د.إ', 'is_active' => true, 'sort_order' => 1],
            ['code' => 'USD', 'name' => 'US Dollar', 'symbol' => '$', 'is_active' => true, 'sort_order' => 2],
            ['code' => 'EUR', 'name' => 'Euro', 'symbol' => '€', 'is_active' => true, 'sort_order' => 3],
            ['code' => 'GBP', 'name' => 'British Pound', 'symbol' => '£', 'is_active' => true, 'sort_order' => 4],
            ['code' => 'MVR', 'name' => 'Maldivian Rufiyaa', 'symbol' => 'Rf', 'is_active' => true, 'sort_order' => 5],
            ['code' => 'INR', 'name' => 'Indian Rupee', 'symbol' => '₹', 'is_active' => true, 'sort_order' => 6],
            ['code' => 'SAR', 'name' => 'Saudi Riyal', 'symbol' => '﷼', 'is_active' => true, 'sort_order' => 7],
            ['code' => 'QAR', 'name' => 'Qatari Riyal', 'symbol' => '﷼', 'is_active' => true, 'sort_order' => 8],
            ['code' => 'KWD', 'name' => 'Kuwaiti Dinar', 'symbol' => 'د.ك', 'is_active' => true, 'sort_order' => 9],
            ['code' => 'OMR', 'name' => 'Omani Rial', 'symbol' => '﷼', 'is_active' => true, 'sort_order' => 10],
            ['code' => 'BHD', 'name' => 'Bahraini Dinar', 'symbol' => '.د.ب', 'is_active' => true, 'sort_order' => 11],
            ['code' => 'JPY', 'name' => 'Japanese Yen', 'symbol' => '¥', 'is_active' => true, 'sort_order' => 12],
            ['code' => 'CNY', 'name' => 'Chinese Yuan', 'symbol' => '¥', 'is_active' => true, 'sort_order' => 13],
            ['code' => 'AUD', 'name' => 'Australian Dollar', 'symbol' => 'A$', 'is_active' => true, 'sort_order' => 14],
            ['code' => 'CAD', 'name' => 'Canadian Dollar', 'symbol' => 'C$', 'is_active' => true, 'sort_order' => 15],
            ['code' => 'CHF', 'name' => 'Swiss Franc', 'symbol' => 'CHF', 'is_active' => true, 'sort_order' => 16],
            ['code' => 'SGD', 'name' => 'Singapore Dollar', 'symbol' => 'S$', 'is_active' => true, 'sort_order' => 17],
            ['code' => 'MYR', 'name' => 'Malaysian Ringgit', 'symbol' => 'RM', 'is_active' => true, 'sort_order' => 18],
            ['code' => 'THB', 'name' => 'Thai Baht', 'symbol' => '฿', 'is_active' => true, 'sort_order' => 19],
            ['code' => 'PKR', 'name' => 'Pakistani Rupee', 'symbol' => '₨', 'is_active' => true, 'sort_order' => 20],
            ['code' => 'BDT', 'name' => 'Bangladeshi Taka', 'symbol' => '৳', 'is_active' => true, 'sort_order' => 21],
            ['code' => 'LKR', 'name' => 'Sri Lankan Rupee', 'symbol' => 'Rs', 'is_active' => true, 'sort_order' => 22],
            ['code' => 'NPR', 'name' => 'Nepalese Rupee', 'symbol' => '₨', 'is_active' => true, 'sort_order' => 23],
            ['code' => 'IDR', 'name' => 'Indonesian Rupiah', 'symbol' => 'Rp', 'is_active' => true, 'sort_order' => 24],
            ['code' => 'PHP', 'name' => 'Philippine Peso', 'symbol' => '₱', 'is_active' => true, 'sort_order' => 25],
            ['code' => 'ZAR', 'name' => 'South African Rand', 'symbol' => 'R', 'is_active' => true, 'sort_order' => 26],
            ['code' => 'EGP', 'name' => 'Egyptian Pound', 'symbol' => '£', 'is_active' => true, 'sort_order' => 27],
            ['code' => 'TRY', 'name' => 'Turkish Lira', 'symbol' => '₺', 'is_active' => true, 'sort_order' => 28],
            ['code' => 'RUB', 'name' => 'Russian Ruble', 'symbol' => '₽', 'is_active' => true, 'sort_order' => 29],
            ['code' => 'NZD', 'name' => 'New Zealand Dollar', 'symbol' => 'NZ$', 'is_active' => true, 'sort_order' => 30],
        ];

        foreach ($currencies as $currency) {
            DB::table('currencies')->updateOrInsert(
                ['code' => $currency['code']],
                $currency
            );
        }
    }
}

