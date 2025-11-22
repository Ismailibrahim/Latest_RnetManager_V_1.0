# Restart Server and Test Payments/Collect APIs
Write-Host "=== Restarting Server and Testing Payments/Collect APIs ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop all PHP processes
Write-Host "1. Stopping all PHP processes..." -ForegroundColor Yellow
Get-Process -Name "php" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Write-Host "   ✓ All PHP processes stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Clear all Laravel caches
Write-Host "2. Clearing all Laravel caches..." -ForegroundColor Yellow
# Use PHP from PATH or environment variable, fallback to common Laragon path
$phpPath = $env:PHP_PATH
if (-not $phpPath) {
    # Try to find PHP in PATH
    $phpInPath = Get-Command php -ErrorAction SilentlyContinue
    if ($phpInPath) {
        $phpPath = $phpInPath.Source
    } else {
        # Fallback to Laragon default path (can be overridden via PHP_PATH env var)
        $phpPath = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe"
    }
}
Set-Location $PSScriptRoot

& $phpPath artisan route:clear 2>&1 | Out-Null
& $phpPath artisan config:clear 2>&1 | Out-Null
& $phpPath artisan cache:clear 2>&1 | Out-Null
& $phpPath artisan view:clear 2>&1 | Out-Null
& $phpPath artisan optimize:clear 2>&1 | Out-Null
Remove-Item -Path "bootstrap\cache\*.php" -Force -ErrorAction SilentlyContinue
Write-Host "   ✓ All Laravel caches cleared" -ForegroundColor Green
Write-Host ""

# Step 3: Start the server in background
Write-Host "3. Starting Laravel server..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath $phpPath -ArgumentList "artisan","serve" -WorkingDirectory $PSScriptRoot -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 8
Write-Host "   ✓ Server started (PID: $($serverProcess.Id))" -ForegroundColor Green
Write-Host ""

# Step 4: Test all endpoints
Write-Host "4. Testing API endpoints..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
& $phpPath "$PSScriptRoot\test-payments-collect-apis.php"
Write-Host ""

# Step 5: Summary
Write-Host "=== Server Status ===" -ForegroundColor Cyan
Write-Host "Server is running in background (PID: $($serverProcess.Id))" -ForegroundColor White
$pid = $serverProcess.Id
Write-Host "To stop the server, use: Stop-Process -Id $pid" -ForegroundColor Yellow
Write-Host ""
