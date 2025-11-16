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
        // Check if unit_types table already exists (created by earlier migration)
        if (Schema::hasTable('unit_types')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('unit_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('description', 255)->nullable();
            $table->integer('is_active')->default(1);
            $table->timestamps();
            $table->unique('name', 'unit_types_name_unique');
            $table->index('name', 'idx_unit_type_name');
            $table->index('is_active', 'idx_unit_type_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('unit_types');
    }
};
