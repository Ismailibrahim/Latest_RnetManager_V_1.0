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
        // Check if tenants table already exists (created by earlier migration)
        if (Schema::hasTable('tenants')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('landlord_id');
            $table->string('full_name', 255);
            $table->string('email', 255)->nullable();
            $table->string('phone', 20);
            $table->string('alternate_phone', 20)->nullable();
            $table->string('emergency_contact_name', 255)->nullable();
            $table->string('emergency_contact_phone', 20)->nullable();
            $table->string('emergency_contact_relationship', 255)->nullable();
            $table->unsignedBigInteger('nationality_id')->nullable();
            $table->enum('id_proof_type', ['national_id', 'passport'])->nullable();
            $table->string('id_proof_number', 100)->nullable();
            $table->unsignedBigInteger('id_proof_document_id')->nullable();
            $table->enum('status', ['active', 'inactive', 'former'])->default('active');
            $table->timestamps();
            $table->index('landlord_id', 'idx_tenant_landlord');
            $table->index('status', 'idx_tenant_status');
            $table->index('phone', 'idx_tenant_phone');
            $table->index('email', 'idx_tenant_email');
            $table->index('nationality_id', 'idx_tenants_nationality');
            $table->index('id_proof_document_id', 'idx_tenants_document');
        });

        // Add foreign key constraints separately if referenced tables exist
        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('tenants', function (Blueprint $table) {
                    $table->foreign('landlord_id')->references('id')->on('landlords')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('nationalities')) {
            try {
                Schema::table('tenants', function (Blueprint $table) {
                    $table->foreign('nationality_id')->references('id')->on('nationalities')->onDelete('set null')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('tenant_documents')) {
            try {
                Schema::table('tenants', function (Blueprint $table) {
                    $table->foreign('id_proof_document_id')->references('id')->on('tenant_documents')->onDelete('set null')->onUpdate('no action');
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
        Schema::dropIfExists('tenants');
    }
};
