# Restart Servers for Mobile Access
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Restarting Servers for Mobile Access" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get IP Address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -like '192.168.*' } | Select-Object -First 1).IPAddress
if (-not $ipAddress) {
    $ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress
}

Write-Host "Your IP Address: $ipAddress" -ForegroundColor Green
Write-Host ""

# Stop existing servers
Write-Host "Stopping existing servers..." -ForegroundColor Yellow

# Stop port 3000
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($port3000) {
    foreach ($pid in $port3000) {
        Write-Host "Stopping process $pid on port 3000..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

# Stop port 8000
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($port8000) {
    foreach ($pid in $port8000) {
        Write-Host "Stopping process $pid on port 8000..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 2

# Configure Firewall (if admin)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Host "Configuring firewall..." -ForegroundColor Yellow
    netsh advfirewall firewall delete rule name="Next.js Dev Server" 2>$null | Out-Null
    netsh advfirewall firewall add rule name="Next.js Dev Server" dir=in action=allow protocol=TCP localport=3000 | Out-Null
    netsh advfirewall firewall delete rule name="Laravel Backend" 2>$null | Out-Null
    netsh advfirewall firewall add rule name="Laravel Backend" dir=in action=allow protocol=TCP localport=8000 | Out-Null
    Write-Host "[OK] Firewall configured!" -ForegroundColor Green
} else {
    Write-Host "NOTE: Run as Administrator to configure firewall automatically" -ForegroundColor Yellow
    Write-Host "Or run: scripts\windows\ALLOW-MOBILE-ACCESS.bat as Administrator" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting servers with network access..." -ForegroundColor Cyan
Write-Host ""

# Start Backend
$backendPath = "C:\laragon\www\Rent_V2_Backend"
if (Test-Path $backendPath) {
    Write-Host "Starting Backend on http://$ipAddress:8000" -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '========================================' -ForegroundColor Cyan; Write-Host 'Backend Server - Network Mode' -ForegroundColor Green; Write-Host 'Local:  http://localhost:8000' -ForegroundColor Gray; Write-Host 'Network: http://$ipAddress:8000' -ForegroundColor Cyan; Write-Host '========================================' -ForegroundColor Cyan; Write-Host ''; php artisan serve --host=0.0.0.0 --port=8000"
    Start-Sleep -Seconds 3
} else {
    Write-Host "WARNING: Backend path not found at: $backendPath" -ForegroundColor Yellow
}

# Start Frontend
$frontendPath = "D:\Sandbox\Rent_V2\frontend"
if (Test-Path $frontendPath) {
    Set-Location $frontendPath
    
    # Clean lock file
    $lockFile = ".next\dev\lock"
    if (Test-Path $lockFile) {
        Write-Host "Cleaning lock file..." -ForegroundColor Yellow
        Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Frontend Server Starting!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access from your PHONE:" -ForegroundColor Yellow
    Write-Host "  http://$ipAddress:3000" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host ""
    Write-Host "Access from LAPTOP:" -ForegroundColor Gray
    Write-Host "  http://localhost:3000" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Make sure your phone is on the same Wi-Fi!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    $env:HOST = "0.0.0.0"
    npm run dev
} else {
    Write-Host "ERROR: Frontend path not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
}

