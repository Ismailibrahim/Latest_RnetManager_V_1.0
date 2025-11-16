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
        Schema::create('sms_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->string('name');
            $table->enum('type', ['rent_due', 'rent_received', 'maintenance_request', 'lease_expiry', 'security_deposit', 'system'])->nullable();
            $table->text('message'); // SMS message (text only, no HTML)
            $table->json('variables')->nullable(); // Available variables for this template
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index('landlord_id', 'idx_sms_templates_landlord');
            $table->index('type', 'idx_sms_templates_type');
            $table->index('is_default', 'idx_sms_templates_default');
            $table->index(['landlord_id', 'type', 'is_default'], 'idx_sms_templates_landlord_type_default');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sms_templates');
    }
};

