# Log Permission Issue - Root Cause & Prevention Guide

## 🔍 What Was The Actual Issue?

### The Problem
The login functionality was failing with **500 Server Errors** because:

1. **Log File Ownership Mismatch**: 
   - The log file `probe-2025-12-12.log` was created/owned by `root` user
   - PHP-FPM runs as `www-data` user
   - When the application tried to write logs, it got **"Permission denied"** errors

2. **Cascade Failure**:
   - Laravel's `RequestDiagnosticsMiddleware` tries to log every request to the `probe` channel
   - When logging failed, it threw an `UnexpectedValueException`
   - This exception caused the entire request to fail with a 500 error
   - Users saw "Server error. Please try again later." instead of being able to login

3. **Why It Happened**:
   - Someone (likely root) manually created or accessed the log file
   - Or a cron job/script ran as root and created the file
   - The file retained root ownership, blocking PHP-FPM from writing

### Error Flow
```
User attempts login
  ↓
Request hits Laravel backend
  ↓
RequestDiagnosticsMiddleware tries to log to probe.log
  ↓
Permission denied (www-data can't write to root-owned file)
  ↓
UnexpectedValueException thrown
  ↓
500 Server Error returned
  ↓
Frontend shows "Server error. Please try again later."
```

## 🛡️ Prevention Strategies

### 1. **Automated Permission Fix Script**

A script has been created at: `/var/www/rentapplicaiton/backend/fix-permissions.sh`

**Run it manually when needed:**
```bash
sudo /var/www/rentapplicaiton/backend/fix-permissions.sh
```

**Or set up a cron job to run daily:**
```bash
# Add to crontab (crontab -e)
0 2 * * * /var/www/rentapplicaiton/backend/fix-permissions.sh >> /var/log/laravel-permissions.log 2>&1
```

### 2. **Laravel Deployment Script Enhancement**

Add permission fixes to your deployment process:

```bash
# After deployment, always run:
cd /var/www/rentapplicaiton/backend
php artisan storage:link
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
```

### 3. **Add Error Handling in Middleware**

The middleware should gracefully handle log failures without breaking requests.

**File**: `app/Http/Middleware/RequestDiagnosticsMiddleware.php`

Add try-catch around logging:
```php
try {
    Log::channel('probe')->info('request.start', SystemProbe::context([...]));
} catch (\Exception $e) {
    // Log to default channel instead, don't break the request
    \Log::warning('Probe logging failed: ' . $e->getMessage());
}
```

### 4. **Set Up Proper umask**

Ensure new files are created with correct permissions:

**Add to `/etc/php/8.3/fpm/php-fpm.conf`:**
```ini
[www]
umask = 0002  # This ensures files are created with 664 permissions
```

### 5. **Monitor Log File Ownership**

Create a monitoring script to alert when ownership is wrong:

```bash
#!/bin/bash
# check-log-permissions.sh
STORAGE_PATH="/var/www/rentapplicaiton/backend/storage/logs"
WRONG_OWNER=$(find $STORAGE_PATH -type f ! -user www-data 2>/dev/null)

if [ ! -z "$WRONG_OWNER" ]; then
    echo "ALERT: Log files with wrong ownership found:"
    echo "$WRONG_OWNER"
    # Send alert (email, Slack, etc.)
fi
```

### 6. **Use Laravel's Built-in Permission Commands**

Laravel provides artisan commands for permissions. Create a custom command:

```php
// app/Console/Commands/FixPermissions.php
php artisan make:command FixPermissions

// In handle() method:
public function handle()
{
    $storage = storage_path();
    $cache = base_path('bootstrap/cache');
    
    $this->info('Fixing permissions...');
    
    // Set ownership
    chown_r($storage, 'www-data', 'www-data');
    chown_r($cache, 'www-data', 'www-data');
    
    // Set permissions
    chmod_r($storage, 0775, 0664);
    chmod_r($cache, 0775, 0664);
    
    $this->info('Permissions fixed!');
}
```

### 7. **Prevent Root from Creating Files**

**Option A: Use sudo with proper flags**
```bash
# Instead of running as root directly
sudo -u www-data php artisan some:command

# Or set sudoers to preserve environment
sudo -E -u www-data command
```

**Option B: Use setfacl (Access Control Lists)**
```bash
# Set default ACLs so new files inherit www-data ownership
setfacl -R -m d:u:www-data:rwx /var/www/rentapplicaiton/backend/storage/logs
setfacl -R -m u:www-data:rwx /var/www/rentapplicaiton/backend/storage/logs
```

### 8. **Add Health Check Endpoint**

Create an endpoint that checks permissions:

```php
// routes/api.php
Route::get('/health/permissions', function() {
    $logsPath = storage_path('logs');
    $writable = is_writable($logsPath);
    $owner = posix_getpwuid(fileowner($logsPath));
    
    return response()->json([
        'logs_writable' => $writable,
        'logs_owner' => $owner['name'],
        'expected_owner' => 'www-data',
        'status' => $writable && $owner['name'] === 'www-data' ? 'ok' : 'error'
    ]);
});
```

## 📋 Quick Checklist

- [ ] Run `fix-permissions.sh` script
- [ ] Add permission fix to deployment process
- [ ] Add error handling in middleware (graceful degradation)
- [ ] Set up daily cron job for permission checks
- [ ] Configure PHP-FPM umask
- [ ] Document who has root access and when
- [ ] Set up monitoring/alerts for permission issues
- [ ] Test login after any manual file operations

## 🚨 Immediate Actions When Issue Occurs

1. **Check ownership:**
   ```bash
   ls -la /var/www/rentapplicaiton/backend/storage/logs/
   ```

2. **Fix immediately:**
   ```bash
   sudo /var/www/rentapplicaiton/backend/fix-permissions.sh
   ```

3. **Verify:**
   ```bash
   sudo -u www-data touch /var/www/rentapplicaiton/backend/storage/logs/test.log
   rm /var/www/rentapplicaiton/backend/storage/logs/test.log
   ```

4. **Restart services if needed:**
   ```bash
   sudo systemctl restart php8.3-fpm
   ```

## 📝 Best Practices

1. **Never run Laravel commands as root** - Always use `sudo -u www-data`
2. **Always fix permissions after manual file operations**
3. **Include permission fixes in deployment scripts**
4. **Monitor log file ownership regularly**
5. **Use graceful error handling** - Don't let logging failures break requests
6. **Document all manual interventions** that might affect file ownership
