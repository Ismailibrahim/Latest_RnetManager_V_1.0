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
        // Check if unit_occupancy_history table already exists
        if (Schema::hasTable('unit_occupancy_history')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('unit_occupancy_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('unit_id');
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('tenant_unit_id');
            $table->enum('action', ['move_in', 'move_out']);
            $table->date('action_date');
            $table->decimal('rent_amount', 10, 2)->nullable();
            $table->decimal('security_deposit_amount', 10, 2)->nullable();
            $table->date('lease_start_date')->nullable();
            $table->date('lease_end_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index('unit_id', 'idx_unit_occupancy_unit');
            $table->index('tenant_id', 'idx_unit_occupancy_tenant');
            $table->index('tenant_unit_id', 'idx_unit_occupancy_tenant_unit');
            $table->index('action_date', 'idx_unit_occupancy_date');
            $table->index('action', 'idx_unit_occupancy_action');
        });

        // Add foreign key constraints separately if referenced tables exist
        if (Schema::hasTable('tenants')) {
            try {
                Schema::table('unit_occupancy_history', function (Blueprint $table) {
                    $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('tenant_units')) {
            try {
                Schema::table('unit_occupancy_history', function (Blueprint $table) {
                    $table->foreign('tenant_unit_id')->references('id')->on('tenant_units')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('units')) {
            try {
                Schema::table('unit_occupancy_history', function (Blueprint $table) {
                    $table->foreign('unit_id')->references('id')->on('units')->onDelete('cascade')->onUpdate('no action');
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
        Schema::dropIfExists('unit_occupancy_history');
    }
};
