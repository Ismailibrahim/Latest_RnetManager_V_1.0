# Fix "Failed to fetch" Error
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fixing 'Failed to fetch' Error" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ip = "192.168.1.225"
$apiUrl = "http://$ip:8000/api/v1"

# Step 1: Verify .env.local
Write-Host "[1/4] Checking frontend/.env.local..." -ForegroundColor Yellow
$envFile = "frontend\.env.local"
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if ($content -match "NEXT_PUBLIC_API_URL=http://$ip:8000/api/v1") {
        Write-Host "  OK - API URL is correct" -ForegroundColor Green
    } else {
        Write-Host "  FIXING - Updating API URL..." -ForegroundColor Yellow
        Set-Content -Path $envFile -Value "NEXT_PUBLIC_API_URL=$apiUrl"
        Write-Host "  OK - Updated!" -ForegroundColor Green
        Write-Host "  WARNING - Frontend MUST be restarted!" -ForegroundColor Red
    }
} else {
    Write-Host "  CREATING - .env.local file..." -ForegroundColor Yellow
    Set-Content -Path $envFile -Value "NEXT_PUBLIC_API_URL=$apiUrl"
    Write-Host "  OK - Created!" -ForegroundColor Green
    Write-Host "  WARNING - Frontend MUST be restarted!" -ForegroundColor Red
}
Write-Host ""

# Step 2: Check Backend
Write-Host "[2/4] Checking backend server..." -ForegroundColor Yellow
$backend = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($backend) {
    $addr = ($backend | Select-Object -First 1).LocalAddress
    if ($addr -eq "0.0.0.0" -or $addr -eq "::") {
        Write-Host "  OK - Backend accessible from network" -ForegroundColor Green
    } else {
        Write-Host "  ERROR - Backend only on $addr (not accessible from phone!)" -ForegroundColor Red
        Write-Host "  Fix: Restart with --host=0.0.0.0" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ERROR - Backend not running!" -ForegroundColor Red
}
Write-Host ""

# Step 3: Test API Endpoint
Write-Host "[3/4] Testing API endpoint..." -ForegroundColor Yellow
try {
    $testUrl = "$apiUrl/auth/login"
    $body = '{"email":"test@test.com","password":"test","device_name":"web"}'
    $response = Invoke-WebRequest -Uri $testUrl -Method POST -ContentType "application/json" -Body $body -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  OK - API endpoint is reachable" -ForegroundColor Green
} catch {
    $errorMsg = $_.Exception.Message
    Write-Host "  Testing connection..." -ForegroundColor Yellow
    
    # Try simple GET first
    try {
        $testResponse = Invoke-WebRequest -Uri $apiUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  OK - API base is reachable" -ForegroundColor Green
        Write-Host "  Note: Login endpoint may require valid credentials" -ForegroundColor Gray
    } catch {
        if ($errorMsg -like "*CORS*" -or $errorMsg -like "*origin*") {
            Write-Host "  ERROR - CORS issue detected!" -ForegroundColor Red
            Write-Host "  Need to update backend CORS configuration" -ForegroundColor Yellow
        } elseif ($errorMsg -like "*refused*" -or $errorMsg -like "*cannot*") {
            Write-Host "  ERROR - Cannot connect to backend" -ForegroundColor Red
            Write-Host "  Check if backend is running with --host=0.0.0.0" -ForegroundColor Yellow
        } else {
            Write-Host "  ERROR - $errorMsg" -ForegroundColor Red
        }
    }
}
Write-Host ""

# Step 4: Check CORS
Write-Host "[4/4] Checking CORS configuration..." -ForegroundColor Yellow
$backendEnv = "C:\laragon\www\Rent_V2_Backend\.env"
if (Test-Path $backendEnv) {
    $envContent = Get-Content $backendEnv -Raw
    if ($envContent -match "CORS_ALLOWED_ORIGINS.*192\.168\.1\.225") {
        Write-Host "  OK - CORS includes your IP" -ForegroundColor Green
    } else {
        Write-Host "  WARNING - CORS may not include your IP" -ForegroundColor Yellow
        Write-Host "  Update backend .env:" -ForegroundColor Cyan
        Write-Host "    CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://$ip:3000" -ForegroundColor White
    }
} else {
    Write-Host "  WARNING - Backend .env not found" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SOLUTION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. RESTART FRONTEND (REQUIRED!)" -ForegroundColor Yellow
Write-Host "   Stop current frontend (Ctrl+C)" -ForegroundColor Gray
Write-Host "   Restart: cd frontend && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. UPDATE BACKEND CORS (if needed)" -ForegroundColor Yellow
Write-Host "   Edit: C:\laragon\www\Rent_V2_Backend\.env" -ForegroundColor Gray
Write-Host "   Add: CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://$ip:3000" -ForegroundColor Gray
Write-Host "   Then restart backend" -ForegroundColor Gray
Write-Host ""
Write-Host "3. TEST AGAIN" -ForegroundColor Yellow
Write-Host "   On phone: http://$ip:3000" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""

