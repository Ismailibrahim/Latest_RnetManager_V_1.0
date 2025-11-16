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
        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->string('name');
            $table->text('address');
            $table->enum('type', ['residential', 'commercial'])->default('residential');
            $table->timestamps();

            $table->index('landlord_id', 'idx_property_landlord');
            $table->index('type', 'idx_property_type');
        });

        Schema::create('unit_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('description', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_at')->useCurrent();

            $table->index('name', 'idx_unit_type_name');
            $table->index('is_active', 'idx_unit_type_active');
        });

        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->foreignId('unit_type_id')->constrained('unit_types')->restrictOnDelete();
            $table->string('unit_number', 50);
            $table->decimal('rent_amount', 10, 2);
            $table->decimal('security_deposit', 10, 2)->nullable();
            $table->boolean('is_occupied')->default(false);
            $table->timestamps();

            $table->index('property_id', 'idx_unit_property');
            $table->index('landlord_id', 'idx_unit_landlord');
            $table->index('is_occupied', 'idx_unit_occupied');
            $table->index('unit_type_id', 'idx_unit_type');
            $table->unique(['property_id', 'unit_number'], 'unique_unit_property');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('units');
        Schema::dropIfExists('unit_types');
        Schema::dropIfExists('properties');
    }
};
