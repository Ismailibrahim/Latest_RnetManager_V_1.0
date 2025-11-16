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
        // Check if notifications table already exists (created by earlier migration)
        if (Schema::hasTable('notifications')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            // Use unsignedBigInteger for foreign key (compatible with UNSIGNED BIGINT)
            $table->unsignedBigInteger('landlord_id');
            $table->enum('type', ['rent_due', 'rent_received', 'maintenance_request', 'lease_expiry', 'security_deposit', 'system']);
            $table->string('title', 255);
            $table->text('message');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->text('action_url')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->enum('sent_via', ['in_app', 'email', 'sms', 'all'])->default('in_app');
            $table->integer('is_read')->default(0);
            $table->timestamps();
            $table->index('landlord_id', 'idx_notifications_landlord');
            $table->index('is_read', 'idx_notifications_read');
            $table->index('type', 'idx_notifications_type');
            $table->index('priority', 'idx_notifications_priority');
            $table->index('expires_at', 'idx_notifications_expires');
            $table->index('created_at', 'idx_notifications_created');
        });

        // Add foreign key constraint separately if landlords table exists
        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('notifications', function (Blueprint $table) {
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
        Schema::dropIfExists('notifications');
    }
};
