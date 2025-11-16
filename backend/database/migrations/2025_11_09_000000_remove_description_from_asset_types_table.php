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
        if (! Schema::hasColumn('asset_types', 'description')) {
            return;
        }

        Schema::table('asset_types', function (Blueprint $table) {
            $table->dropColumn('description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('asset_types', 'description')) {
            return;
        }

        Schema::table('asset_types', function (Blueprint $table) {
            $table->string('description', 255)->nullable()->after('category');
        });
    }
};

