# Comprehensive Backend Server Clean and Fix Script
Write-Host "=== Backend Server Clean and Fix ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop all PHP processes
Write-Host "1. Stopping all PHP processes..." -ForegroundColor Yellow
Get-Process -Name "php" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "   ✓ All PHP processes stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Clear all Laravel caches
Write-Host "2. Clearing all Laravel caches..." -ForegroundColor Yellow
$phpPath = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe"
Set-Location $PSScriptRoot

& $phpPath artisan route:clear 2>&1 | Out-Null
& $phpPath artisan config:clear 2>&1 | Out-Null
& $phpPath artisan cache:clear 2>&1 | Out-Null
& $phpPath artisan view:clear 2>&1 | Out-Null
& $phpPath artisan optimize:clear 2>&1 | Out-Null
Write-Host "   ✓ All Laravel caches cleared" -ForegroundColor Green
Write-Host ""

# Step 3: Delete all cache files manually
Write-Host "3. Deleting cache files..." -ForegroundColor Yellow
Remove-Item -Path "bootstrap\cache\*.php" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "storage\framework\cache\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "storage\framework\views\*.php" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "storage\framework\sessions\*" -Force -ErrorAction SilentlyContinue
Write-Host "   ✓ All cache files deleted" -ForegroundColor Green
Write-Host ""

# Step 4: Verify routes file syntax
Write-Host "4. Verifying routes file syntax..." -ForegroundColor Yellow
$syntaxCheck = & $phpPath -l routes\api.php 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ routes/api.php syntax is valid" -ForegroundColor Green
} else {
    Write-Host "   ✗ Syntax error in routes/api.php:" -ForegroundColor Red
    Write-Host $syntaxCheck
    exit 1
}
Write-Host ""

Write-Host "=== Server Ready ===" -ForegroundColor Green
Write-Host "All caches cleared and server is ready to start." -ForegroundColor White
Write-Host ""
Write-Host "To start the server, run:" -ForegroundColor Cyan
Write-Host "  php artisan serve" -ForegroundColor White
Write-Host ""
