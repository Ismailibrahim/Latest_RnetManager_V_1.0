# Laragon Apache Server Stop Investigation

## Summary of Findings

**Issue:** Apache parent process exits abruptly, causing server to stop
**Memory Limit:** 512M (already correct)
**Windows Event Log:** No entries found
**Apache Error Log:** Shows "Parent process exited abruptly"

## Key Observations

1. **No Windows Event Log entries** - This suggests it's NOT a system-level crash
2. **Apache logs show "unclean shutdown"** - Process is being terminated, not crashing
3. **Memory limit is correct** - Not a memory issue
4. **No PHP fatal errors** - Not a PHP crash

## Most Likely Causes (Given the Evidence)

### 1. **Laragon Auto-Stop Feature** ⚠️ MOST LIKELY
Laragon has an auto-stop feature that stops services when:
- System goes to sleep/hibernate
- Computer is idle for a period
- Laragon window is closed (if configured)
- System resources are low

**Check:**
- Laragon → Menu → Preferences → Auto Stop settings
- Look for "Stop services when idle" or similar options
- Check if "Stop All on Exit" is enabled

### 2. **Apache Timeout/KeepAlive Issues**
Apache might be timing out connections or having KeepAlive issues.

**Check Apache config:**
```apache
Timeout 300
KeepAlive On
MaxKeepAliveRequests 100
KeepAliveTimeout 5
```

### 3. **PHP Module Issues**
If using mod_php, there might be issues with PHP module loading.

**Check:**
- Is PHP module loaded correctly?
- Are there any PHP module conflicts?

### 4. **Laragon Process Management**
Laragon might be killing Apache processes due to:
- Resource monitoring
- Health checks failing
- Configuration issues

### 5. **Antivirus/Security Software** (Silent Blocking)
Some antivirus software silently kills processes without logging to Windows Event Viewer.

**Check:**
- Antivirus logs
- Real-time protection settings
- Add Laragon to exclusions

## Investigation Steps

### Step 1: Check Laragon Settings
1. Open Laragon
2. Menu → Preferences
3. Check all "Auto" settings:
   - Auto Start
   - Auto Stop
   - Stop on Exit
   - Idle timeout settings

### Step 2: Check Apache Configuration
Look for these settings in `httpd.conf`:
```apache
Timeout 300
KeepAlive On
MaxKeepAliveRequests 100
KeepAliveTimeout 5
ThreadsPerChild 64
MaxRequestWorkers 256
```

### Step 3: Monitor Apache Process
```powershell
# Watch Apache process
Get-Process | Where-Object {$_.ProcessName -like "*httpd*"} | Format-Table ProcessName, Id, WorkingSet, CPU, StartTime -AutoSize

# Monitor continuously
while ($true) {
    Clear-Host
    Get-Process | Where-Object {$_.ProcessName -like "*httpd*"} | Format-Table ProcessName, Id, WorkingSet, CPU, StartTime -AutoSize
    Start-Sleep -Seconds 5
}
```

### Step 4: Check Laragon Logs
Laragon might have its own logs:
- `C:\laragon\logs\` (if exists)
- Laragon → Menu → Logs
- Check Laragon's console output

### Step 5: Test with Manual Apache Start
Try starting Apache manually (not through Laragon):
```bash
# In Laragon Terminal or Command Prompt
cd C:\laragon\bin\apache\httpd-2.4.62-240904-win64-VS17\bin
httpd.exe -k start
```

If it stays running manually, the issue is with Laragon's process management.

### Step 6: Check for Resource Limits
```powershell
# Check system resources when Apache stops
Get-Counter "\Process(httpd)\Working Set" -SampleInterval 1 -MaxSamples 10
```

### Step 7: Enable Detailed Apache Logging
Edit `httpd.conf`:
```apache
LogLevel debug
ErrorLog "logs/error.log"
```

## Recommended Fixes

### Fix 1: Disable Laragon Auto-Stop
1. Laragon → Menu → Preferences
2. Uncheck any "Auto Stop" options
3. Ensure "Stop All on Exit" is disabled (if you want services to keep running)

### Fix 2: Increase Apache Timeouts
Edit `httpd.conf`:
```apache
Timeout 600
KeepAliveTimeout 15
```

### Fix 3: Reduce Apache Threads (if resource constrained)
```apache
ThreadsPerChild 32
MaxRequestWorkers 128
```

### Fix 4: Check Laragon Version
- Update Laragon to latest version
- Some versions have bugs with process management

### Fix 5: Use Laravel Built-in Server (Workaround)
Instead of Apache, use:
```bash
php artisan serve
```
This bypasses Apache entirely.

## Diagnostic Script

Create `check-apache-status.ps1`:
```powershell
while ($true) {
    $apache = Get-Process | Where-Object {$_.ProcessName -like "*httpd*"}
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    if ($apache) {
        Write-Host "$timestamp - Apache RUNNING (PID: $($apache.Id))" -ForegroundColor Green
    } else {
        Write-Host "$timestamp - Apache STOPPED" -ForegroundColor Red
        # Check Laragon status
        $laragon = Get-Process | Where-Object {$_.ProcessName -like "*laragon*"}
        if ($laragon) {
            Write-Host "  Laragon is running" -ForegroundColor Yellow
        } else {
            Write-Host "  Laragon is NOT running" -ForegroundColor Yellow
        }
    }
    
    Start-Sleep -Seconds 10
}
```

Run this to monitor when Apache stops.

## Next Steps

1. **Check Laragon Preferences** - Most likely culprit
2. **Monitor Apache process** - See when/why it stops
3. **Check antivirus** - Silent blocking
4. **Test manual Apache start** - Isolate Laragon issue
5. **Review Apache config** - Timeout/KeepAlive settings

## Conclusion

Given that:
- No Windows Event Log entries
- Memory is fine
- No PHP fatal errors
- Apache logs show "abrupt exit"

**Most likely cause:** Laragon's auto-stop feature or process management issue, NOT an actual crash.

