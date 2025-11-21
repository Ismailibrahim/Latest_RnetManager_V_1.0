# Start Both Servers Script for Laragon
# This script starts the backend (Laravel) and frontend (Next.js) servers

Write-Host "Starting Rent V2 Application Servers..." -ForegroundColor Cyan
Write-Host ""

# Check if Laragon is running
$laragonRunning = Get-Process -Name "laragon" -ErrorAction SilentlyContinue
if (-not $laragonRunning) {
    Write-Host "WARNING: Laragon is not running. Please start Laragon first!" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Laragon is running" -ForegroundColor Green
Write-Host ""

# Start Backend (Laravel) - Laragon should handle this
Write-Host "Backend (Laravel) should be running via Laragon" -ForegroundColor Cyan
Write-Host "Backend URL: http://localhost:8000" -ForegroundColor Gray
Write-Host ""

# Start Frontend (Next.js)
Write-Host "Starting Frontend (Next.js)..." -ForegroundColor Cyan

$frontendPath = "D:\Sandbox\Rent_V2\frontend"
if (-not (Test-Path $frontendPath)) {
    Write-Host "ERROR: Frontend directory not found at: $frontendPath" -ForegroundColor Red
    exit 1
}

Set-Location $frontendPath

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting Next.js development server..." -ForegroundColor Green
Write-Host "Frontend URL: http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop the frontend server" -ForegroundColor Yellow
Write-Host ""

# Start Next.js in development mode
npm run dev
