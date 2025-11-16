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
        if (!Schema::hasTable('notifications')) {
            return;
        }
        Schema::table('notifications', function (Blueprint $table) {
            $table->json('metadata')->nullable()->after('action_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn('metadata');
        });
    }
};

