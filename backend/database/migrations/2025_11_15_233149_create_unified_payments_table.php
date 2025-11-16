<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if unified_payments exists as table or view
        if (Schema::hasTable('unified_payments')) {
            return; // Table already exists, skip this migration
        }

        // Also check if it exists as a view (view migration might have run first)
        try {
            $viewExists = DB::select("SELECT COUNT(*) as count FROM information_schema.views WHERE table_schema = DATABASE() AND table_name = 'unified_payments'");
            if (!empty($viewExists) && $viewExists[0]->count > 0) {
                return; // View already exists, skip this migration (view migration will handle it)
            }
        } catch (\Exception $e) {
            // Ignore if can't check for views
        }

        // Drop view if it exists (in case view migration ran first)
        DB::statement('DROP VIEW IF EXISTS `unified_payments`');

        Schema::create('unified_payments', function (Blueprint $table) {
            $table->bigInteger('id')->default(0);
            $table->bigInteger('landlord_id')->default(0);
            $table->bigInteger('tenant_unit_id')->nullable();
            $table->string('payment_type', 19);
            $table->decimal('amount', 12, 2)->default(0.00);
            $table->text('description')->nullable();
            $table->date('transaction_date')->nullable();
            $table->date('due_date')->nullable();
            $table->string('payment_method', 150)->nullable();
            $table->string('reference_number', 150)->nullable();
            $table->string('status', 9);
            $table->string('invoice_number', 100)->nullable();
            $table->bigInteger('unit_id')->nullable();
            $table->string('tenant_name', 255)->nullable();
            $table->string('vendor_name')->nullable();
            $table->string('flow_direction', 8);
            $table->string('currency', 3);
            $table->json('metadata')->nullable();
            $table->string('source_type', 150)->nullable();
            $table->bigInteger('source_id')->nullable();
            $table->string('entry_origin', 6);
            $table->string('composite_id', 44)->nullable();
            $table->timestamp('captured_at')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('unified_payments');
    }
};
