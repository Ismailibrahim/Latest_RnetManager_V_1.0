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
        Schema::table('landlords', function (Blueprint $table) {
            $table->date('subscription_started_at')->nullable()->after('subscription_tier');
            $table->date('subscription_expires_at')->nullable()->after('subscription_started_at');
            $table->enum('subscription_status', ['active', 'expired', 'suspended', 'cancelled'])->default('active')->after('subscription_expires_at');
            $table->boolean('subscription_auto_renew')->default(false)->after('subscription_status');
            
            $table->index('subscription_status', 'idx_landlord_subscription_status');
            $table->index('subscription_expires_at', 'idx_landlord_subscription_expires');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('landlords', function (Blueprint $table) {
            $table->dropIndex('idx_landlord_subscription_status');
            $table->dropIndex('idx_landlord_subscription_expires');
            $table->dropColumn([
                'subscription_started_at',
                'subscription_expires_at',
                'subscription_status',
                'subscription_auto_renew',
            ]);
        });
    }
};

