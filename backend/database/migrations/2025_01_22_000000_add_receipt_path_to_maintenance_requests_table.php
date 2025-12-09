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
        // Check if table exists before trying to modify it
        if (!Schema::hasTable('maintenance_requests')) {
            // Table doesn't exist yet, skip this migration
            // The column will be added when the table is created by a later migration
            return;
        }

        // Check if column already exists
        if (Schema::hasColumn('maintenance_requests', 'receipt_path')) {
            return;
        }

        Schema::table('maintenance_requests', function (Blueprint $table) {
            $table->string('receipt_path', 500)->nullable()->after('invoice_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('maintenance_requests', function (Blueprint $table) {
            $table->dropColumn('receipt_path');
        });
    }
};
