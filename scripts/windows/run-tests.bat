@echo off
REM Run tests using Laragon PHP
echo Setting up Laragon PHP path...
set PHP_PATH=C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64
set PATH=%PHP_PATH%;%PATH%

cd backend

echo Checking dependencies...
if not exist "vendor\autoload.php" (
    echo Installing dependencies...
    composer install --no-interaction --prefer-dist
    if errorlevel 1 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
)

echo Running Property API tests...
php artisan test --filter PropertyApiTest

echo.
echo Running Unit API tests...
php artisan test --filter UnitApiTest

echo.
echo Running Tenant API tests...
php artisan test --filter TenantApiTest

echo.
echo All tests completed!
pause

