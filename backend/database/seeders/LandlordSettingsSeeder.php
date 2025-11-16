<?php

namespace Database\Seeders;

use App\Models\Landlord;
use App\Models\LandlordSetting;
use Illuminate\Database\Seeder;

class LandlordSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $defaultSettings = LandlordSetting::getDefaultSettings();

        // Get all landlords that don't have settings yet
        $landlords = Landlord::whereDoesntHave('settings')->get();

        foreach ($landlords as $landlord) {
            LandlordSetting::create([
                'landlord_id' => $landlord->id,
                'settings' => $defaultSettings,
            ]);
        }
    }
}

