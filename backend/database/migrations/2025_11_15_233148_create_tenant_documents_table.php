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
        // Check if tenant_documents table already exists
        if (Schema::hasTable('tenant_documents')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('tenant_documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('landlord_id');
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->string('category', 255)->default('general');
            $table->string('title', 255);
            $table->string('disk', 255)->default('public');
            $table->string('path', 255);
            $table->string('original_name', 255);
            $table->string('mime_type', 255)->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->text('description')->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index('landlord_id', 'idx_tenant_documents_landlord');
            $table->index('uploaded_by', 'idx_tenant_documents_uploaded_by');
            $table->index(['tenant_id', 'category'], 'idx_tenant_documents_tenant_category');
        });

        // Add foreign key constraints separately if referenced tables exist
        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('tenant_documents', function (Blueprint $table) {
                    $table->foreign('landlord_id')->references('id')->on('landlords')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('tenants')) {
            try {
                Schema::table('tenant_documents', function (Blueprint $table) {
                    $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('users')) {
            try {
                Schema::table('tenant_documents', function (Blueprint $table) {
                    $table->foreign('uploaded_by')->references('id')->on('users')->onDelete('set null')->onUpdate('no action');
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
        Schema::dropIfExists('tenant_documents');
    }
};
