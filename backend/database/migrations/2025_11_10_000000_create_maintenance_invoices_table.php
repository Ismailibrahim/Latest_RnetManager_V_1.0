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
        Schema::create('maintenance_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_unit_id')->constrained('tenant_units')->cascadeOnDelete();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->foreignId('maintenance_request_id')->nullable()->constrained('maintenance_requests')->nullOnDelete();
            $table->string('invoice_number', 120)->unique();
            $table->date('invoice_date');
            $table->date('due_date');
            $table->enum('status', ['draft', 'sent', 'approved', 'paid', 'overdue', 'cancelled'])->default('draft');
            $table->decimal('labor_cost', 10, 2)->default(0);
            $table->decimal('parts_cost', 10, 2)->default(0);
            $table->decimal('tax_amount', 10, 2)->default(0);
            $table->decimal('misc_amount', 10, 2)->default(0);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('grand_total', 10, 2);
            $table->json('line_items')->nullable();
            $table->text('notes')->nullable();
            $table->date('paid_date')->nullable();
            $table->enum('payment_method', ['cash', 'bank_transfer', 'upi', 'card', 'cheque'])->nullable();
            $table->string('reference_number', 100)->nullable();
            $table->timestamps();

            $table->index('tenant_unit_id', 'idx_maintenance_invoices_tenant_unit');
            $table->index('maintenance_request_id', 'idx_maintenance_invoices_request');
            $table->index('status', 'idx_maintenance_invoices_status');
            $table->index('due_date', 'idx_maintenance_invoices_due_date');
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

