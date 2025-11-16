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
        // Check if subscription_limits table already exists
        if (Schema::hasTable('subscription_limits')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('subscription_limits', function (Blueprint $table) {
            $table->enum('tier', ['basic', 'pro', 'enterprise'])->primary();
            $table->integer('max_properties');
            $table->integer('max_units');
            $table->integer('max_users');
            $table->decimal('monthly_price', 10, 2);
            $table->json('features')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_limits');
    }
};
