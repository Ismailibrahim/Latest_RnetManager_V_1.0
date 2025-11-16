# Apache Server Crash Analysis

## Root Cause Identified

From the Apache error logs, I found the critical issue:

```
[Thu Nov 13 19:46:21] [mpm_winnt:crit] [pid 30256:tid 476] AH02538: Child: Parent process exited abruptly. Child process is ending
[Wed Nov 12 10:37:32] [mpm_winnt:crit] [pid 15912:tid 452] AH02538: Child: Parent process exited abruptly. Child process is ending
```

**This means:** Apache's parent process is crashing or being killed unexpectedly, causing the child processes to terminate.

## Timeline of Events

1. **Nov 12, 10:37:32** - Apache parent process exited abruptly
2. **Nov 13, 19:43:56** - Apache restarted (unclean shutdown detected)
3. **Nov 13, 19:46:21** - Apache parent process exited abruptly again (most recent crash)

## Possible Causes

### 1. **Memory Issues**
- PHP memory exhaustion
- Apache running out of memory
- Too many concurrent requests

### 2. **PHP Fatal Errors**
- Fatal PHP errors causing Apache to crash
- Check PHP error logs

### 3. **Port Conflicts**
- Another application taking port 80
- Windows services conflicting

### 4. **Antivirus/Security Software**
- Blocking or killing Apache processes
- False positive detection

### 5. **Windows Updates/System Changes**
- System updates causing service interruption
- Power management settings

### 6. **Laravel Application Errors**
- Fatal errors in Laravel causing PHP to crash
- Infinite loops or memory leaks

## Investigation Steps

### Step 1: Check PHP Error Logs
```powershell
Get-ChildItem "C:\laragon\bin\php\*\logs\php_errors.log" | Get-Content -Tail 50
```

### Step 2: Check Windows Event Viewer
1. Open Event Viewer
2. Windows Logs → Application
3. Look for errors around crash times (Nov 13, 19:46:21)
4. Filter by Source: "Apache" or "Application Error"

### Step 3: Check for Memory Issues
```powershell
# Check PHP memory limit
Get-Content "C:\laragon\bin\php\php-8.3.26\php.ini" | Select-String "memory_limit"

# Check Apache memory settings
Get-Content "C:\laragon\bin\apache\httpd-2.4.62-240904-win64-VS17\conf\httpd.conf" | Select-String "ThreadsPerChild|MaxRequestWorkers"
```

### Step 4: Check Recent Laravel Errors
The Laravel log shows:
- Missing database tables (nationalities, landlord_settings)
- Route not defined errors
- These shouldn't crash Apache, but could cause issues

### Step 5: Check for Port Conflicts
```powershell
netstat -ano | findstr :80
netstat -ano | findstr :443
```

### Step 6: Check Antivirus Logs
- Check if antivirus is blocking/killing Apache
- Add Laragon folder to exclusions

## Immediate Fixes to Try

### Fix 1: Increase PHP Memory Limit
1. Open: `C:\laragon\bin\php\php-8.3.26\php.ini`
2. Find: `memory_limit`
3. Change to: `memory_limit = 512M`
4. Restart Apache

### Fix 2: Reduce Apache Threads
1. Open: `C:\laragon\bin\apache\httpd-2.4.62-240904-win64-VS17\conf\httpd.conf`
2. Find: `ThreadsPerChild` (default is 64)
3. Change to: `ThreadsPerChild 32`
4. Restart Apache

### Fix 3: Run Database Migrations
The logs show missing tables - this could cause issues:
```bash
cd D:\Sandbox\RentApplicaiton\backend
php artisan migrate
```

### Fix 4: Check Laragon Auto-Start Settings
1. Laragon → Menu → Preferences
2. Check "Auto Start" settings
3. Ensure services are set to auto-start correctly

### Fix 5: Run Apache as Administrator
1. Close Laragon
2. Right-click Laragon → Run as Administrator
3. Start services

## Prevention

1. **Monitor Memory Usage**
   - Check Task Manager when Apache is running
   - Watch for memory spikes

2. **Enable Detailed Logging**
   - Apache: Set LogLevel to "debug" temporarily
   - PHP: Enable error logging

3. **Regular Maintenance**
   - Clear Laravel cache regularly
   - Run database migrations
   - Check for application errors

4. **System Stability**
   - Keep Windows updated
   - Check for conflicting software
   - Monitor system resources

## Next Steps

1. Check Windows Event Viewer for crash details
2. Review PHP error logs
3. Check if antivirus is interfering
4. Try reducing Apache threads
5. Increase PHP memory limit
6. Run database migrations

