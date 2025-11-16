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
        // Check if sms_templates table already exists (created by earlier migration)
        if (Schema::hasTable('sms_templates')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('sms_templates', function (Blueprint $table) {
            $table->id();
            // Use unsignedBigInteger for foreign key (compatible with UNSIGNED BIGINT)
            $table->unsignedBigInteger('landlord_id');
            $table->string('name', 255);
            $table->enum('type', ['rent_due', 'rent_received', 'maintenance_request', 'lease_expiry', 'security_deposit', 'system'])->nullable();
            $table->text('message');
            $table->json('variables')->nullable();
            $table->integer('is_default')->default(0);
            $table->timestamps();
            $table->index('landlord_id', 'idx_sms_templates_landlord');
            $table->index('type', 'idx_sms_templates_type');
            $table->index('is_default', 'idx_sms_templates_default');
        });

        // Add foreign key constraint separately if landlords table exists
        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('sms_templates', function (Blueprint $table) {
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
        Schema::dropIfExists('sms_templates');
    }
};
