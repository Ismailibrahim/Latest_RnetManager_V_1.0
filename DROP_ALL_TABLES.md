# 🗑️ Drop All Tables - Commands

## ⚠️ WARNING: This will DELETE ALL DATA!

Multiple methods to drop all tables on your server.

---

## 🚀 Method 1: Laravel Migrate Fresh (Recommended)

This is the easiest and safest method:

```bash
cd /var/www/rent-application
docker compose exec backend php artisan migrate:fresh --force
```

This will:
- Drop all database tables
- Drop all views
- Re-run all migrations from scratch

---

## 🔄 Method 2: Manual SQL Drop

### Step 1: Access MySQL

```bash
docker compose exec mysql mysql -u root -p rent_management
```

### Step 2: Drop All Tables

Run these SQL commands in MySQL:

```sql
-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Get list of all tables and drop them
SELECT CONCAT('DROP TABLE IF EXISTS ', table_name, ';')
FROM information_schema.tables
WHERE table_schema = 'rent_management';

-- Or drop specific tables one by one:
DROP TABLE IF EXISTS migrations;
DROP TABLE IF EXISTS personal_access_tokens;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS sms_templates;
DROP TABLE IF EXISTS email_templates;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS landlords;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS tenant_units;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS unit_types;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS asset_types;
DROP TABLE IF EXISTS maintenance_requests;
DROP TABLE IF EXISTS maintenance_invoices;
DROP TABLE IF EXISTS rent_invoices;
DROP TABLE IF EXISTS financial_records;
DROP TABLE IF EXISTS security_deposit_refunds;
-- Add more tables as needed...

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Exit MySQL
exit;
```

---

## 🔥 Method 3: Drop Entire Database and Recreate

### Step 1: Access MySQL

```bash
docker compose exec mysql mysql -u root -p
```

### Step 2: Drop and Recreate Database

```sql
-- Drop entire database
DROP DATABASE IF EXISTS rent_management;

-- Create new database
CREATE DATABASE rent_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Exit MySQL
exit;
```

### Step 3: Run Migrations

```bash
cd /var/www/rent-application
docker compose exec backend php artisan migrate --force
```

---

## 🛠️ Method 4: Script to Drop All Tables Automatically

Create a script to drop all tables:

```bash
# On your server, create a script
cat > /tmp/drop_all_tables.sh << 'EOF'
#!/bin/bash

DB_NAME="rent_management"
DB_USER="root"
DB_PASS="your_password"

docker compose exec mysql mysql -u $DB_USER -p$DB_PASS $DB_NAME << SQL
SET FOREIGN_KEY_CHECKS = 0;
SET GROUP_CONCAT_MAX_LEN=32768;
SET @tables = NULL;
SELECT GROUP_CONCAT(\`table_name\`) INTO @tables
  FROM information_schema.tables
  WHERE table_schema = '$DB_NAME';
SELECT IFNULL(@tables,'dummy') INTO @tables;

SET @tables = CONCAT('DROP TABLE IF EXISTS ', @tables);
PREPARE stmt FROM @tables;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET FOREIGN_KEY_CHECKS = 1;
SQL

echo "All tables dropped!"
EOF

chmod +x /tmp/drop_all_tables.sh
/tmp/drop_all_tables.sh
```

---

## 📋 Method 5: Using Laravel Tinker

```bash
cd /var/www/rent-application

# Access tinker
docker compose exec backend php artisan tinker
```

Then in tinker:

```php
// Get all table names
$tables = DB::select('SHOW TABLES');
$database = config('database.connections.mysql.database');

// Disable foreign key checks
DB::statement('SET FOREIGN_KEY_CHECKS=0');

// Drop each table
foreach($tables as $table) {
    $tableName = $table->{"Tables_in_$database"};
    Schema::dropIfExists($tableName);
    echo "Dropped: $tableName\n";
}

// Re-enable foreign key checks
DB::statement('SET FOREIGN_KEY_CHECKS=1');

exit;
```

---

## ✅ Recommended: Complete Reset Sequence

```bash
cd /var/www/rent-application

# 1. Drop all tables and re-run migrations
docker compose exec backend php artisan migrate:fresh --force

# 2. Generate app key
docker compose exec backend php artisan key:generate

# 3. Run seeders (if any)
docker compose exec backend php artisan db:seed --force

# 4. Optimize
docker compose exec backend php artisan optimize

# 5. Verify
docker compose exec backend php artisan migrate:status
```

---

## 🔍 Verify Tables Are Dropped

### Check Tables in Database

```bash
docker compose exec mysql mysql -u root -p rent_management -e "SHOW TABLES;"
```

Should return empty (or just show `Tables_in_rent_management` header).

### Check Migration Status

```bash
docker compose exec backend php artisan migrate:status
```

Should show all migrations as "Pending" or empty if migrations table was also dropped.

---

## ⚠️ Important Notes

1. **Data Loss**: All data will be permanently deleted
2. **Backup First**: Backup important data if needed
3. **Foreign Keys**: Use `SET FOREIGN_KEY_CHECKS = 0` if dropping tables manually
4. **Migrations Table**: Dropping this will reset migration tracking
5. **Fixed Files**: Copy all fixed migration files to server before re-running migrations

---

## 🆘 Troubleshooting

### Issue: "Access denied"

**Fix:**
```bash
# Check MySQL credentials
docker compose exec mysql mysql -u root -p
# Or check .env file
cat backend/.env | grep DB_
```

### Issue: "Database doesn't exist"

**Fix:**
```bash
docker compose exec mysql mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS rent_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Issue: "Cannot drop table, foreign key constraint"

**Fix:**
```sql
SET FOREIGN_KEY_CHECKS = 0;
-- Drop tables
SET FOREIGN_KEY_CHECKS = 1;
```

---

**Ready to drop all tables? Use Method 1 (migrate:fresh) - it's the safest!**




