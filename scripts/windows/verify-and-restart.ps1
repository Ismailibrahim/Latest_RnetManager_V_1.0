# Verify and Restart Frontend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verifying Configuration & Restarting" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ip = "192.168.1.225"
$frontendUrl = "http://$ip:3000"
$backendUrl = "http://$ip:8000/api/v1"

# Step 1: Check Frontend .env.local
Write-Host "[1/5] Checking Frontend Configuration..." -ForegroundColor Yellow
$frontendEnv = "frontend\.env.local"
if (Test-Path $frontendEnv) {
    $content = Get-Content $frontendEnv -Raw
    if ($content -match "NEXT_PUBLIC_API_URL=http://$ip:8000/api/v1") {
        Write-Host "  ✓ Frontend API URL is correct" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Frontend API URL needs update!" -ForegroundColor Red
        Write-Host "  Fixing..." -ForegroundColor Yellow
        $content = $content -replace 'NEXT_PUBLIC_API_URL=.*', "NEXT_PUBLIC_API_URL=http://$ip:8000/api/v1"
        Set-Content -Path $frontendEnv -Value $content -NoNewline
        Write-Host "  ✓ Fixed!" -ForegroundColor Green
    }
} else {
    Write-Host "  ✗ frontend\.env.local not found!" -ForegroundColor Red
    Write-Host "  Creating..." -ForegroundColor Yellow
    $defaultContent = @"
# Application Configuration
NEXT_PUBLIC_APP_NAME=RentApplicaiton
NEXT_PUBLIC_APP_ENV=development

# API Configuration
NEXT_PUBLIC_API_URL=http://$ip:8000/api/v1

# Currency Configuration
NEXT_PUBLIC_PRIMARY_CURRENCY=MVR
NEXT_PUBLIC_SECONDARY_CURRENCY=USD
"@
    Set-Content -Path $frontendEnv -Value $defaultContent
    Write-Host "  ✓ Created!" -ForegroundColor Green
}
Write-Host ""

# Step 2: Check Backend CORS
Write-Host "[2/5] Checking Backend CORS..." -ForegroundColor Yellow
$backendEnv = "C:\laragon\www\Rent_V2_Backend\.env"
if (Test-Path $backendEnv) {
    $content = Get-Content $backendEnv -Raw
    if ($content -match "CORS_ALLOWED_ORIGINS.*$ip") {
        Write-Host "  ✓ Backend CORS includes your IP" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Backend CORS needs update!" -ForegroundColor Red
        Write-Host "  Fixing..." -ForegroundColor Yellow
        if ($content -match "CORS_ALLOWED_ORIGINS=") {
            $content = $content -replace "CORS_ALLOWED_ORIGINS=.*", "CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://$ip:3000"
        } else {
            $content += "`nCORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://$ip:3000`n"
        }
        Set-Content -Path $backendEnv -Value $content -NoNewline
        Write-Host "  ✓ Fixed! (Backend needs restart)" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠ Backend .env not found" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Check Backend Status
Write-Host "[3/5] Checking Backend Server..." -ForegroundColor Yellow
$backend = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($backend) {
    $addr = ($backend | Select-Object -First 1).LocalAddress
    if ($addr -eq "0.0.0.0" -or $addr -eq "::") {
        Write-Host "  ✓ Backend running on network (0.0.0.0:8000)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Backend only on $addr (not network accessible)" -ForegroundColor Red
    }
} else {
    Write-Host "  ✗ Backend NOT running!" -ForegroundColor Red
}
Write-Host ""

# Step 4: Stop Frontend if Running
Write-Host "[4/5] Stopping Frontend Server..." -ForegroundColor Yellow
$frontend = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($frontend) {
    $pid = ($frontend | Select-Object -First 1).OwningProcess
    Write-Host "  Stopping process $pid..." -ForegroundColor Gray
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  ✓ Frontend stopped" -ForegroundColor Green
} else {
    Write-Host "  ✓ Frontend not running" -ForegroundColor Gray
}
Write-Host ""

# Step 5: Start Frontend
Write-Host "[5/5] Starting Frontend Server..." -ForegroundColor Yellow
Write-Host ""
Set-Location "frontend"
$env:HOST = "0.0.0.0"
Write-Host "  Starting Next.js with network access..." -ForegroundColor Cyan
Write-Host "  Frontend URL (Local): http://localhost:3000" -ForegroundColor Gray
Write-Host "  Frontend URL (Network): $frontendUrl" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "  Backend API: $backendUrl" -ForegroundColor Gray
Write-Host ""
Write-Host "  Use the Network URL on your phone!" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; `$env:HOST='0.0.0.0'; Write-Host 'Frontend Server Starting...' -ForegroundColor Green; Write-Host 'Access from phone: $frontendUrl' -ForegroundColor Cyan; npm run dev"

Write-Host "  ✓ Frontend server starting in new window" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  ✓ Frontend API URL: $backendUrl" -ForegroundColor Green
Write-Host "  ✓ Backend CORS: Includes $ip" -ForegroundColor Green
Write-Host "  ✓ Frontend: Starting on 0.0.0.0:3000" -ForegroundColor Green
Write-Host ""
Write-Host "On your phone, go to:" -ForegroundColor Yellow
Write-Host "  $frontendUrl/login" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Write-Host "If backend CORS was updated, restart backend:" -ForegroundColor Yellow
Write-Host "  cd C:\laragon\www\Rent_V2_Backend" -ForegroundColor Gray
Write-Host "  php artisan serve --host=0.0.0.0 --port=8000" -ForegroundColor Gray
Write-Host ""

Set-Location ".."

