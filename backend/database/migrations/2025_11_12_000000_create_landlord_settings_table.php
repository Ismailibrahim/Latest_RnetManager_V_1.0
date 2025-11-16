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
        Schema::create('landlord_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->json('settings')->nullable();
            $table->timestamps();

            $table->unique('landlord_id');
            $table->index('landlord_id', 'idx_landlord_settings_landlord');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('landlord_settings');
    }
};

