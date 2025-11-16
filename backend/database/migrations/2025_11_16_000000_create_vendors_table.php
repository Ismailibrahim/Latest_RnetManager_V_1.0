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
        Schema::create('vendors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->string('name', 255);
            $table->string('service_category', 100)->index(); // e.g., HVAC, Plumbing, Electrical
            $table->string('phone', 50)->nullable();
            $table->string('email', 255)->nullable();
            $table->boolean('is_preferred')->default(false)->index();
            $table->string('notes', 500)->nullable();
            $table->timestamps();

            $table->index(['landlord_id', 'service_category'], 'idx_vendor_landlord_category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendors');
    }
};


