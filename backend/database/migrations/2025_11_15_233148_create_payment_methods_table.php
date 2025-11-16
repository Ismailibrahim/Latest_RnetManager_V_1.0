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
        // Check if payment_methods table already exists
        if (Schema::hasTable('payment_methods')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->integer('is_active')->default(1);
            $table->integer('supports_reference')->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->unique('name', 'payment_methods_name_unique');
            $table->index('is_active', 'idx_payment_methods_active'); // Fixed duplicate index name
            $table->index('sort_order', 'idx_payment_methods_sort_order'); // Fixed duplicate index name
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
