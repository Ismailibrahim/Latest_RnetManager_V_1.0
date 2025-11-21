# Quick Setup for Mobile Access
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setting Up Mobile Access" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get IP Address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -like '192.168.*' } | Select-Object -First 1).IPAddress

if (-not $ipAddress) {
    Write-Host "Could not find Wi-Fi IP. Using first available..." -ForegroundColor Yellow
    $ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress
}

Write-Host "Your IP Address: $ipAddress" -ForegroundColor Green
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "NOTE: Firewall configuration requires Administrator privileges." -ForegroundColor Yellow
    Write-Host "You can either:" -ForegroundColor Yellow
    Write-Host "1. Run this script as Administrator (Right-click -> Run as Administrator)" -ForegroundColor Yellow
    Write-Host "2. Or run ALLOW-MOBILE-ACCESS.bat as Administrator" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "For now, let's start the servers with network access..." -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "Configuring firewall rules..." -ForegroundColor Yellow
    netsh advfirewall firewall delete rule name="Next.js Dev Server" 2>$null
    netsh advfirewall firewall add rule name="Next.js Dev Server" dir=in action=allow protocol=TCP localport=3000 | Out-Null
    netsh advfirewall firewall delete rule name="Laravel Backend" 2>$null
    netsh advfirewall firewall add rule name="Laravel Backend" dir=in action=allow protocol=TCP localport=8000 | Out-Null
    Write-Host "[OK] Firewall rules configured!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ready to Start Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your phone should access:" -ForegroundColor Yellow
Write-Host "  Frontend: http://$ipAddress:3000" -ForegroundColor Cyan
Write-Host "  Backend:  http://$ipAddress:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Make sure your phone is on the same Wi-Fi network!" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to start servers with network access"

# Start Backend
Write-Host ""
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
$backendPath = "C:\laragon\www\Rent_V2_Backend"
if (Test-Path $backendPath) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Backend Server - Network Mode' -ForegroundColor Green; Write-Host 'Access at: http://$ipAddress:8000' -ForegroundColor Cyan; Write-Host ''; php artisan serve --host=0.0.0.0 --port=8000"
    Start-Sleep -Seconds 2
} else {
    Write-Host "WARNING: Backend path not found. You may need to start it manually." -ForegroundColor Yellow
}

# Start Frontend
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
$frontendPath = "D:\Sandbox\Rent_V2\frontend"
if (Test-Path $frontendPath) {
    Set-Location $frontendPath
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Servers Starting!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access from your phone:" -ForegroundColor Cyan
    Write-Host "  http://$ipAddress:3000" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host ""
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    $env:HOST = "0.0.0.0"
    npm run dev
} else {
    Write-Host "ERROR: Frontend path not found at: $frontendPath" -ForegroundColor Red
    Read-Host "Press Enter to exit"
}

