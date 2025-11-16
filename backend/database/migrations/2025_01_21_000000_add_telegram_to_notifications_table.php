<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
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
        // For MySQL, we need to modify the enum column
        // First, check if we're using MySQL
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE notifications MODIFY COLUMN sent_via ENUM('in_app', 'email', 'sms', 'telegram', 'all') DEFAULT 'in_app'");
        } else {
            // For other databases (like SQLite), we'll need to recreate the column
            Schema::table('notifications', function (Blueprint $table) {
                $table->dropColumn('sent_via');
            });
            
            Schema::table('notifications', function (Blueprint $table) {
                $table->enum('sent_via', ['in_app', 'email', 'sms', 'telegram', 'all'])->default('in_app')->after('expires_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE notifications MODIFY COLUMN sent_via ENUM('in_app', 'email', 'sms', 'all') DEFAULT 'in_app'");
        } else {
            Schema::table('notifications', function (Blueprint $table) {
                $table->dropColumn('sent_via');
            });
            
            Schema::table('notifications', function (Blueprint $table) {
                $table->enum('sent_via', ['in_app', 'email', 'sms', 'all'])->default('in_app')->after('expires_at');
            });
        }
    }
};

