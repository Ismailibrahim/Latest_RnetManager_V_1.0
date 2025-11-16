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
        Schema::create('asset_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->enum('category', ['appliance', 'furniture', 'electronic', 'fixture', 'other'])->default('appliance');
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_at')->useCurrent();

            $table->index('name', 'idx_asset_type_name');
            $table->index('category', 'idx_asset_type_category');
            $table->index('is_active', 'idx_asset_type_active');
        });

        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_type_id')->constrained('asset_types')->restrictOnDelete();
            $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
            $table->enum('ownership', ['landlord', 'tenant'])->default('landlord');
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('name');
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
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assets');
        Schema::dropIfExists('asset_types');
    }
};
