# Laragon Troubleshooting Guide

## Common Issues When Laravel Backend Stops in Laragon

### 1. Check if Services Are Running

**In Laragon:**
- Open Laragon
- Check if Apache/Nginx is running (green indicator)
- Check if MySQL is running (green indicator)
- Check if PHP is properly configured

**Quick Check:**
- Click "Start All" in Laragon
- Check the status indicators (should be green)

### 2. Check Laravel Logs

**Location:** `backend/storage/logs/laravel.log`

**Common Errors:**
- Database connection errors
- Missing migrations
- Memory limit exceeded
- Syntax errors

**View recent errors:**
```bash
cd backend
tail -n 50 storage/logs/laravel.log
```

### 3. Check PHP Error Logs

**Laragon PHP Error Log Location:**
- Usually: `C:\laragon\bin\php\php-8.x\logs\php_errors.log`
- Or check Laragon menu → PHP → Error Log

### 4. Check Apache/Nginx Error Logs

**Apache:**
- `C:\laragon\bin\apache\apache-2.x\logs\error.log`

**Nginx:**
- `C:\laragon\bin\nginx\nginx-1.x\logs\error.log`

### 5. Common Fixes

#### Fix 1: Restart All Services
1. In Laragon, click "Stop All"
2. Wait 5 seconds
3. Click "Start All"
4. Check if services start successfully

#### Fix 2: Clear Laravel Cache
```bash
cd backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

#### Fix 3: Check Database Connection
1. Open Laragon → Database → HeidiSQL (or phpMyAdmin)
2. Verify database exists
3. Check `.env` file has correct database credentials:
   ```
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=rentapp
   DB_USERNAME=root
   DB_PASSWORD=
   ```

#### Fix 4: Run Migrations
```bash
cd backend
php artisan migrate
```

#### Fix 5: Check PHP Memory Limit
1. Open `C:\laragon\bin\php\php-8.x\php.ini`
2. Find `memory_limit`
3. Set to at least `256M` or `512M`:
   ```ini
   memory_limit = 512M
   ```
4. Restart Apache/Nginx in Laragon

#### Fix 6: Check Port Conflicts
- Laravel default: `http://localhost:8000` or `http://rentapp.test`
- If port 8000 is in use:
  ```bash
  cd backend
  php artisan serve --port=8001
  ```

#### Fix 7: Check File Permissions
- Ensure `storage/` and `bootstrap/cache/` are writable
- Windows usually handles this automatically, but check if files exist

### 6. Check for Syntax Errors

**Test PHP syntax:**
```bash
cd backend
php -l app/Http/Controllers/Api/V1/MaintenanceRequestController.php
```

**Check all PHP files:**
```bash
cd backend
php artisan route:list
```

### 7. Check Composer Dependencies

```bash
cd backend
composer install
composer dump-autoload
```

### 8. Check Environment File

**Verify `.env` exists:**
```bash
cd backend
# Should exist: .env
# If not, copy from .env.example
copy .env.example .env
php artisan key:generate
```

### 9. Laragon-Specific Issues

#### Issue: Services won't start
- **Solution:** Check if ports 80, 443, 3306 are in use
- **Check:** Laragon → Menu → Tools → Check Ports

#### Issue: Virtual host not working
- **Solution:** Recreate virtual host
- **Steps:** Laragon → Menu → Sites → Add Site

#### Issue: PHP version mismatch
- **Solution:** Use correct PHP version
- **Check:** Laragon → Menu → PHP → Version

### 10. Debug Mode

**Enable detailed error reporting in `.env`:**
```env
APP_DEBUG=true
APP_ENV=local
LOG_LEVEL=debug
```

**Then check logs:**
```bash
cd backend
tail -f storage/logs/laravel.log
```

### 11. Quick Health Check Script

Create `backend/check-health.php`:
```php
<?php
echo "PHP Version: " . phpversion() . "\n";
echo "Memory Limit: " . ini_get('memory_limit') . "\n";
echo "Database Connection: ";
try {
    require __DIR__ . '/vendor/autoload.php';
    $app = require_once __DIR__ . '/bootstrap/app.php';
    $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
    $db = DB::connection()->getPdo();
    echo "OK\n";
} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}
```

Run it:
```bash
cd backend
php check-health.php
```

### 12. Restart Laragon Completely

1. Close Laragon completely
2. Open Task Manager
3. End any `httpd.exe`, `nginx.exe`, `mysqld.exe` processes
4. Restart Laragon as Administrator
5. Click "Start All"

### 13. Check Windows Event Viewer

1. Open Event Viewer
2. Windows Logs → Application
3. Look for PHP/Apache/MySQL errors

### 14. Contact Points

If server keeps stopping:
1. Check `laravel.log` for fatal errors
2. Check PHP error log
3. Check Apache/Nginx error log
4. Check Windows Event Viewer
5. Check if antivirus is blocking Laragon

### Quick Restart Command (PowerShell)

```powershell
# Stop Laragon services
Stop-Process -Name "httpd" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "nginx" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "mysqld" -Force -ErrorAction SilentlyContinue

# Wait a moment
Start-Sleep -Seconds 2

# Then start Laragon and click "Start All"
```

