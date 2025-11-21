@echo off
echo Starting Laravel Backend Server...
echo.

REM Change to backend directory
cd /d "%~dp0backend"

REM Check if vendor folder exists
if not exist "vendor\autoload.php" (
    echo ERROR: vendor folder not found!
    echo Please run: composer install
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Please create .env file from .env.example
)

echo.
echo Starting Laravel development server on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

REM Start Laravel server
php artisan serve --host=0.0.0.0 --port=8000

pause

