<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('emergency_contact_relationship')
                ->nullable()
                ->after('emergency_contact_phone');
            $table->string('nationality')
                ->nullable()
                ->after('emergency_contact_relationship');
        });

        DB::table('tenants')
            ->whereIn('id_proof_type', ['pan', 'driving_license'])
            ->update(['id_proof_type' => 'other']);
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'emergency_contact_relationship',
                'nationality',
            ]);
        });
    }
};

