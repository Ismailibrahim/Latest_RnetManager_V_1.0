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
        // Add advance rent tracking fields to tenant_units table
        if (Schema::hasTable('tenant_units')) {
            Schema::table('tenant_units', function (Blueprint $table) {
                if (!Schema::hasColumn('tenant_units', 'advance_rent_used')) {
                    $table->decimal('advance_rent_used', 10, 2)->default(0.00)->after('advance_rent_amount');
                }
                if (!Schema::hasColumn('tenant_units', 'advance_rent_collected_date')) {
                    $table->date('advance_rent_collected_date')->nullable()->after('advance_rent_used');
                }
            });
        }

        // Add advance rent fields to rent_invoices table
        if (Schema::hasTable('rent_invoices')) {
            Schema::table('rent_invoices', function (Blueprint $table) {
                if (!Schema::hasColumn('rent_invoices', 'advance_rent_applied')) {
                    $table->decimal('advance_rent_applied', 10, 2)->default(0.00)->after('late_fee');
                }
                if (!Schema::hasColumn('rent_invoices', 'is_advance_covered')) {
                    $table->boolean('is_advance_covered')->default(false)->after('advance_rent_applied');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('tenant_units')) {
            Schema::table('tenant_units', function (Blueprint $table) {
                if (Schema::hasColumn('tenant_units', 'advance_rent_used')) {
                    $table->dropColumn('advance_rent_used');
                }
                if (Schema::hasColumn('tenant_units', 'advance_rent_collected_date')) {
                    $table->dropColumn('advance_rent_collected_date');
                }
            });
        }

        if (Schema::hasTable('rent_invoices')) {
            Schema::table('rent_invoices', function (Blueprint $table) {
                if (Schema::hasColumn('rent_invoices', 'advance_rent_applied')) {
                    $table->dropColumn('advance_rent_applied');
                }
                if (Schema::hasColumn('rent_invoices', 'is_advance_covered')) {
                    $table->dropColumn('is_advance_covered');
                }
            });
        }
    }
};

