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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->enum('type', ['rent_due', 'rent_received', 'maintenance_request', 'lease_expiry', 'security_deposit', 'system']);
            $table->string('title');
            $table->text('message');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->string('action_url', 500)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->enum('sent_via', ['in_app', 'email', 'sms', 'all'])->default('in_app');
            $table->boolean('is_read')->default(false);
            $table->timestamps();

            $table->index('landlord_id', 'idx_notifications_landlord');
            $table->index('is_read', 'idx_notifications_read');
            $table->index('type', 'idx_notifications_type');
            $table->index('priority', 'idx_notifications_priority');
            $table->index('expires_at', 'idx_notifications_expires');
            $table->index('created_at', 'idx_notifications_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
