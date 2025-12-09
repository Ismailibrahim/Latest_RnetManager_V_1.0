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
        Schema::create('document_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_id')->nullable()->constrained('landlords')->nullOnDelete();
            $table->enum('type', [
                'rent_invoice',
                'maintenance_invoice',
                'security_deposit_slip',
                'advance_rent_receipt',
                'fee_collection_receipt',
                'security_deposit_refund',
                'other_income_receipt',
                'payment_voucher',
                'unified_payment_entry',
            ]);
            $table->string('name');
            $table->text('template_html');
            $table->json('variables')->nullable(); // Available variables for this template
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index('landlord_id', 'idx_document_templates_landlord');
            $table->index('type', 'idx_document_templates_type');
            $table->index('is_default', 'idx_document_templates_default');
            $table->index(['landlord_id', 'type', 'is_default'], 'idx_document_templates_landlord_type_default');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_templates');
    }
};
