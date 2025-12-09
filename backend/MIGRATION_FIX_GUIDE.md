# Migration Guide - Using PowerShell Scripts

## ⚡ Quick Reference (START HERE)

**For ALL future migrations, use this command:**
```powershell
# From backend directory
.\run-migration.ps1 migration_file_name.php
```

**To run all pending migrations:**
```powershell
.\run-migration.ps1
```

**That's it!** The script automatically finds PHP and runs your migration.

---

## Overview
This guide explains how to run Laravel migrations using PowerShell scripts, which automatically find PHP even if it's not in your PATH.

## Quick Start

### Running Migrations (Recommended Method)

**From the backend directory, use PowerShell scripts:**

1. **Run all pending migrations:**
   ```powershell
   .\run-migration.ps1
   ```

2. **Run a specific migration:**
   ```powershell
   .\run-migration.ps1 2025_01_21_000000_add_currency_fields_to_units_table.php
   ```

3. **Fix currency columns (if needed):**
   ```powershell
   .\fix-currency.ps1
   ```

The scripts will:
- Automatically find PHP (checks common installation paths)
- Run the migration using Laravel's artisan
- Show clear success/error messages
- Work even if PHP is not in your PATH

## Available Scripts

### 1. `run-migration.ps1` - General Migration Runner
**Usage:**
```powershell
# Run all pending migrations
.\run-migration.ps1

# Run specific migration
.\run-migration.ps1 migration_file_name.php
```

**Examples:**
```powershell
# Run all migrations
.\run-migration.ps1

# Run specific migration
.\run-migration.ps1 2025_01_21_000000_add_currency_fields_to_units_table.php
```

### 2. `fix-currency.ps1` - Fix Currency Columns
**Usage:**
```powershell
.\fix-currency.ps1
```

This script:
- Adds missing currency columns to units table
- Records the migration properly
- Verifies everything is correct

## Alternative Methods (If Scripts Don't Work)

### Option 1: Use Artisan Command Directly
If you have PHP in PATH:
```powershell
php artisan migrate
php artisan migrate --path=database/migrations/migration_file.php
php artisan fix:currency-columns
```

### Option 2: Use Full PHP Path
If PHP is not in PATH, use full path:
```powershell
C:\php\php.exe artisan migrate
C:\xampp\php\php.exe artisan migrate
C:\laragon\bin\php\php8.2.0\php.exe artisan migrate
```

### Option 3: Use Artisan Tinker
```powershell
php artisan tinker
```
Then run SQL commands directly.

### Option 4: Direct SQL (Last Resort)
Connect to MySQL and run SQL directly:
```sql
ALTER TABLE `units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`;
ALTER TABLE `units` ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`;
```

## Verification

### Check Migration Status:
```powershell
.\run-migration.ps1
# Or
php artisan migrate:status
```

### Verify Columns Exist:
```powershell
php artisan tinker
```
Then:
```php
use Illuminate\Support\Facades\Schema;
echo Schema::hasColumn('units', 'currency') ? 'Currency: EXISTS' : 'Currency: MISSING';
echo "\n";
echo Schema::hasColumn('units', 'security_deposit_currency') ? 'Security Deposit Currency: EXISTS' : 'Security Deposit Currency: MISSING';
```

## For Future Migrations

### Running New Migrations

**Always use the PowerShell script:**
```powershell
# From backend directory
.\run-migration.ps1 migration_file_name.php
```

**Or run all pending:**
```powershell
.\run-migration.ps1
```

### Best Practices for Writing Migrations:

1. **Always check if columns exist** before adding:
   ```php
   if (!Schema::hasColumn('table_name', 'column_name')) {
       // Add column
   }
   ```

2. **Use try-catch for duplicate errors**:
   ```php
   try {
       DB::statement("ALTER TABLE ...");
   } catch (\Exception $e) {
       if (strpos($e->getMessage(), 'Duplicate column name') === false) {
           throw $e;
       }
   }
   ```

3. **Make migrations idempotent** - they should be safe to run multiple times

4. **Test migrations** before deploying:
   ```powershell
   .\run-migration.ps1 migration_file.php
   # Check for errors
   ```

5. **Use the improved migration pattern** (see example below)

### Example: Improved Migration Pattern

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('table_name')) {
            return;
        }

        // Check and add column with error handling
        if (!Schema::hasColumn('table_name', 'new_column')) {
            try {
                DB::statement("ALTER TABLE `table_name` ADD COLUMN `new_column` VARCHAR(255) NULL AFTER `existing_column`");
            } catch (\Exception $e) {
                if (strpos($e->getMessage(), 'Duplicate column name') === false) {
                    throw $e;
                }
            }
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('table_name')) {
            return;
        }

        Schema::table('table_name', function (Blueprint $table) {
            if (Schema::hasColumn('table_name', 'new_column')) {
                $table->dropColumn('new_column');
            }
        });
    }
};
```

## Files Created/Modified

1. `database/migrations/2025_01_21_000000_add_currency_fields_to_units_table.php` - Improved migration
2. `run-migration.ps1` - **Main migration runner script (USE THIS FOR FUTURE MIGRATIONS)**
3. `fix-currency.ps1` - Fix script for currency columns
4. `app/Console/Commands/FixCurrencyColumns.php` - Artisan command for currency fix
5. `MIGRATION_FIX_GUIDE.md` - This guide

## Quick Reference

### Daily Use:
```powershell
# Run all pending migrations
.\run-migration.ps1

# Run specific migration
.\run-migration.ps1 migration_file.php

# Check migration status
php artisan migrate:status
```

### Troubleshooting:
```powershell
# Fix currency columns (if needed)
.\fix-currency.ps1

# Verify columns exist
php artisan tinker
# Then: Schema::hasColumn('table_name', 'column_name')
```

## Troubleshooting

If migrations still don't work:
1. Check database connection in `.env`
2. Verify migrations table exists: `SHOW TABLES LIKE 'migrations'`
3. Check if migration is recorded: `SELECT * FROM migrations WHERE migration LIKE '%currency%'`
4. Manually add columns if needed (see SQL below)

## Manual SQL (Last Resort)

If all else fails, run this SQL directly:
```sql
ALTER TABLE `units` 
ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`;

ALTER TABLE `units` 
ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`;

-- Then record the migration
INSERT INTO migrations (migration, batch) 
VALUES ('2025_01_21_000000_add_currency_fields_to_units_table', 
        (SELECT COALESCE(MAX(batch), 0) + 1 FROM migrations AS m));
```
