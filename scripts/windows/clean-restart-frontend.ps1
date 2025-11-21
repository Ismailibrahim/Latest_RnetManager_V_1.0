# Clean Restart Frontend Server for Mobile Access
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Clean Restart - Frontend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get Wi-Fi IP (not virtual adapter)
$wifiIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -like '*Wi-Fi*' -and 
    $_.IPAddress -like '192.168.*' 
} | Select-Object -First 1).IPAddress

if (-not $wifiIP) {
    Write-Host "WARNING: Could not find Wi-Fi IP. Using first available..." -ForegroundColor Yellow
    $wifiIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
        $_.InterfaceAlias -notlike '*Loopback*' -and 
        $_.IPAddress -notlike '169.254.*' -and
        $_.IPAddress -notlike '172.*' 
    } | Select-Object -First 1).IPAddress
}

Write-Host "Your Wi-Fi IP: $wifiIP" -ForegroundColor Green
Write-Host ""

# Stop all node processes
Write-Host "Stopping all Node processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Remove lock file
$lockFile = "D:\Sandbox\Rent_V2\frontend\.next\dev\lock"
if (Test-Path $lockFile) {
    Write-Host "Removing lock file..." -ForegroundColor Yellow
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Starting server with network access..." -ForegroundColor Cyan
Write-Host ""

# Change to frontend directory
Set-Location "D:\Sandbox\Rent_V2\frontend"

# Set environment variable for network binding
$env:HOST = "0.0.0.0"

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Server Starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access from your PHONE:" -ForegroundColor Yellow
Write-Host "  http://$wifiIP:3000" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Write-Host "Access from LAPTOP:" -ForegroundColor Gray
Write-Host "  http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "NOTE: If you see a different Network IP in the output," -ForegroundColor Yellow
Write-Host "      use the Wi-Fi IP above ($wifiIP) instead!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start the server
npm run dev

