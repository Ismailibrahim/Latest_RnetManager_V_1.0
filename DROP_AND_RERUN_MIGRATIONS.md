# 🔄 Drop All Migrations and Re-run on Server

## ⚠️ WARNING: This will DELETE ALL DATA!

This guide will help you drop all database tables and re-run all migrations from scratch on your server.

---

## 🚀 Quick Method (Recommended)

### Step 1: Navigate to Project Directory

```bash
cd /var/www/rent-application
```

### Step 2: Drop All Tables and Re-run Migrations

```bash
docker compose exec backend php artisan migrate:fresh --force
```

This command will:
- Drop all database tables
- Drop all views
- Re-run all migrations from scratch

---

## 📋 Complete Steps

### Step 1: Copy Fixed Migration Files (IMPORTANT!)

**Before dropping migrations, make sure all fixed migration files are on the server!**

From your local machine:
```bash
scp -r backend/database/migrations/* user@your-server:/var/www/rent-application/backend/database/migrations/
```

**Or manually copy the fixed files:**
1. `2025_01_21_000000_add_telegram_to_notifications_table.php`
2. `2025_01_22_000000_add_metadata_to_notifications_table.php`
3. `2025_10_19_095721_add_additional_fields_to_users_table.php`
4. `2025_11_03_160429_create_sms_templates_table.php`
5. `2025_11_08_155901_create_personal_access_tokens_table.php`
6. `2025_11_08_160234_create_property_management_tables.php`
7. `2025_11_08_160239_create_tenant_management_tables.php`
8. `2025_11_08_160246_create_financial_management_tables.php`
9. `2025_11_08_160248_create_asset_management_tables.php`
10. `2025_11_08_160253_create_maintenance_management_tables.php`
11. `2025_11_10_000000_create_maintenance_invoices_table.php`
12. `2025_11_16_100002_create_email_templates_table.php`
13. `2025_11_17_120000_create_nationalities_table.php`

---

### Step 2: Drop All Tables and Re-run Migrations

```bash
cd /var/www/rent-application
docker compose exec backend php artisan migrate:fresh --force
```

---

### Step 3: Generate Application Key

```bash
docker compose exec backend php artisan key:generate
```

---

### Step 4: Run Seeders (if you have any)

```bash
docker compose exec backend php artisan db:seed --force
```

---

### Step 5: Optimize Application

```bash
docker compose exec backend php artisan optimize
```

---

### Step 6: Verify Migrations

```bash
docker compose exec backend php artisan migrate:status
```

All migrations should show "Ran" status.

---

## 🔄 Alternative: Manual Database Reset

If `migrate:fresh` doesn't work, you can manually reset the database:

### Step 1: Access MySQL

```bash
docker compose exec mysql mysql -u root -p rent_management
```

### Step 2: Drop and Recreate Database

```sql
DROP DATABASE IF EXISTS rent_management;
CREATE DATABASE rent_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

### Step 3: Run Migrations

```bash
docker compose exec backend php artisan migrate --force
```

---

## ⚠️ Important Notes

1. **Data Loss**: All data will be permanently deleted
2. **Backup First**: Backup important data if needed
3. **Fixed Files**: Make sure all fixed migration files are on server
4. **Services Running**: Ensure Docker containers are running

---

## 🔍 Verify Everything Works

### Check Service Status

```bash
docker compose ps
```

### Check Migration Status

```bash
docker compose exec backend php artisan migrate:status
```

### Test Database Connection

```bash
docker compose exec backend php artisan tinker
# Then in tinker:
DB::connection()->getPdo();
exit;
```

### Check Application Routes

```bash
docker compose exec backend php artisan route:list
```

---

## 🆘 Troubleshooting

### Issue: "Database doesn't exist"

**Fix:**
```bash
docker compose exec mysql mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS rent_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Issue: "Permission denied"

**Fix:**
```bash
cd /var/www/rent-application/backend
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### Issue: Migration still fails

**Fix:** Make sure the fixed migration file is on the server:
```bash
# Check if file exists
ls -la backend/database/migrations/2025_11_08_160253_create_maintenance_management_tables.php

# View file content
cat backend/database/migrations/2025_11_08_160253_create_maintenance_management_tables.php | head -20
```

---

## ✅ Complete Command Sequence

```bash
cd /var/www/rent-application

# Drop all tables and re-run migrations
docker compose exec backend php artisan migrate:fresh --force

# Generate app key
docker compose exec backend php artisan key:generate

# Run seeders (if any)
docker compose exec backend php artisan db:seed --force

# Optimize
docker compose exec backend php artisan optimize

# Verify
docker compose exec backend php artisan migrate:status
```

---

**Ready to proceed? Use the quick method above!**



