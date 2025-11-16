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
        // Check if rent_invoices table already exists (created by earlier migration)
        if (Schema::hasTable('rent_invoices')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('rent_invoices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_unit_id');
            $table->unsignedBigInteger('landlord_id');
            $table->string('invoice_number', 100);
            $table->date('invoice_date');
            $table->date('due_date');
            $table->decimal('rent_amount', 10, 2);
            $table->decimal('late_fee', 10, 2)->default(0.00);
            $table->enum('status', ['generated', 'sent', 'paid', 'overdue', 'cancelled'])->default('generated');
            $table->date('paid_date')->nullable();
            $table->enum('payment_method', ['cash', 'bank_transfer', 'upi', 'card', 'cheque'])->nullable();
            $table->timestamps();
            $table->unique('invoice_number', 'rent_invoices_invoice_number_unique');
            $table->index('landlord_id', 'idx_rent_invoices_landlord');
            $table->index('tenant_unit_id', 'idx_invoices_tenant_unit');
            $table->index('status', 'idx_invoices_status');
            $table->index('due_date', 'idx_invoices_due_date');
            $table->index('invoice_number', 'idx_invoices_number');
        });

        // Add foreign key constraints separately if referenced tables exist
        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('rent_invoices', function (Blueprint $table) {
                    $table->foreign('landlord_id')->references('id')->on('landlords')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('tenant_units')) {
            try {
                Schema::table('rent_invoices', function (Blueprint $table) {
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
        Schema::dropIfExists('rent_invoices');
    }
};
