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
        // Check if maintenance_invoices table already exists (created by earlier migration)
        if (Schema::hasTable('maintenance_invoices')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('maintenance_invoices', function (Blueprint $table) {
            $table->id();
            // Use unsignedBigInteger for foreign keys (compatible with UNSIGNED BIGINT)
            $table->unsignedBigInteger('tenant_unit_id');
            $table->unsignedBigInteger('landlord_id');
            $table->unsignedBigInteger('maintenance_request_id')->nullable();
            $table->string('invoice_number', 120);
            $table->date('invoice_date');
            $table->date('due_date');
            $table->enum('status', ['draft', 'sent', 'approved', 'paid', 'overdue', 'cancelled'])->default('draft');
            $table->decimal('labor_cost', 10, 2)->default(0.00);
            $table->decimal('parts_cost', 10, 2)->default(0.00);
            $table->decimal('tax_amount', 10, 2)->default(0.00);
            $table->decimal('misc_amount', 10, 2)->default(0.00);
            $table->decimal('discount_amount', 10, 2)->default(0.00);
            $table->decimal('grand_total', 10, 2);
            $table->json('line_items')->nullable();
            $table->text('notes')->nullable();
            $table->date('paid_date')->nullable();
            $table->enum('payment_method', ['cash', 'bank_transfer', 'upi', 'card', 'cheque'])->nullable();
            $table->string('reference_number', 100)->nullable();
            $table->timestamps();
            $table->unique('invoice_number', 'maintenance_invoices_invoice_number_unique');
            $table->index('landlord_id', 'idx_maintenance_invoices_landlord');
            $table->index('tenant_unit_id', 'idx_maintenance_invoices_tenant_unit');
            $table->index('maintenance_request_id', 'idx_maintenance_invoices_request');
            $table->index('status', 'idx_maintenance_invoices_status');
            $table->index('due_date', 'idx_maintenance_invoices_due_date');
        });

        // Add foreign key constraints separately if referenced tables exist
        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('maintenance_invoices', function (Blueprint $table) {
                    $table->foreign('landlord_id')->references('id')->on('landlords')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('tenant_units')) {
            try {
                Schema::table('maintenance_invoices', function (Blueprint $table) {
                    $table->foreign('tenant_unit_id')->references('id')->on('tenant_units')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('maintenance_requests')) {
            try {
                Schema::table('maintenance_invoices', function (Blueprint $table) {
                    $table->foreign('maintenance_request_id')->references('id')->on('maintenance_requests')->onDelete('set null')->onUpdate('no action');
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
        Schema::dropIfExists('maintenance_invoices');
    }
};
