# Database Verification Instructions

## Quick Check

Run this command in your terminal:

```bash
cd backend
php fix-units-currency.php
```

This script will:
1. Check if the `units` table exists
2. Check if `currency` column exists
3. Check if `security_deposit_currency` column exists
4. Add any missing columns automatically
5. Show verification results

## Expected Output

If columns exist:
```
✓ 'units' table exists
✓ 'currency' column already exists
✓ 'security_deposit_currency' column already exists

=== Verification ===
✓ currency column: EXISTS
✓ security_deposit_currency column: EXISTS

✅ SUCCESS! Database is now updated with currency columns.
```

If columns are missing:
```
✓ 'units' table exists
Adding 'currency' column...
  ✓ Successfully added 'currency' column
Adding 'security_deposit_currency' column...
  ✓ Successfully added 'security_deposit_currency' column

=== Verification ===
✓ currency column: EXISTS
✓ security_deposit_currency column: EXISTS

✅ SUCCESS! Database is now updated with currency columns.
```

## Manual SQL Check

If you prefer to check manually, run this SQL in your database:

```sql
SHOW COLUMNS FROM `units` LIKE '%currency%';
```

You should see:
- `currency` (VARCHAR(3), NOT NULL, DEFAULT 'MVR')
- `security_deposit_currency` (VARCHAR(3), NULL)

## Manual SQL Fix

If the PHP script doesn't work, run this SQL directly:

```sql
ALTER TABLE `units` 
ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`;

ALTER TABLE `units` 
ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`;
```

## After Fixing

Once the columns are added, try creating a unit again. The error should be resolved.
