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
        Schema::create('subscription_limits', function (Blueprint $table) {
            $table->enum('tier', ['basic', 'pro', 'enterprise'])->primary();
            $table->unsignedInteger('max_properties');
            $table->unsignedInteger('max_units');
            $table->unsignedInteger('max_users');
            $table->decimal('monthly_price', 10, 2);
            $table->json('features')->nullable();
            $table->timestamp('created_at')->useCurrent();
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
