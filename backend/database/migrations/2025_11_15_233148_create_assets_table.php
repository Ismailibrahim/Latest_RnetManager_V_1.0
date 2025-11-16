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
        // Check if assets table already exists (created by earlier migration)
        if (Schema::hasTable('assets')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            // Use unsignedBigInteger first (avoid foreign key if tables don't exist)
            $table->unsignedBigInteger('asset_type_id');
            $table->unsignedBigInteger('unit_id');
            $table->enum('ownership', ['landlord', 'tenant'])->default('landlord');
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->string('name', 255);
            $table->string('brand', 100)->nullable();
            $table->string('model', 100)->nullable();
            $table->string('location', 100)->nullable();
            $table->date('installation_date')->nullable();
            $table->enum('status', ['working', 'maintenance', 'broken'])->default('working');
            $table->timestamps();
            
            $table->index('unit_id', 'idx_assets_unit');
            $table->index('status', 'idx_assets_status');
            $table->index('asset_type_id', 'idx_assets_type');
            $table->index('ownership', 'idx_assets_ownership');
            $table->index('tenant_id', 'idx_assets_tenant');
        });

        // Add foreign key constraints separately if referenced tables exist
        if (Schema::hasTable('asset_types')) {
            try {
                Schema::table('assets', function (Blueprint $table) {
                    $table->foreign('asset_type_id')->references('id')->on('asset_types')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('units')) {
            try {
                Schema::table('assets', function (Blueprint $table) {
                    $table->foreign('unit_id')->references('id')->on('units')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('tenants')) {
            try {
                Schema::table('assets', function (Blueprint $table) {
                    $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('set null')->onUpdate('no action');
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
        Schema::dropIfExists('assets');
    }
};
