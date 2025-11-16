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
        // Check if units table already exists (created by earlier migration)
        if (Schema::hasTable('units')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('property_id');
            $table->unsignedBigInteger('landlord_id');
            $table->unsignedBigInteger('unit_type_id');
            $table->string('unit_number', 50);
            $table->decimal('rent_amount', 10, 2);
            $table->decimal('security_deposit', 10, 2)->nullable();
            $table->integer('is_occupied')->default(0);
            $table->timestamps();
            $table->unique(['property_id', 'unit_number'], 'unique_unit_property_number');
            $table->index('property_id', 'idx_unit_property');
            $table->index('landlord_id', 'idx_unit_landlord');
            $table->index('is_occupied', 'idx_unit_occupied');
            $table->index('unit_type_id', 'idx_unit_type');
        });

        // Add foreign key constraints separately if referenced tables exist
        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('units', function (Blueprint $table) {
                    $table->foreign('landlord_id')->references('id')->on('landlords')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('properties')) {
            try {
                Schema::table('units', function (Blueprint $table) {
                    $table->foreign('property_id')->references('id')->on('properties')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('unit_types')) {
            try {
                Schema::table('units', function (Blueprint $table) {
                    $table->foreign('unit_type_id')->references('id')->on('unit_types')->onUpdate('no action');
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
        Schema::dropIfExists('units');
    }
};
