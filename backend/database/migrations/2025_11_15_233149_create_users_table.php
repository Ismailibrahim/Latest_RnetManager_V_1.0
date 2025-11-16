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
        // Check if users table already exists (created by earlier migration)
        if (Schema::hasTable('users')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            // Use unsignedBigInteger for foreign key (compatible with UNSIGNED BIGINT)
            $table->unsignedBigInteger('landlord_id');
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('email', 255);
            $table->string('mobile', 20);
            $table->string('password_hash', 255)->nullable();
            $table->enum('role', ['owner', 'admin', 'manager', 'agent'])->default('owner');
            $table->integer('is_active')->default(1);
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->unique('email', 'users_email_unique');
            $table->index('landlord_id', 'idx_user_landlord');
            $table->index('email', 'idx_user_email');
            $table->index('role', 'idx_user_role');
        });

        // Add foreign key constraint separately if landlords table exists
        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('users', function (Blueprint $table) {
                    $table->foreign('landlord_id')->references('id')->on('landlords')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
