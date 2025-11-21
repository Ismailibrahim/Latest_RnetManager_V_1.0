<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('landlords', function (Blueprint $table) {
            $table->string('company_name')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('landlords', function (Blueprint $table) {
            // Set a default value for existing null records before making it non-nullable
            DB::statement("UPDATE landlords SET company_name = 'Individual Owner' WHERE company_name IS NULL");
            $table->string('company_name')->nullable(false)->change();
        });
    }
};

