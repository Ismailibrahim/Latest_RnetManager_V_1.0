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
        // Check if properties table already exists (created by earlier migration)
        if (Schema::hasTable('properties')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('landlord_id');
            $table->string('name', 255);
            $table->text('address');
            $table->enum('type', ['residential', 'commercial'])->default('residential');
            $table->timestamps();
            $table->index('landlord_id', 'idx_property_landlord');
            $table->index('type', 'idx_property_type');
        });

        // Add foreign key constraint separately if landlords table exists
        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('properties', function (Blueprint $table) {
                    $table->foreign('landlord_id')->references('id')->on('landlords')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};
