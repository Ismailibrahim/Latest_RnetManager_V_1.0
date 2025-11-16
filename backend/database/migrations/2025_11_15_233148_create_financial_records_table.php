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
        // Check if financial_records table already exists (created by earlier migration)
        if (Schema::hasTable('financial_records')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('financial_records', function (Blueprint $table) {
            $table->id();
            // Use foreignId() instead of bigInteger() for compatibility
            $table->unsignedBigInteger('landlord_id');
            $table->unsignedBigInteger('tenant_unit_id');
            $table->enum('type', ['rent', 'expense', 'security_deposit', 'refund', 'fee']);
            $table->enum('category', ['monthly_rent', 'late_fee', 'processing_fee', 'maintenance', 'repair', 'utility', 'tax', 'insurance', 'management_fee', 'other']);
            $table->decimal('amount', 10, 2);
            $table->text('description');
            $table->date('due_date')->nullable();
            $table->date('paid_date')->nullable();
            $table->date('transaction_date');
            $table->string('invoice_number', 100)->nullable();
            $table->enum('payment_method', ['cash', 'bank_transfer', 'upi', 'card', 'cheque'])->default('cash');
            $table->string('reference_number', 100)->nullable();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->integer('is_installment')->default(0);
            $table->integer('installment_number')->nullable();
            $table->integer('total_installments')->nullable();
            $table->enum('status', ['pending', 'completed', 'cancelled', 'overdue', 'partial'])->default('completed');
            $table->timestamps();
            
            // Indexes - fixed duplicate index name
            $table->index('parent_id', 'idx_financial_parent_id');
            $table->index('landlord_id', 'idx_financial_landlord');
            $table->index('tenant_unit_id', 'idx_financial_tenant_unit');
            $table->index(['due_date', 'paid_date'], 'idx_financial_dates'); // Combined index instead of duplicate
            $table->index('status', 'idx_financial_status');
            $table->index('invoice_number', 'idx_financial_invoice');
        });

        // Add foreign key constraints separately if referenced tables exist
        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('financial_records', function (Blueprint $table) {
                    $table->foreign('landlord_id')->references('id')->on('landlords')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('tenant_units')) {
            try {
                Schema::table('financial_records', function (Blueprint $table) {
                    $table->foreign('tenant_unit_id')->references('id')->on('tenant_units')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        // Self-referencing foreign key for parent_id
        if (Schema::hasTable('financial_records')) {
            try {
                Schema::table('financial_records', function (Blueprint $table) {
                    $table->foreign('parent_id')->references('id')->on('financial_records')->onDelete('set null')->onUpdate('no action');
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
        Schema::dropIfExists('financial_records');
    }
};
