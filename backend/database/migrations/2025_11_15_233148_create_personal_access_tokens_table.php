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
        // Check if personal_access_tokens table already exists (created by earlier migration)
        if (Schema::hasTable('personal_access_tokens')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('tokenable_type', 255);
            // Use unsignedBigInteger for tokenable_id (compatible with UNSIGNED BIGINT)
            $table->unsignedBigInteger('tokenable_id');
            $table->text('name');
            $table->string('token', 64);
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->unique('token', 'personal_access_tokens_token_unique');
            // Composite index on both tokenable_type and tokenable_id (Laravel standard)
            $table->index(['tokenable_type', 'tokenable_id'], 'personal_access_tokens_tokenable_type_tokenable_id_index');
            $table->index('expires_at', 'personal_access_tokens_expires_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
