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
        Schema::create('landlords', function (Blueprint $table) {
            $table->id();
            $table->string('company_name');
            $table->enum('subscription_tier', ['basic', 'pro', 'enterprise'])->default('basic');
            $table->rememberToken();
            $table->timestamps();

            $table->index('company_name', 'idx_landlord_company');
            $table->index('subscription_tier', 'idx_landlord_tier');
        });

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('email', 255)->unique();
            $table->string('mobile', 20);
            $table->string('password_hash')->nullable();
            $table->enum('role', ['owner', 'admin', 'manager', 'agent'])->default('owner');
            $table->boolean('is_active')->default(true);
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();

            $table->index('landlord_id', 'idx_user_landlord');
            $table->index('email', 'idx_user_email');
            $table->index('role', 'idx_user_role');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('landlords');
    }
};
