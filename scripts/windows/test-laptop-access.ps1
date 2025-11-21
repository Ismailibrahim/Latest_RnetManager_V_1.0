# Test Access from Laptop
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Testing Access from Laptop" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ip = "192.168.1.225"
$frontendUrl = "http://$ip:3000"
$backendUrl = "http://$ip:8000/api/v1"

# Test Frontend
Write-Host "[1] Testing Frontend ($frontendUrl)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $frontendUrl -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  SUCCESS - Frontend is accessible!" -ForegroundColor Green
    Write-Host "  Status Code: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host "  Content Length: $($response.Content.Length) bytes" -ForegroundColor Gray
} catch {
    Write-Host "  FAILED - Cannot access frontend" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# Test Backend API
Write-Host "[2] Testing Backend API ($backendUrl)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $backendUrl -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  SUCCESS - Backend API is accessible!" -ForegroundColor Green
    Write-Host "  Status Code: $($response.StatusCode)" -ForegroundColor Gray
    $content = $response.Content
    if ($content.Length -gt 200) {
        $content = $content.Substring(0, 200) + "..."
    }
    Write-Host "  Response: $content" -ForegroundColor Gray
} catch {
    Write-Host "  FAILED - Cannot access backend API" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# Check Server Status
Write-Host "[3] Server Status:" -ForegroundColor Yellow
$frontend = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
$backend = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue

if ($frontend) {
    $fAddr = ($frontend | Select-Object -First 1).LocalAddress
    Write-Host "  Frontend: Running on $fAddr:3000" -ForegroundColor Green
} else {
    Write-Host "  Frontend: NOT running" -ForegroundColor Red
}

if ($backend) {
    $bAddr = ($backend | Select-Object -First 1).LocalAddress
    if ($bAddr -eq "0.0.0.0" -or $bAddr -eq "::") {
        Write-Host "  Backend: Running on $bAddr:8000 (Network accessible)" -ForegroundColor Green
    } else {
        Write-Host "  Backend: Running on $bAddr:8000 (May not be network accessible)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Backend: NOT running" -ForegroundColor Red
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test URLs for Browser" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Open these in your browser:" -ForegroundColor Yellow
Write-Host "  Frontend: $frontendUrl" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "  Backend:  $backendUrl" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Write-Host "If both work in browser, they should work on your phone too!" -ForegroundColor Green
Write-Host ""

