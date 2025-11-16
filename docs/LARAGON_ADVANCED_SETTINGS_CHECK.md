# Laragon Advanced Settings Investigation

## What to Check in "Advanced" Settings

When you click the **"Advanced"** link below MySQL in the Services & Ports tab, look for:

### 1. **Service Management Settings**
- Auto-restart on failure
- Health check intervals
- Service timeout settings
- Process monitoring settings

### 2. **Resource Limits**
- Memory limits per service
- CPU usage limits
- Process limits
- Auto-stop on resource exhaustion

### 3. **Apache-Specific Advanced Settings**
- Worker process limits
- Request timeout
- Connection timeout
- KeepAlive settings
- Process lifecycle management

### 4. **Error Handling**
- What to do on service failure
- Logging settings
- Notification settings

## Alternative Investigation: Laragon Process Monitoring

Since no auto-stop settings are visible, the issue might be:

1. **Laragon's internal process monitoring** - Laragon might be monitoring Apache and stopping it if it detects issues
2. **Resource monitoring** - Laragon might stop services if system resources are low
3. **Port conflict detection** - Laragon might stop Apache if it detects port conflicts
4. **Laragon bug** - A bug in Laragon's service management

## Diagnostic Steps

### Step 1: Check Advanced Settings
Click "Advanced" and look for any timeout, auto-stop, or monitoring settings.

### Step 2: Monitor Laragon's Behavior
Watch Laragon's main window when Apache stops:
- Does the Apache indicator change color?
- Are there any messages or notifications?
- Does Laragon show any errors?

### Step 3: Check Laragon Version
- Laragon → Menu → About
- Check if you're on the latest version
- Some versions have bugs with service management

### Step 4: Test Without Laragon
Try starting Apache manually to see if it stays running:
```bash
# In Command Prompt as Administrator
cd C:\laragon\bin\apache\httpd-2.4.62-240904-win64-VS17\bin
httpd.exe -k start
```

If Apache stays running manually, the issue is with Laragon's management.

### Step 5: Check Laragon Logs
Look for Laragon's own log files:
- `C:\laragon\logs\` (if exists)
- Laragon → Menu → Logs (if available)
- Check Windows Event Viewer for Laragon entries

## Workaround: Use Laravel Built-in Server

If Laragon keeps stopping Apache, use Laravel's built-in server instead:
```bash
cd D:\Sandbox\RentApplicaiton\backend
php artisan serve
```

This bypasses Apache entirely and runs on port 8000.

