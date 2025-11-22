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
        Schema::table('maintenance_invoices', function (Blueprint $table) {
            // Drop the old unique constraint on invoice_number alone
            $table->dropUnique('maintenance_invoices_invoice_number_unique');
            
            // Add composite unique constraint: invoice_number + landlord_id
            // This allows the same invoice number for different landlords,
            // but ensures uniqueness per landlord
            $table->unique(['invoice_number', 'landlord_id'], 'maintenance_invoices_invoice_number_landlord_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('maintenance_invoices', function (Blueprint $table) {
            // Drop the composite unique constraint
            $table->dropUnique('maintenance_invoices_invoice_number_landlord_unique');
            
            // Restore the old unique constraint (though this might cause issues if multiple landlords exist)
            $table->unique('invoice_number', 'maintenance_invoices_invoice_number_unique');
        });
    }
};
