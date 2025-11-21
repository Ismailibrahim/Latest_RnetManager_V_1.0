# Start Servers with Network Access (PowerShell Version)
# This allows access from your phone on the same Wi-Fi network

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Rent V2 Servers (Network Mode)" -ForegroundColor Cyan
Write-Host "  This allows access from your phone!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get local IP address
Write-Host "Finding your laptop's IP address..." -ForegroundColor Yellow
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

if (-not $ipAddress) {
    Write-Host "ERROR: Could not find IP address!" -ForegroundColor Red
    Write-Host "Make sure you're connected to Wi-Fi." -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host ""
Write-Host "Your laptop IP address: $ipAddress" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend will be available at: http://$ipAddress:3000" -ForegroundColor Cyan
Write-Host "Backend will be available at: http://$ipAddress:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Make sure your phone is on the same Wi-Fi network!" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to continue"

# Check if Laragon is running
$laragonRunning = Get-Process -Name "laragon" -ErrorAction SilentlyContinue
if (-not $laragonRunning) {
    Write-Host "WARNING: Laragon may not be running. Please start Laragon first!" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "Backend (Laravel) should be running via Laragon" -ForegroundColor Cyan
Write-Host "Starting backend with network access..." -ForegroundColor Cyan
Write-Host ""

# Start Backend with network binding
$backendPath = "C:\laragon\www\Rent_V2_Backend"
if (Test-Path $backendPath) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Backend Server - Network Mode' -ForegroundColor Green; Write-Host 'Access at: http://$ipAddress:8000' -ForegroundColor Cyan; Write-Host ''; php artisan serve --host=0.0.0.0 --port=8000"
    Start-Sleep -Seconds 3
} else {
    Write-Host "WARNING: Backend path not found at: $backendPath" -ForegroundColor Yellow
    Write-Host "Please start backend manually with: php artisan serve --host=0.0.0.0" -ForegroundColor Yellow
}

# Start Frontend
Write-Host "Starting Frontend (Next.js) with network access..." -ForegroundColor Cyan
$frontendPath = "D:\Sandbox\Rent_V2\frontend"

if (-not (Test-Path $frontendPath)) {
    Write-Host "ERROR: Frontend directory not found at: $frontendPath" -ForegroundColor Red
    pause
    exit 1
}

Set-Location $frontendPath

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "Starting Next.js development server (Network Mode)..." -ForegroundColor Green
Write-Host "Frontend URL (Local): http://localhost:3000" -ForegroundColor Gray
Write-Host "Frontend URL (Network): http://$ipAddress:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Use the Network URL on your phone!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start Next.js with network binding
$env:HOST = "0.0.0.0"
npm run dev

