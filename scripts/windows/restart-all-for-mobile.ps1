# Restart All Servers for Mobile Access
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Restarting Servers for Mobile Access" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get IP
$wifiIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -like '*Wi-Fi*' -and 
    $_.IPAddress -like '192.168.*' 
} | Select-Object -First 1).IPAddress

if (-not $wifiIP) {
    $wifiIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
        $_.InterfaceAlias -notlike '*Loopback*' -and 
        $_.IPAddress -notlike '169.254.*' -and
        $_.IPAddress -notlike '172.*' 
    } | Select-Object -First 1).IPAddress
}

Write-Host "Your IP: $wifiIP" -ForegroundColor Green
Write-Host ""

# Stop frontend
Write-Host "[1/3] Stopping frontend server..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($port3000) {
    $pid = ($port3000 | Select-Object -First 1).OwningProcess
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  Stopped" -ForegroundColor Green
} else {
    Write-Host "  Not running" -ForegroundColor Gray
}

# Stop backend
Write-Host "[2/3] Stopping backend server..." -ForegroundColor Yellow
$port8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($port8000) {
    $pid = ($port8000 | Select-Object -First 1).OwningProcess
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  Stopped" -ForegroundColor Green
} else {
    Write-Host "  Not running" -ForegroundColor Gray
}

# Start backend
Write-Host "[3/3] Starting servers with network access..." -ForegroundColor Yellow
Write-Host ""

# Start backend in new window
$backendPath = "C:\laragon\www\Rent_V2_Backend"
if (Test-Path $backendPath) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Backend Server - Network Mode' -ForegroundColor Green; Write-Host 'Access at: http://$wifiIP:8000' -ForegroundColor Cyan; Write-Host ''; php artisan serve --host=0.0.0.0 --port=8000"
    Start-Sleep -Seconds 3
    Write-Host "  Backend started" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Backend path not found!" -ForegroundColor Red
}

# Start frontend in new window
$frontendPath = "D:\Sandbox\Rent_V2\frontend"
if (Test-Path $frontendPath) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host 'Frontend Server - Mobile Config' -ForegroundColor Green; Write-Host 'Access from phone: http://$wifiIP:3000' -ForegroundColor Cyan; Write-Host 'API URL: http://$wifiIP:8000/api/v1' -ForegroundColor Gray; Write-Host ''; npm run dev"
    Write-Host "  Frontend started" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Frontend path not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Servers Starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Wait 10-15 seconds for servers to fully start" -ForegroundColor Yellow
Write-Host ""
Write-Host "Access from phone: http://$wifiIP:3000" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Write-Host "Two new PowerShell windows should have opened:" -ForegroundColor Cyan
Write-Host "  - One for Backend (port 8000)" -ForegroundColor Gray
Write-Host "  - One for Frontend (port 3000)" -ForegroundColor Gray
Write-Host ""

