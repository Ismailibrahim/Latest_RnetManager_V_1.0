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
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->string('full_name');
            $table->string('email')->nullable();
            $table->string('phone', 20);
            $table->string('alternate_phone', 20)->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone', 20)->nullable();
            $table->enum('id_proof_type', ['national_id', 'passport'])->nullable();
            $table->string('id_proof_number', 100)->nullable();
            $table->enum('status', ['active', 'inactive', 'former'])->default('active');
            $table->timestamps();

            $table->index('landlord_id', 'idx_tenant_landlord');
            $table->index('status', 'idx_tenant_status');
            $table->index('phone', 'idx_tenant_phone');
            $table->index('email', 'idx_tenant_email');
        });

        Schema::create('tenant_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->date('lease_start');
            $table->date('lease_end');
            $table->decimal('monthly_rent', 10, 2);
            $table->decimal('security_deposit_paid', 10, 2)->default(0);
            $table->integer('advance_rent_months')->default(0);
            $table->decimal('advance_rent_amount', 10, 2)->default(0);
            $table->integer('notice_period_days')->nullable();
            $table->integer('lock_in_period_months')->nullable();
            $table->string('lease_document_path', 500)->nullable();
            $table->enum('status', ['active', 'ended', 'cancelled'])->default('active');
            $table->timestamps();

            $table->index('tenant_id', 'idx_tenant_units_tenant');
            $table->index('unit_id', 'idx_tenant_units_unit');
            $table->index('status', 'idx_tenant_units_status');
            $table->index(['lease_start', 'lease_end'], 'idx_tenant_units_dates');
        });

        Schema::create('unit_occupancy_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('tenant_unit_id')->constrained('tenant_units')->cascadeOnDelete();
            $table->enum('action', ['move_in', 'move_out']);
            $table->date('action_date');
            $table->decimal('rent_amount', 10, 2)->nullable();
            $table->decimal('security_deposit_amount', 10, 2)->nullable();
            $table->date('lease_start_date')->nullable();
            $table->date('lease_end_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('unit_id', 'idx_unit_occupancy_unit');
            $table->index('tenant_id', 'idx_unit_occupancy_tenant');
            $table->index('tenant_unit_id', 'idx_unit_occupancy_tenant_unit');
            $table->index('action_date', 'idx_unit_occupancy_date');
            $table->index('action', 'idx_unit_occupancy_action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('unit_occupancy_history');
        Schema::dropIfExists('tenant_units');
        Schema::dropIfExists('tenants');
    }
};
