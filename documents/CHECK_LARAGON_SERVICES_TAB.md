# Check Laragon Services & Ports Tab

## What to Look For

When you click the **"Services & Ports"** tab in Laragon Preferences, check for:

### 1. **Auto-Stop Settings**
- Any checkbox like "Stop services when idle"
- "Stop All on Exit" option
- Timeout settings for services
- Idle detection settings

### 2. **Service Health Checks**
- Health check intervals
- Auto-restart settings
- Failure detection settings

### 3. **Port Configuration**
- Check if ports 80, 443 are configured correctly
- Look for port conflict detection
- Auto-port switching settings

### 4. **Apache-Specific Settings**
- Apache timeout settings
- Process management settings
- Worker thread limits

## Common Issues Found in Services Tab

1. **"Stop services when idle"** - Stops services after period of inactivity
2. **"Health check failed"** - Auto-stops if health check fails
3. **"Port conflict detected"** - Stops service if port is in use
4. **"Resource limit exceeded"** - Stops if memory/CPU too high

## What to Do

1. **Take a screenshot** of the "Services & Ports" tab
2. **Look for any auto-stop or timeout settings**
3. **Check Apache-specific settings**
4. **Note any error messages or warnings**

## Alternative: Check Laragon Logs

If the Services tab doesn't show auto-stop settings, check Laragon's internal logs:
- Laragon → Menu → Logs (if available)
- Or check: `C:\laragon\logs\` directory

