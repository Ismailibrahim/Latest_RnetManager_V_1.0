# 🗄️ Database Configuration Summary

## Primary Database: **MySQL**

This application uses **MySQL** as the primary database for both development and production environments.

### Configuration Details

#### Default Connection
- **Database Type:** MySQL
- **Default Port:** 3306
- **Default Host:** 127.0.0.1
- **Charset:** utf8mb4
- **Collation:** utf8mb4_unicode_ci

#### Environment Configuration
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=rentapp
DB_USERNAME=root
DB_PASSWORD=
```

### Supported Database Systems

The application is configured to support multiple database systems (though MySQL is the default):

1. **MySQL** ✅ (Primary/Default)
   - Driver: `mysql`
   - Port: 3306
   - Used for: Development, Production

2. **MariaDB** ✅ (Compatible)
   - Driver: `mariadb`
   - Port: 3306
   - MySQL-compatible, can be used as drop-in replacement

3. **PostgreSQL** (Available but not configured)
   - Driver: `pgsql`
   - Port: 5432
   - Not currently used

4. **SQL Server** (Available but not configured)
   - Driver: `sqlsrv`
   - Port: 1433
   - Not currently used

5. **SQLite** ✅ (Testing only)
   - Driver: `sqlite`
   - Used for: Unit/Feature tests only
   - File: `backend/database/database.sqlite`

### Database Setup by Environment

#### Development (Local)
- **Database:** MySQL (via Laragon or local MySQL)
- **Default Database Name:** `rentapp`
- **Location:** Local MySQL server
- **Configuration:** `backend/.env`

#### Production
- **Database:** MySQL
- **Default Database Name:** `rentapp_production` (recommended)
- **Location:** VPS MySQL server
- **Configuration:** `backend/.env` (on server)

#### Testing
- **Database:** SQLite
- **File:** `backend/database/database.sqlite`
- **Configuration:** `backend/phpunit.xml`
- **Purpose:** Fast, isolated test database

#### Docker
- **Database:** MySQL 8.0
- **Container:** `rentapp_mysql`
- **Default Database:** `rentapp`
- **Default User:** `rentapp_user`
- **Default Password:** `rentapp_password`
- **Configuration:** `docker-compose.yml`

### Database Schema

The database schema is defined in:
- **SQL Schema:** `database-schema.sql` (reference)
- **Laravel Migrations:** `backend/database/migrations/` (55 migration files)
- **Seeders:** `backend/database/seeders/` (10 seeder files)

### Key Database Features

1. **Character Set:** utf8mb4 (supports full Unicode including emojis)
2. **Foreign Keys:** Enabled
3. **Strict Mode:** Enabled
4. **Transactions:** Supported
5. **Indexes:** Optimized for performance

### Database Tables

The application includes tables for:
- Business entities (landlords, users)
- Property management (properties, units, unit types)
- Tenant management (tenants, tenant_units)
- Financial management (rent_invoices, financial_records, payments)
- Maintenance management (maintenance_requests, maintenance_invoices)
- Asset management (assets, asset_types)
- Notifications and templates
- System settings

### Migration Commands

```bash
# Run migrations
php artisan migrate

# Rollback last migration
php artisan migrate:rollback

# Fresh migration (drops all tables)
php artisan migrate:fresh

# Run seeders
php artisan db:seed
```

### Docker Database Setup

When using Docker Compose:

```bash
# Start database
docker-compose up -d mysql

# Access MySQL CLI
docker-compose exec mysql mysql -u root -p

# Create database manually (if needed)
docker-compose exec mysql mysql -u root -p -e "CREATE DATABASE rentapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Production Database Setup

On your VPS server:

```bash
# Create database
sudo mysql -u root -p
CREATE DATABASE rentapp_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rentapp_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON rentapp_production.* TO 'rentapp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Update .env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=rentapp_production
DB_USERNAME=rentapp_user
DB_PASSWORD=your_secure_password

# Run migrations
cd /var/www/webapp/backend
php artisan migrate --force
```

### Testing Database

For running tests, SQLite is automatically used:

```bash
# Run tests (uses SQLite automatically)
php artisan test

# Or with PHPUnit directly
./vendor/bin/phpunit
```

The test database is configured in `backend/phpunit.xml`:
```xml
<env name="DB_CONNECTION" value="sqlite"/>
<env name="DB_DATABASE" value="database/database.sqlite"/>
```

### Backup Recommendations

1. **Regular Backups:** Set up daily automated backups
2. **Before Migrations:** Always backup before running migrations
3. **Before Deployment:** Backup before each deployment
4. **Storage:** Keep backups in a separate location

### Connection Pooling

For high-traffic production environments, consider:
- MySQL connection pooling
- Read replicas for scaling
- Redis for caching (optional)

### Security Notes

1. **Never commit `.env` files** with database credentials
2. **Use strong passwords** for production databases
3. **Limit database user privileges** (only grant necessary permissions)
4. **Use SSL connections** for remote database access
5. **Regular security updates** for MySQL server

---

## Summary

- **Primary Database:** MySQL 8.0+
- **Development:** MySQL (local)
- **Production:** MySQL (VPS)
- **Testing:** SQLite
- **Docker:** MySQL 8.0 container
- **Default Database Name:** `rentapp` (dev) / `rentapp_production` (prod)

For detailed migration and seeder information, see the individual migration files in `backend/database/migrations/`.

