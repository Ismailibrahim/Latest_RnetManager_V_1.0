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
        // Check if tenant_units table already exists (created by earlier migration)
        if (Schema::hasTable('tenant_units')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('tenant_units', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('unit_id');
            $table->unsignedBigInteger('landlord_id');
            $table->date('lease_start');
            $table->date('lease_end');
            $table->decimal('monthly_rent', 10, 2);
            $table->decimal('security_deposit_paid', 10, 2)->default(0.00);
            $table->integer('advance_rent_months')->default(0);
            $table->decimal('advance_rent_amount', 10, 2)->default(0.00);
            $table->integer('notice_period_days')->nullable();
            $table->integer('lock_in_period_months')->nullable();
            $table->text('lease_document_path')->nullable();
            $table->enum('status', ['active', 'ended', 'cancelled'])->default('active');
            $table->timestamps();
            $table->index('landlord_id', 'idx_tenant_units_landlord');
            $table->index('tenant_id', 'idx_tenant_units_tenant');
            $table->index('unit_id', 'idx_tenant_units_unit');
            $table->index('status', 'idx_tenant_units_status');
            $table->index(['lease_start', 'lease_end'], 'idx_tenant_units_dates'); // Combined index instead of duplicate
        });

        // Add foreign key constraints separately if referenced tables exist
        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('tenant_units', function (Blueprint $table) {
                    $table->foreign('landlord_id')->references('id')->on('landlords')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('tenants')) {
            try {
                Schema::table('tenant_units', function (Blueprint $table) {
                    $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('units')) {
            try {
                Schema::table('tenant_units', function (Blueprint $table) {
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
        Schema::dropIfExists('tenant_units');
    }
};
