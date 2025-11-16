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
        // Check if subscription_invoices table already exists
        if (Schema::hasTable('subscription_invoices')) {
            return; // Table already exists, skip this migration
        }

        Schema::create('subscription_invoices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('landlord_id');
            $table->string('invoice_number', 255);
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->dateTime('issued_at');
            $table->dateTime('due_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->enum('status', ['paid', 'pending', 'overdue', 'void'])->default('pending');
            $table->string('download_url', 255)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->unique('invoice_number', 'subscription_invoices_invoice_number_unique');
            $table->index('landlord_id', 'idx_subscription_invoices_landlord');
            $table->index('issued_at', 'idx_subscription_invoices_issued');
            $table->index('status', 'idx_subscription_invoices_status');
        });

        // Add foreign key constraint separately if landlords table exists
        if (Schema::hasTable('landlords')) {
            try {
                Schema::table('subscription_invoices', function (Blueprint $table) {
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
        Schema::dropIfExists('subscription_invoices');
    }
};
