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
        // Check if unified_payment_entries table already exists
        if (Schema::hasTable('unified_payment_entries')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('unified_payment_entries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('landlord_id');
            $table->unsignedBigInteger('tenant_unit_id')->nullable();
            $table->enum('payment_type', ['rent', 'maintenance_expense', 'security_refund', 'fee', 'other_income', 'other_outgoing']);
            $table->enum('flow_direction', ['income', 'outgoing']);
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->text('description')->nullable();
            $table->date('due_date')->nullable();
            $table->date('transaction_date')->nullable();
            $table->enum('status', ['draft', 'pending', 'scheduled', 'completed', 'partial', 'cancelled', 'failed', 'refunded'])->default('draft');
            $table->string('payment_method', 150)->nullable();
            $table->string('reference_number', 150)->nullable();
            $table->string('source_type', 150)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->json('metadata')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestamp('captured_at')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index('created_by', 'idx_unified_payment_entries_created_by');
            $table->index('landlord_id', 'idx_unified_payment_entries_landlord');
            $table->index('tenant_unit_id', 'idx_unified_payment_entries_tenant_unit');
            $table->index('payment_type', 'idx_unified_payment_entries_type');
            $table->index('flow_direction', 'idx_unified_payment_entries_flow');
            $table->index('status', 'idx_unified_payment_entries_status');
            $table->index(['source_type', 'source_id'], 'idx_unified_payment_entries_source'); // Combined index instead of duplicate
        });

        // Add foreign key constraints separately if referenced tables exist
        if (Schema::hasTable('users')) {
            try {
                Schema::table('unified_payment_entries', function (Blueprint $table) {
                    $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('unified_payment_entries', function (Blueprint $table) {
                    $table->foreign('landlord_id')->references('id')->on('landlords')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('tenant_units')) {
            try {
                Schema::table('unified_payment_entries', function (Blueprint $table) {
                    $table->foreign('tenant_unit_id')->references('id')->on('tenant_units')->onDelete('set null')->onUpdate('no action');
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
        Schema::dropIfExists('unified_payment_entries');
    }
};
