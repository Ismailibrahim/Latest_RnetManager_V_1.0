# Migration Fix - maintenance_requests Table

## Issue

During deployment, migration `2025_01_22_000000_add_receipt_path_to_maintenance_requests_table.php` fails because it tries to add a column to `maintenance_requests` table before the table is created.

## Root Cause

The migration file has an earlier date (`2025_01_22`) than the migration that creates the table (`2025_11_08`), so Laravel tries to run it first.

## Solution Applied

Updated the migration to check if the table exists before trying to modify it:

```php
public function up(): void
{
    // Check if table exists before trying to modify it
    if (!Schema::hasTable('maintenance_requests')) {
        // Table doesn't exist yet, skip this migration
        return;
    }

    // Check if column already exists
    if (Schema::hasColumn('maintenance_requests', 'receipt_path')) {
        return;
    }

    Schema::table('maintenance_requests', function (Blueprint $table) {
        $table->string('receipt_path', 500)->nullable()->after('invoice_number');
    });
}
```

## How to Fix on Server

**Option 1: Pull the updated migration (Recommended)**

```bash
cd /var/www/rentapplicaiton
git pull origin main
cd backend
php artisan migrate --force
```

**Option 2: Manual Fix**

```bash
cd /var/www/rentapplicaiton/backend
nano database/migrations/2025_01_22_000000_add_receipt_path_to_maintenance_requests_table.php
```

Update the `up()` method to include the table existence check (see solution above).

Then run:
```bash
php artisan migrate --force
```

## Verification

After fixing, verify the migration ran successfully:

```bash
php artisan migrate:status
```

You should see `2025_01_22_000000_add_receipt_path_to_maintenance_requests_table` marked as completed.

## Next Steps

1. Fix the migration file (pull latest or manual edit)
2. Run migrations again: `php artisan migrate --force`
3. Continue with deployment guide

