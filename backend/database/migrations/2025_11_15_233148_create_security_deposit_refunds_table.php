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
        // Check if security_deposit_refunds table already exists (created by earlier migration)
        if (Schema::hasTable('security_deposit_refunds')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('security_deposit_refunds', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_unit_id');
            $table->unsignedBigInteger('landlord_id');
            $table->string('refund_number', 100);
            $table->date('refund_date');
            $table->decimal('original_deposit', 10, 2);
            $table->decimal('deductions', 10, 2)->default(0.00);
            $table->decimal('refund_amount', 10, 2);
            $table->json('deduction_reasons')->nullable();
            $table->enum('status', ['pending', 'processed', 'cancelled'])->default('pending');
            $table->enum('payment_method', ['bank_transfer', 'cheque', 'cash', 'upi'])->nullable();
            $table->string('transaction_reference', 100)->nullable();
            $table->integer('receipt_generated')->default(0);
            $table->string('receipt_number', 100)->nullable();
            $table->timestamps();
            $table->unique('refund_number', 'security_deposit_refunds_refund_number_unique');
            $table->index('tenant_unit_id', 'idx_deposit_refunds_tenant_unit');
            $table->index('landlord_id', 'idx_deposit_refunds_landlord');
            $table->index('refund_number', 'idx_deposit_refund_number');
            $table->index('status', 'idx_deposit_status');
        });

        // Add foreign key constraints separately if referenced tables exist
        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('security_deposit_refunds', function (Blueprint $table) {
                    $table->foreign('landlord_id')->references('id')->on('landlords')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('tenant_units')) {
            try {
                Schema::table('security_deposit_refunds', function (Blueprint $table) {
                    $table->foreign('tenant_unit_id')->references('id')->on('tenant_units')->onDelete('cascade')->onUpdate('no action');
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
        Schema::dropIfExists('security_deposit_refunds');
    }
};
