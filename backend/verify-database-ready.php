<?php

/**
 * Database Verification Script
 * 
 * This script verifies that your database is ready for the multi-tenant implementation.
 * Run this before deploying to production.
 * 
 * Usage: php verify-database-ready.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "🔍 Verifying Database Readiness for Multi-Tenant Implementation\n";
echo str_repeat("=", 60) . "\n\n";

$errors = [];
$warnings = [];
$success = [];

// Tables that must have landlord_id
$requiredTables = [
    'properties',
    'units',
    'tenants',
    'tenant_units',
    'financial_records',
    'maintenance_requests',
    'maintenance_invoices',
    'rent_invoices',
];

// Check if tables exist and have landlord_id column
foreach ($requiredTables as $table) {
    if (!Schema::hasTable($table)) {
        $errors[] = "❌ Table '{$table}' does not exist";
        continue;
    }

    if (!Schema::hasColumn($table, 'landlord_id')) {
        $errors[] = "❌ Table '{$table}' is missing 'landlord_id' column";
        continue;
    }

    $nullCount = DB::table($table)->whereNull('landlord_id')->count();
    if ($nullCount > 0) {
        $warnings[] = "⚠️  Table '{$table}' has {$nullCount} records with NULL landlord_id";
    } else {
        $success[] = "✅ Table '{$table}' has landlord_id column and no NULL values";
    }
}

// Check assets table (filtered through units)
if (Schema::hasTable('assets')) {
    if (!Schema::hasColumn('assets', 'unit_id')) {
        $errors[] = "❌ Table 'assets' is missing 'unit_id' column (needed for landlord filtering)";
    } else {
        $success[] = "✅ Table 'assets' has unit_id column";
    }
}

// Check unit_occupancy_history table
if (Schema::hasTable('unit_occupancy_history')) {
    if (!Schema::hasColumn('unit_occupancy_history', 'unit_id')) {
        $errors[] = "❌ Table 'unit_occupancy_history' is missing 'unit_id' column";
    } else {
        $success[] = "✅ Table 'unit_occupancy_history' has unit_id column";
    }
}

// Check users table has landlord_id
if (Schema::hasTable('users')) {
    if (!Schema::hasColumn('users', 'landlord_id')) {
        $errors[] = "❌ Table 'users' is missing 'landlord_id' column";
    } else {
        $usersWithoutLandlord = DB::table('users')->whereNull('landlord_id')->count();
        if ($usersWithoutLandlord > 0) {
            $warnings[] = "⚠️  Table 'users' has {$usersWithoutLandlord} users without landlord_id";
        } else {
            $success[] = "✅ Table 'users' has landlord_id column";
        }
    }
}

// Display results
echo "✅ SUCCESS:\n";
foreach ($success as $msg) {
    echo "   {$msg}\n";
}

if (!empty($warnings)) {
    echo "\n⚠️  WARNINGS:\n";
    foreach ($warnings as $msg) {
        echo "   {$msg}\n";
    }
}

if (!empty($errors)) {
    echo "\n❌ ERRORS (Must fix before deployment):\n";
    foreach ($errors as $msg) {
        echo "   {$msg}\n";
    }
    echo "\n";
    exit(1);
}

echo "\n" . str_repeat("=", 60) . "\n";
echo "✅ Database is ready for multi-tenant implementation!\n";
echo "\nNext steps:\n";
echo "1. Backup your database\n";
echo "2. Deploy the code changes\n";
echo "3. Clear caches: php artisan config:clear && php artisan route:clear\n";
echo "4. Test with multiple landlord accounts\n";
echo "\n";

exit(0);

