<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if landlord_settings table already exists (created by earlier migration)
        if (Schema::hasTable('landlord_settings')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('landlord_settings', function (Blueprint $table) {
            $table->id();
            // Create as unsigned big integer first (avoid foreign key if landlords doesn't exist)
            $table->unsignedBigInteger('landlord_id');
            $table->json('settings')->nullable();
            $table->timestamps();
            $table->unique('landlord_id', 'landlord_settings_landlord_id_unique');
            $table->index('landlord_id', 'idx_landlord_settings_landlord');
        });

        // Add foreign key constraint separately if landlords table exists
        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('landlord_settings', function (Blueprint $table) {
                    $table->foreign('landlord_id')->references('id')->on('landlords')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist or constraint already applied, ignore
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('landlord_settings');
    }
};
