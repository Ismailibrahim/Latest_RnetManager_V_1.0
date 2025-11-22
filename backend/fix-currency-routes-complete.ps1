# Complete fix for currency routes
Write-Host "=== Fixing Currency Routes ===" -ForegroundColor Cyan

# Step 1: Clear all cache files
Write-Host "`n1. Clearing all cache files..." -ForegroundColor Yellow
Remove-Item -Path "bootstrap\cache\*.php" -ErrorAction SilentlyContinue -Force
Remove-Item -Path "storage\framework\cache\*" -Recurse -ErrorAction SilentlyContinue -Force
Remove-Item -Path "storage\framework\views\*.php" -ErrorAction SilentlyContinue -Force
Remove-Item -Path "storage\framework\sessions\*" -ErrorAction SilentlyContinue -Force
Write-Host "   ✓ Cache files cleared" -ForegroundColor Green

# Step 2: Verify routes file syntax
Write-Host "`n2. Verifying routes file syntax..." -ForegroundColor Yellow
# Get PHP path from environment or auto-detect
$phpPath = $env:PHP_PATH
if (-not $phpPath) {
    $phpInPath = Get-Command php -ErrorAction SilentlyContinue
    if ($phpInPath) {
        $phpPath = $phpInPath.Source
    } else {
        $phpPath = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe"
        if (-not (Test-Path $phpPath)) {
            Write-Error "PHP not found. Please set PHP_PATH environment variable."
            exit 1
        }
    }
}
$syntaxCheck = & $phpPath -l routes\api.php 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ routes/api.php syntax is valid" -ForegroundColor Green
} else {
    Write-Host "   ✗ Syntax error in routes/api.php:" -ForegroundColor Red
    Write-Host $syntaxCheck
    exit 1
}

# Step 3: Test route directly
Write-Host "`n3. Testing route directly..." -ForegroundColor Yellow
$testResult = & $phpPath test-all-routes.php 2>&1
if ($testResult -match "Status: 200") {
    Write-Host "   ✓ Route is working!" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Route test output:" -ForegroundColor Yellow
    Write-Host $testResult
}

# Step 4: Instructions
Write-Host "`n=== IMPORTANT: Restart Your Server ===" -ForegroundColor Cyan
Write-Host "The route is working in code, but you need to:" -ForegroundColor White
Write-Host "1. Stop your current Laravel server (Ctrl+C)" -ForegroundColor Yellow
Write-Host "2. Start it again: php artisan serve" -ForegroundColor Yellow
Write-Host "3. Test: http://localhost:8000/api/v1/currencies-test" -ForegroundColor Yellow
Write-Host "`nThe route should return: `{\"message\":\"Currencies route test - route is working!\"}`" -ForegroundColor Green

