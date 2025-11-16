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
        Schema::create('financial_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->foreignId('tenant_unit_id')->constrained('tenant_units')->cascadeOnDelete();
            $table->enum('type', ['rent', 'expense', 'security_deposit', 'refund', 'fee']);
            $table->enum('category', [
                'monthly_rent', 'late_fee', 'processing_fee',
                'maintenance', 'repair', 'utility', 'tax', 'insurance', 'management_fee', 'other',
            ]);
            $table->decimal('amount', 10, 2);
            $table->string('description', 500);
            $table->date('due_date')->nullable();
            $table->date('paid_date')->nullable();
            $table->date('transaction_date');
            $table->string('invoice_number', 100)->nullable();
            $table->enum('payment_method', ['cash', 'bank_transfer', 'upi', 'card', 'cheque'])->default('cash');
            $table->string('reference_number', 100)->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('financial_records')->nullOnDelete();
            $table->boolean('is_installment')->default(false);
            $table->integer('installment_number')->nullable();
            $table->integer('total_installments')->nullable();
            $table->enum('status', ['pending', 'completed', 'cancelled', 'overdue', 'partial'])->default('completed');
            $table->timestamps();

            $table->index('landlord_id', 'idx_financial_landlord');
            $table->index('tenant_unit_id', 'idx_financial_tenant_unit');
            $table->index(['due_date', 'paid_date'], 'idx_financial_dates');
            $table->index('status', 'idx_financial_status');
            $table->index('invoice_number', 'idx_financial_invoice');
        });

        Schema::create('rent_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_unit_id')->constrained('tenant_units')->cascadeOnDelete();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->string('invoice_number', 100)->unique();
            $table->date('invoice_date');
            $table->date('due_date');
            $table->decimal('rent_amount', 10, 2);
            $table->decimal('late_fee', 10, 2)->default(0);
            $table->enum('status', ['generated', 'sent', 'paid', 'overdue', 'cancelled'])->default('generated');
            $table->date('paid_date')->nullable();
            $table->enum('payment_method', ['cash', 'bank_transfer', 'upi', 'card', 'cheque'])->nullable();
            $table->timestamps();

            $table->index('tenant_unit_id', 'idx_invoices_tenant_unit');
            $table->index('status', 'idx_invoices_status');
            $table->index('due_date', 'idx_invoices_due_date');
            $table->index('invoice_number', 'idx_invoices_number');
        });

        Schema::create('security_deposit_refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_unit_id')->constrained('tenant_units')->cascadeOnDelete();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->string('refund_number', 100)->unique();
            $table->date('refund_date');
            $table->decimal('original_deposit', 10, 2);
            $table->decimal('deductions', 10, 2)->default(0);
            $table->decimal('refund_amount', 10, 2);
            $table->json('deduction_reasons')->nullable();
            $table->enum('status', ['pending', 'processed', 'cancelled'])->default('pending');
            $table->enum('payment_method', ['bank_transfer', 'cheque', 'cash', 'upi'])->nullable();
            $table->string('transaction_reference', 100)->nullable();
            $table->boolean('receipt_generated')->default(false);
            $table->string('receipt_number', 100)->nullable();
            $table->timestamps();

            $table->index('refund_number', 'idx_deposit_refund_number');
            $table->index('status', 'idx_deposit_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('security_deposit_refunds');
        Schema::dropIfExists('rent_invoices');
        Schema::dropIfExists('financial_records');
    }
};
