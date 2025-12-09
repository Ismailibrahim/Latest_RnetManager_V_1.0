<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        // Check if columns already exist
        if (Schema::hasColumn('users', 'approval_status')) {
            return; // Migration already run
        }

        try {
            // Add all columns in one go
            Schema::table('users', function (Blueprint $table) {
                $table->enum('approval_status', ['pending', 'approved', 'rejected'])
                    ->default('pending')
                    ->after('is_active');
                
                $table->timestamp('approved_at')->nullable()->after('approval_status');
                $table->unsignedBigInteger('approved_by')->nullable()->after('approved_at');
                $table->timestamp('rejected_at')->nullable()->after('approved_by');
                $table->text('rejected_reason')->nullable()->after('rejected_at');
            });

            // Add index for approval_status for faster queries
            if (!DB::select("SHOW INDEX FROM users WHERE Key_name = 'idx_user_approval_status'")) {
                Schema::table('users', function (Blueprint $table) {
                    $table->index('approval_status', 'idx_user_approval_status');
                });
            }

            // Add foreign key for approved_by (only if column exists and foreign key doesn't)
            if (Schema::hasColumn('users', 'approved_by')) {
                $foreignKeys = DB::select("
                    SELECT CONSTRAINT_NAME 
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'users' 
                    AND COLUMN_NAME = 'approved_by' 
                    AND REFERENCED_TABLE_NAME IS NOT NULL
                ");
                
                if (empty($foreignKeys)) {
                    Schema::table('users', function (Blueprint $table) {
                        $table->foreign('approved_by')
                            ->references('id')
                            ->on('users')
                            ->onDelete('set null')
                            ->onUpdate('no action');
                    });
                }
            }

            // Set default approval_status for existing users
            DB::table('users')
                ->whereNull('approval_status')
                ->update(['approval_status' => 'approved']);

        } catch (\Exception $e) {
            // Log error but don't fail migration
            \Illuminate\Support\Facades\Log::error('Migration error adding approval_status', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
      /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                // Drop foreign key first
                if (Schema::hasColumn('users', 'approved_by')) {
                    $table->dropForeign(['approved_by']);
                }
                
                // Drop index
                if (DB::select("SHOW INDEX FROM users WHERE Key_name = 'idx_user_approval_status'")) {
                    $table->dropIndex('idx_user_approval_status');
                }
                
                // Drop columns
                $table->dropColumn([
                    'approval_status',
                    'approved_at',
                    'approved_by',
                    'rejected_at',
                    'rejected_reason',
                ]);
            });
        }
    }
};