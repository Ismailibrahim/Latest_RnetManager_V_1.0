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
        Schema::create('maintenance_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->text('description');
            $table->decimal('cost', 10, 2);
            $table->foreignId('asset_id')->nullable()->constrained('assets')->nullOnDelete();
            $table->string('location', 100)->nullable();
            $table->string('serviced_by', 255)->nullable();
            $table->string('invoice_number', 100)->nullable();
            $table->boolean('is_billable')->default(true);
            $table->boolean('billed_to_tenant')->default(false);
            $table->decimal('tenant_share', 10, 2)->default(0);
            $table->enum('type', ['repair', 'replacement', 'service'])->default('repair');
            $table->date('maintenance_date');
            $table->timestamp('created_at')->useCurrent();

            $table->index('unit_id', 'idx_maintenance_unit');
            $table->index('maintenance_date', 'idx_maintenance_date');
            $table->index('type', 'idx_maintenance_type');
            $table->index('serviced_by', 'idx_maintenance_vendor');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_requests');
    }
};
