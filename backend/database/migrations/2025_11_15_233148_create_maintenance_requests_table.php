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
        // Check if maintenance_requests table already exists (created by earlier migration)
        if (Schema::hasTable('maintenance_requests')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('maintenance_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('unit_id');
            $table->unsignedBigInteger('landlord_id');
            $table->text('description');
            $table->decimal('cost', 10, 2);
            $table->unsignedBigInteger('asset_id')->nullable();
            $table->string('location', 100)->nullable();
            $table->string('serviced_by', 255)->nullable();
            $table->string('invoice_number', 100)->nullable();
            $table->integer('is_billable')->default(1);
            $table->integer('billed_to_tenant')->default(0);
            $table->decimal('tenant_share', 10, 2)->default(0.00);
            $table->enum('type', ['repair', 'replacement', 'service'])->default('repair');
            $table->date('maintenance_date');
            $table->timestamps();
            $table->index('landlord_id', 'idx_maintenance_requests_landlord');
            $table->index('asset_id', 'idx_maintenance_requests_asset');
            $table->index('unit_id', 'idx_maintenance_unit');
            $table->index('maintenance_date', 'idx_maintenance_date');
            $table->index('type', 'idx_maintenance_type');
            $table->index('serviced_by', 'idx_maintenance_vendor');
        });

        // Add foreign key constraints separately if referenced tables exist
        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('maintenance_requests', function (Blueprint $table) {
                    $table->foreign('landlord_id')->references('id')->on('landlords')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('units')) {
            try {
                Schema::table('maintenance_requests', function (Blueprint $table) {
                    $table->foreign('unit_id')->references('id')->on('units')->onDelete('cascade')->onUpdate('no action');
                });
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
            }
        }

        if (Schema::hasTable('assets')) {
            try {
                Schema::table('maintenance_requests', function (Blueprint $table) {
                    $table->foreign('asset_id')->references('id')->on('assets')->onDelete('set null')->onUpdate('no action');
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
        Schema::dropIfExists('maintenance_requests');
    }
};
