# Fix Mobile Login Issues
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fixing Mobile Login Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get Wi-Fi IP
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

Write-Host "Your Wi-Fi IP: $wifiIP" -ForegroundColor Green
Write-Host ""

# Step 1: Create/Update frontend .env.local
Write-Host "[1/3] Configuring Frontend API URL..." -ForegroundColor Yellow
$frontendEnvPath = "frontend\.env.local"
$apiUrl = "http://$wifiIP:8000/api/v1"

$envContent = @"
# API URL for mobile access
# This allows the frontend to connect to backend from mobile devices
NEXT_PUBLIC_API_URL=$apiUrl
"@

Set-Content -Path $frontendEnvPath -Value $envContent -Force
Write-Host "✓ Created/Updated: $frontendEnvPath" -ForegroundColor Green
Write-Host "  API URL: $apiUrl" -ForegroundColor Cyan
Write-Host ""

# Step 2: Check Backend Status
Write-Host "[2/3] Checking Backend Server..." -ForegroundColor Yellow
$backendRunning = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue

if (-not $backendRunning) {
    Write-Host "⚠ Backend is NOT running on port 8000!" -ForegroundColor Red
    Write-Host ""
    Write-Host "You need to start the backend with network access:" -ForegroundColor Yellow
    Write-Host "  cd C:\laragon\www\Rent_V2_Backend" -ForegroundColor Cyan
    Write-Host "  php artisan serve --host=0.0.0.0 --port=8000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or use Laragon to start it, then restart with network binding." -ForegroundColor Yellow
} else {
    $backendIP = ($backendRunning | Select-Object -First 1).LocalAddress
    if ($backendIP -eq "127.0.0.1" -or $backendIP -eq "::1") {
        Write-Host "⚠ Backend is running but only on localhost!" -ForegroundColor Yellow
        Write-Host "  You need to restart it with: --host=0.0.0.0" -ForegroundColor Yellow
    } else {
        Write-Host "✓ Backend is running with network access" -ForegroundColor Green
    }
}
Write-Host ""

# Step 3: Update CORS Configuration
Write-Host "[3/3] Checking CORS Configuration..." -ForegroundColor Yellow
$backendEnvPath = "C:\laragon\www\Rent_V2_Backend\.env"

if (Test-Path $backendEnvPath) {
    $envContent = Get-Content $backendEnvPath -Raw
    $frontendUrl = "http://$wifiIP:3000"
    
    # Check if CORS already includes the mobile IP
    if ($envContent -notmatch [regex]::Escape($wifiIP)) {
        Write-Host "⚠ CORS needs to be updated to allow mobile access" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Add this to $backendEnvPath:" -ForegroundColor Cyan
        Write-Host "  CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://$wifiIP:3000" -ForegroundColor White
        Write-Host ""
        Write-Host "Then restart the backend server." -ForegroundColor Yellow
    } else {
        Write-Host "✓ CORS appears to be configured" -ForegroundColor Green
    }
} else {
    Write-Host "⚠ Backend .env file not found at: $backendEnvPath" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Configuration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Restart the frontend server:" -ForegroundColor Cyan
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Make sure backend is running with network access:" -ForegroundColor Cyan
Write-Host "   cd C:\laragon\www\Rent_V2_Backend" -ForegroundColor Gray
Write-Host "   php artisan serve --host=0.0.0.0 --port=8000" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Update backend CORS (if needed):" -ForegroundColor Cyan
Write-Host "   Add to backend .env: CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://$wifiIP:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Access from phone:" -ForegroundColor Cyan
Write-Host "   http://$wifiIP:3000" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Read-Host "Press Enter to continue"

