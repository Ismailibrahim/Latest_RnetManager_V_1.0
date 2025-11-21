# Complete Mobile Login Fix
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COMPLETE MOBILE LOGIN FIX" -ForegroundColor Cyan
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

# Step 1: Fix frontend .env.local
Write-Host "[1/5] Fixing frontend/.env.local..." -ForegroundColor Yellow
$envFile = "frontend\.env.local"
$apiUrl = "http://$wifiIP:8000/api/v1"
$envContent = "NEXT_PUBLIC_API_URL=$apiUrl"
Set-Content -Path $envFile -Value $envContent -Force
Write-Host "  OK - API URL set to: $apiUrl" -ForegroundColor Green
Write-Host ""

# Step 2: Check Frontend Server
Write-Host "[2/5] Checking frontend server..." -ForegroundColor Yellow
$frontend = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($frontend) {
    Write-Host "  OK - Frontend running on port 3000" -ForegroundColor Green
    Write-Host "  WARNING - Frontend needs to be RESTARTED to pick up .env.local changes!" -ForegroundColor Yellow
} else {
    Write-Host "  ERROR - Frontend not running!" -ForegroundColor Red
}
Write-Host ""

# Step 3: Check Backend Server
Write-Host "[3/5] Checking backend server..." -ForegroundColor Yellow
$backend = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($backend) {
    $addr = ($backend | Select-Object -First 1).LocalAddress
    if ($addr -eq "127.0.0.1" -or $addr -eq "::1") {
        Write-Host "  ERROR - Backend only on localhost! Not accessible from phone!" -ForegroundColor Red
        Write-Host "  Need to restart with: php artisan serve --host=0.0.0.0 --port=8000" -ForegroundColor Yellow
    } elseif ($addr -eq "0.0.0.0" -or $addr -eq "::") {
        Write-Host "  OK - Backend accessible from network" -ForegroundColor Green
    } else {
        Write-Host "  WARNING - Backend on $addr" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ERROR - Backend not running!" -ForegroundColor Red
    Write-Host "  Starting backend..." -ForegroundColor Yellow
    
    # Try to start backend
    $backendPath = "C:\laragon\www\Rent_V2_Backend"
    if (Test-Path $backendPath) {
        # Find PHP
        $phpPath = $null
        $phpDirs = Get-ChildItem "C:\laragon\bin\php" -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending
        if ($phpDirs) {
            $phpPath = Join-Path $phpDirs[0].FullName "php.exe"
            if (Test-Path $phpPath) {
                Write-Host "  Found PHP: $phpPath" -ForegroundColor Cyan
                Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Backend Server - Network Mode' -ForegroundColor Green; Write-Host 'Access: http://$wifiIP:8000' -ForegroundColor Cyan; Write-Host ''; & '$phpPath' artisan serve --host=0.0.0.0 --port=8000"
                Write-Host "  Backend starting in new window..." -ForegroundColor Green
                Start-Sleep -Seconds 3
            }
        }
        
        if (-not $phpPath -or -not (Test-Path $phpPath)) {
            Write-Host "  ERROR - Could not find PHP!" -ForegroundColor Red
            Write-Host "  Please use Laragon Terminal to start backend:" -ForegroundColor Yellow
            Write-Host "    1. Open Laragon" -ForegroundColor Cyan
            Write-Host "    2. Click Terminal button" -ForegroundColor Cyan
            Write-Host "    3. Run: cd C:\laragon\www\Rent_V2_Backend" -ForegroundColor Cyan
            Write-Host "    4. Run: php artisan serve --host=0.0.0.0 --port=8000" -ForegroundColor Cyan
        }
    }
}
Write-Host ""

# Step 4: Test Connections
Write-Host "[4/5] Testing connections..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://$wifiIP:8000/api/v1" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  OK - Backend API accessible" -ForegroundColor Green
} catch {
    Write-Host "  ERROR - Cannot reach backend API" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://$wifiIP:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  OK - Frontend accessible" -ForegroundColor Green
} catch {
    Write-Host "  ERROR - Cannot reach frontend" -ForegroundColor Red
}
Write-Host ""

# Step 5: Summary
Write-Host "[5/5] Summary and Next Steps" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ACTION REQUIRED" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. RESTART FRONTEND SERVER (REQUIRED!)" -ForegroundColor Yellow
Write-Host "   - Stop current frontend (Ctrl+C)" -ForegroundColor Gray
Write-Host "   - Restart: cd frontend && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. VERIFY BACKEND IS RUNNING" -ForegroundColor Yellow
Write-Host "   - Check: netstat -ano | findstr :8000" -ForegroundColor Gray
Write-Host "   - Should show: 0.0.0.0:8000" -ForegroundColor Gray
Write-Host ""
Write-Host "3. TEST ON PHONE" -ForegroundColor Yellow
Write-Host "   - URL: http://$wifiIP:3000" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

