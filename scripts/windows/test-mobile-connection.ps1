# Test Mobile Connection Setup
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Testing Mobile Connection Setup" -ForegroundColor Cyan
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

# Check 1: Frontend .env.local
Write-Host "[1] Checking frontend/.env.local..." -ForegroundColor Yellow
$envFile = "frontend\.env.local"
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if ($content -match "NEXT_PUBLIC_API_URL=http://$wifiIP:8000/api/v1") {
        Write-Host "  OK - API URL is set to $wifiIP" -ForegroundColor Green
    } elseif ($content -match "NEXT_PUBLIC_API_URL=http://localhost") {
        Write-Host "  ERROR - Still using localhost!" -ForegroundColor Red
        Write-Host "  Fix: Update to http://$wifiIP:8000/api/v1" -ForegroundColor Yellow
    } else {
        Write-Host "  WARNING - Could not verify API URL" -ForegroundColor Yellow
        Get-Content $envFile | Select-String "API_URL"
    }
} else {
    Write-Host "  ERROR - File does not exist!" -ForegroundColor Red
    Write-Host "  Creating it now..." -ForegroundColor Yellow
    $newContent = @"
NEXT_PUBLIC_API_URL=http://$wifiIP:8000/api/v1
"@
    Set-Content -Path $envFile -Value $newContent
    Write-Host "  Created!" -ForegroundColor Green
}
Write-Host ""

# Check 2: Frontend Server
Write-Host "[2] Checking frontend server (port 3000)..." -ForegroundColor Yellow
$frontend = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($frontend) {
    $addr = ($frontend | Select-Object -First 1).LocalAddress
    if ($addr -eq "::" -or $addr -eq "0.0.0.0") {
        Write-Host "  OK - Server is listening on all interfaces" -ForegroundColor Green
    } else {
        Write-Host "  WARNING - Server only listening on $addr" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ERROR - Frontend server is NOT running!" -ForegroundColor Red
}
Write-Host ""

# Check 3: Backend Server
Write-Host "[3] Checking backend server (port 8000)..." -ForegroundColor Yellow
$backend = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($backend) {
    $addr = ($backend | Select-Object -First 1).LocalAddress
    if ($addr -eq "127.0.0.1" -or $addr -eq "::1") {
        Write-Host "  ERROR - Backend only listening on localhost!" -ForegroundColor Red
        Write-Host "  Fix: Restart with --host=0.0.0.0" -ForegroundColor Yellow
    } elseif ($addr -eq "::" -or $addr -eq "0.0.0.0") {
        Write-Host "  OK - Backend is listening on all interfaces" -ForegroundColor Green
    } else {
        Write-Host "  WARNING - Backend listening on $addr" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ERROR - Backend server is NOT running!" -ForegroundColor Red
}
Write-Host ""

# Check 4: Test API Connection
Write-Host "[4] Testing API connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://$wifiIP:8000/api/v1" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  OK - API is accessible at http://$wifiIP:8000/api/v1" -ForegroundColor Green
} catch {
    Write-Host "  ERROR - Cannot reach API at http://$wifiIP:8000/api/v1" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# Check 5: Test Frontend
Write-Host "[5] Testing frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://$wifiIP:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  OK - Frontend is accessible at http://$wifiIP:3000" -ForegroundColor Green
} catch {
    Write-Host "  ERROR - Cannot reach frontend at http://$wifiIP:3000" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access from phone: http://$wifiIP:3000" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Write-Host "If login still doesn't work:" -ForegroundColor Yellow
Write-Host "1. Make sure frontend server was restarted after .env.local change" -ForegroundColor Cyan
Write-Host "2. Check browser console on phone for errors" -ForegroundColor Cyan
Write-Host "3. Verify backend CORS allows your IP" -ForegroundColor Cyan
Write-Host ""

