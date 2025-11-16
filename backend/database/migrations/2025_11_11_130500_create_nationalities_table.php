<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nationalities', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->foreignId('nationality_id')
                ->nullable()
                ->after('emergency_contact_relationship')
                ->constrained('nationalities')
                ->nullOnDelete();
        });

        $existingNationalities = DB::table('tenants')
            ->select('nationality')
            ->whereNotNull('nationality')
            ->distinct()
            ->pluck('nationality')
            ->map(fn ($value) => trim((string) $value))
            ->filter();

        $map = [];

        foreach ($existingNationalities as $name) {
            $id = DB::table('nationalities')->insertGetId([
                'name' => $name,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $map[$name] = $id;
        }

        foreach ($map as $name => $id) {
            DB::table('tenants')
                ->where('nationality', $name)
                ->update(['nationality_id' => $id]);
        }

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('nationality');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('nationality')->nullable()->after('emergency_contact_relationship');
        });

        $nationalities = DB::table('nationalities')->pluck('name', 'id');

        foreach ($nationalities as $id => $name) {
            DB::table('tenants')
                ->where('nationality_id', $id)
                ->update(['nationality' => $name]);
        }

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropConstrainedForeignId('nationality_id');
        });

        Schema::dropIfExists('nationalities');
    }
};

