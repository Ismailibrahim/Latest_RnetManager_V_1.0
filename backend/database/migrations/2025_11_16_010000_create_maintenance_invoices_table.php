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
        if (Schema::hasTable('maintenance_invoices')) {
            // Table already exists (e.g., created manually or by a prior migration).
            // Mark this migration as run without altering the table.
            return;
        }
        Schema::create('maintenance_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_unit_id')->nullable()->constrained('tenant_units')->nullOnDelete();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->foreignId('maintenance_request_id')->constrained('maintenance_requests')->cascadeOnDelete();
            $table->string('invoice_number', 100)->unique();
            $table->date('invoice_date');
            $table->date('due_date');
            $table->enum('status', ['sent', 'paid', 'overdue', 'cancelled'])->default('sent');
            $table->decimal('labor_cost', 10, 2)->default(0);
            $table->decimal('parts_cost', 10, 2)->default(0);
            $table->decimal('tax_amount', 10, 2)->default(0);
            $table->decimal('misc_amount', 10, 2)->default(0);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('grand_total', 10, 2)->default(0);
            $table->json('line_items')->nullable();
            $table->text('notes')->nullable();
            $table->date('paid_date')->nullable();
            $table->enum('payment_method', ['cash', 'bank_transfer', 'upi', 'card', 'cheque'])->nullable();
            $table->string('reference_number', 100)->nullable();
            $table->timestamps();

            $table->index('tenant_unit_id', 'idx_maint_inv_tenant_unit');
            $table->index('maintenance_request_id', 'idx_maint_inv_request');
            $table->index('status', 'idx_maint_inv_status');
            $table->index('due_date', 'idx_maint_inv_due');
            $table->index('invoice_number', 'idx_maint_inv_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_invoices');
    }
};


