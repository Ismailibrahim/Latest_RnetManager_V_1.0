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
        // MySQL/MariaDB: Alter enum to add new value
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('rent_due', 'rent_received', 'maintenance_request', 'lease_expiry', 'security_deposit', 'system', 'user_login') NOT NULL");
        } else {
            // For other databases (PostgreSQL, SQLite), we'll need to handle differently
            // For now, this migration assumes MySQL/MariaDB
            DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('rent_due', 'rent_received', 'maintenance_request', 'lease_expiry', 'security_deposit', 'system', 'user_login') NOT NULL");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove user_login from enum (revert to original)
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('rent_due', 'rent_received', 'maintenance_request', 'lease_expiry', 'security_deposit', 'system') NOT NULL");
        }
    }
};