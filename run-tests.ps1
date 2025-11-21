# PowerShell script to run tests with Laragon PHP
$phpPath = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe"
$phpDir = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64"

# Add PHP to PATH for this session
$env:PATH = "$phpDir;$env:PATH"

Set-Location "D:\Sandbox\Rent_V2\backend"

# Check if dependencies are installed
if (-not (Test-Path "vendor\autoload.php")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    composer install --no-interaction --prefer-dist
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`nRunning Property API tests..." -ForegroundColor Green
& $phpPath artisan test --filter PropertyApiTest

Write-Host "`nRunning Unit API tests..." -ForegroundColor Green
& $phpPath artisan test --filter UnitApiTest

Write-Host "`nRunning Tenant API tests..." -ForegroundColor Green
& $phpPath artisan test --filter TenantApiTest

Write-Host "`nAll tests completed!" -ForegroundColor Green

