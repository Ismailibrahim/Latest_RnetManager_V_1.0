# Fix "Verifying authentication..." Loop
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fixing Authentication Loop" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ip = "192.168.1.225"
$apiUrl = "http://$ip:8000/api/v1"

# Step 1: Check Backend Status
Write-Host "[1/3] Checking backend server..." -ForegroundColor Yellow
$backend = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($backend) {
    $addr = ($backend | Select-Object -First 1).LocalAddress
    if ($addr -eq "0.0.0.0" -or $addr -eq "::") {
        Write-Host "  OK - Backend running on network" -ForegroundColor Green
    } else {
        Write-Host "  ERROR - Backend only on $addr" -ForegroundColor Red
    }
} else {
    Write-Host "  ERROR - Backend not running!" -ForegroundColor Red
}
Write-Host ""

# Step 2: Test /auth/me endpoint
Write-Host "[2/3] Testing /auth/me endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$apiUrl/auth/me" -Headers @{'Authorization'='Bearer test'} -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  OK - Endpoint is reachable (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    $errorMsg = $_.Exception.Message
    Write-Host "  Testing connection..." -ForegroundColor Yellow
    
    # Try without auth to see if it's CORS
    try {
        $testResponse = Invoke-WebRequest -Uri "$apiUrl" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  OK - API base is reachable" -ForegroundColor Green
        Write-Host "  Issue: /auth/me endpoint may have CORS or auth issues" -ForegroundColor Yellow
    } catch {
        if ($errorMsg -like "*CORS*" -or $errorMsg -like "*origin*") {
            Write-Host "  ERROR - CORS issue!" -ForegroundColor Red
            Write-Host "  Backend is blocking requests from your IP" -ForegroundColor Yellow
        } elseif ($errorMsg -like "*refused*" -or $errorMsg -like "*cannot*") {
            Write-Host "  ERROR - Cannot connect to backend" -ForegroundColor Red
        } else {
            Write-Host "  ERROR - $errorMsg" -ForegroundColor Red
        }
    }
}
Write-Host ""

# Step 3: Check and Fix CORS
Write-Host "[3/3] Checking CORS configuration..." -ForegroundColor Yellow
$backendEnv = "C:\laragon\www\Rent_V2_Backend\.env"
if (Test-Path $backendEnv) {
    $envContent = Get-Content $backendEnv -Raw
    if ($envContent -match "CORS_ALLOWED_ORIGINS.*$ip") {
        Write-Host "  OK - CORS includes your IP" -ForegroundColor Green
    } else {
        Write-Host "  FIXING - Updating CORS..." -ForegroundColor Yellow
        
        # Update CORS
        $corsLine = "CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://$ip:3000"
        if ($envContent -match "CORS_ALLOWED_ORIGINS=") {
            $envContent = $envContent -replace "CORS_ALLOWED_ORIGINS=.*", $corsLine
        } else {
            $envContent += "`n$corsLine`n"
        }
        
        Set-Content -Path $backendEnv -Value $envContent -NoNewline
        Write-Host "  OK - CORS updated!" -ForegroundColor Green
        Write-Host "  IMPORTANT - Backend must be restarted!" -ForegroundColor Red
    }
} else {
    Write-Host "  WARNING - Backend .env not found" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SOLUTION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The loop is caused by /auth/me endpoint failing." -ForegroundColor Yellow
Write-Host ""
Write-Host "1. RESTART BACKEND (REQUIRED if CORS was updated)" -ForegroundColor Yellow
Write-Host "   In Laragon Terminal:" -ForegroundColor Cyan
Write-Host "     cd C:\laragon\www\Rent_V2_Backend" -ForegroundColor Gray
Write-Host "     php artisan serve --host=0.0.0.0 --port=8000" -ForegroundColor Gray
Write-Host ""
Write-Host "2. CLEAR BROWSER STORAGE (on phone)" -ForegroundColor Yellow
Write-Host "   - Clear localStorage" -ForegroundColor Gray
Write-Host "   - Or use incognito/private mode" -ForegroundColor Gray
Write-Host ""
Write-Host "3. TRY LOGIN AGAIN" -ForegroundColor Yellow
Write-Host "   Go to: http://$ip:3000/login" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""

