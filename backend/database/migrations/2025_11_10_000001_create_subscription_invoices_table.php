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
        Schema::create('subscription_invoices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('landlord_id')->constrained()->cascadeOnDelete();
            $table->string('invoice_number')->unique();
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->dateTime('issued_at');
            $table->dateTime('due_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->enum('status', ['paid', 'pending', 'overdue', 'void'])->default('pending');
            $table->string('download_url')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['landlord_id', 'issued_at']);
            $table->index(['landlord_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_invoices');
    }
};


