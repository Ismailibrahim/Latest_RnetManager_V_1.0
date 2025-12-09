<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "Running currency migrations...\n\n";

// Add currency to tenant_units
if (!Schema::hasColumn('tenant_units', 'currency')) {
    DB::statement("ALTER TABLE `tenant_units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `monthly_rent`");
    DB::statement("UPDATE tenant_units tu INNER JOIN units u ON tu.unit_id = u.id SET tu.currency = COALESCE(u.currency, 'MVR') WHERE tu.currency = 'MVR'");
    echo "✅ tenant_units.currency added\n";
} else {
    echo "⚠️  tenant_units.currency already exists\n";
}

// Add currency to financial_records
if (!Schema::hasColumn('financial_records', 'currency')) {
    DB::statement("ALTER TABLE `financial_records` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `amount`");
    DB::statement("UPDATE financial_records fr INNER JOIN tenant_units tu ON fr.tenant_unit_id = tu.id SET fr.currency = COALESCE(tu.currency, 'MVR') WHERE fr.tenant_unit_id IS NOT NULL");
    echo "✅ financial_records.currency added\n";
} else {
    echo "⚠️  financial_records.currency already exists\n";
}

echo "\nDone!\n";
