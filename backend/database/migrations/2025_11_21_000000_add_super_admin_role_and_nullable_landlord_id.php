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
        // Modify the role enum to include 'super_admin'
        // MySQL requires dropping and recreating the column
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                // Drop foreign key constraint if it exists
                $table->dropForeign(['landlord_id']);
            });

            // Modify the landlord_id to be nullable
            Schema::table('users', function (Blueprint $table) {
                $table->unsignedBigInteger('landlord_id')->nullable()->change();
            });

            // Modify the role enum - MySQL specific approach
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('owner', 'admin', 'manager', 'agent', 'super_admin') DEFAULT 'owner'");

            // Re-add foreign key constraint (nullable now)
            Schema::table('users', function (Blueprint $table) {
                $table->foreign('landlord_id')
                    ->references('id')
                    ->on('landlords')
                    ->onDelete('cascade')
                    ->onUpdate('no action');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('users')) {
            // Revert role enum
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['landlord_id']);
            });

            // Remove super_admin role - set any super_admin users to admin
            DB::statement("UPDATE users SET role = 'admin' WHERE role = 'super_admin'");

            // Revert role enum
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('owner', 'admin', 'manager', 'agent') DEFAULT 'owner'");

            // Make landlord_id required again - set null values to a default (you may need to adjust this)
            // Note: This could fail if there are super_admin users with null landlord_id
            DB::statement("UPDATE users SET landlord_id = (SELECT id FROM landlords LIMIT 1) WHERE landlord_id IS NULL");

            Schema::table('users', function (Blueprint $table) {
                $table->unsignedBigInteger('landlord_id')->nullable(false)->change();
            });

            // Re-add foreign key constraint
            Schema::table('users', function (Blueprint $table) {
                $table->foreign('landlord_id')
                    ->references('id')
                    ->on('landlords')
                    ->onDelete('cascade')
                    ->onUpdate('no action');
            });
        }
    }
};

