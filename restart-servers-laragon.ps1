# Restart Servers for Laragon
# This script restarts both backend and frontend servers

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Restarting Rent V2 Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Backend path
$backendPath = "D:\Sandbox\Rent_V2\backend"
$frontendPath = "D:\Sandbox\Rent_V2\frontend"

# Check if paths exist
if (-not (Test-Path $backendPath)) {
    Write-Host "ERROR: Backend path not found: $backendPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "ERROR: Frontend path not found: $frontendPath" -ForegroundColor Red
    exit 1
}

Write-Host "1. Clearing Laravel caches..." -ForegroundColor Yellow
Set-Location $backendPath

# Find PHP executable
$phpExe = $null
if (Test-Path "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe") {
    $phpExe = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe"
} elseif (Test-Path "C:\laragon\bin\php\php-8.3\php.exe") {
    $phpExe = "C:\laragon\bin\php\php-8.3\php.exe"
} elseif (Test-Path "C:\laragon\bin\php\php-8.2\php.exe") {
    $phpExe = "C:\laragon\bin\php\php-8.2\php.exe"
} else {
    $phpExe = "php"
}

Write-Host "   Using PHP: $phpExe" -ForegroundColor Gray

# Clear caches
& $phpExe artisan config:clear 2>&1 | Out-Null
& $phpExe artisan cache:clear 2>&1 | Out-Null
& $phpExe artisan route:clear 2>&1 | Out-Null
& $phpExe artisan view:clear 2>&1 | Out-Null

Write-Host "   ✅ Caches cleared" -ForegroundColor Green
Write-Host ""

Write-Host "2. Backend (Laravel) should be running via Laragon" -ForegroundColor Yellow
Write-Host "   Backend URL: http://localhost:8000" -ForegroundColor Gray
Write-Host "   If not running, start it in Laragon or run:" -ForegroundColor Gray
Write-Host "   cd $backendPath" -ForegroundColor Cyan
Write-Host "   $phpExe artisan serve" -ForegroundColor Cyan
Write-Host ""

Write-Host "3. Starting Frontend (Next.js)..." -ForegroundColor Yellow
Set-Location $frontendPath

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "   Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "   Starting Next.js development server..." -ForegroundColor Green
Write-Host "   Frontend URL: http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "   Press Ctrl+C to stop the frontend server" -ForegroundColor Yellow
Write-Host ""

# Start Next.js
npm run dev

