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
        Schema::create('tenant_payment_submissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_unit_id');
            $table->unsignedBigInteger('rent_invoice_id');
            $table->unsignedBigInteger('landlord_id');
            $table->decimal('payment_amount', 12, 2);
            $table->date('payment_date');
            $table->enum('payment_method', ['cash', 'bank_deposit', 'bank_transfer'])->default('cash');
            $table->string('receipt_path')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'rejected'])->default('pending');
            $table->unsignedBigInteger('confirmed_by')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Foreign keys
            $table->foreign('tenant_unit_id')->references('id')->on('tenant_units')->onDelete('cascade');
            $table->foreign('rent_invoice_id')->references('id')->on('rent_invoices')->onDelete('cascade');
            $table->foreign('landlord_id')->references('id')->on('landlords')->onDelete('cascade');
            $table->foreign('confirmed_by')->references('id')->on('users')->onDelete('set null');
            
            // Indexes
            $table->index('tenant_unit_id');
            $table->index('rent_invoice_id');
            $table->index('landlord_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenant_payment_submissions');
    }
};
