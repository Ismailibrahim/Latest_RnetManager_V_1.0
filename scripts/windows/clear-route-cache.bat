@echo off
echo Clearing Laravel route cache...
echo.

cd /d "%~dp0backend"

if not exist "vendor\autoload.php" (
    echo ERROR: vendor folder not found!
    echo Please run: composer install
    pause
    exit /b 1
)

echo Running route:clear...
php artisan route:clear

echo Running config:clear...
php artisan config:clear

echo Running cache:clear...
php artisan cache:clear

echo.
echo Cache cleared successfully!
echo Please restart Laragon or your Laravel server.
echo.
pause

