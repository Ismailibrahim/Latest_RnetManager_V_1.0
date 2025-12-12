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
        if (Schema::hasTable('help_content')) {
            return; // Table already exists
        }

        Schema::create('help_content', function (Blueprint $table) {
            $table->id();
            $table->string('page_route', 255)->unique()->comment('Page route identifier (e.g., /tenants, /properties)');
            $table->string('title', 255)->comment('Help content title');
            $table->json('content_json')->comment('Structured help content (quickGuide, faqs, featureHighlights, relatedPages)');
            $table->timestamps();

            // Index for faster lookups by page route
            $table->index('page_route');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('help_content');
    }
};
