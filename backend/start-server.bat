@echo off
echo Starting Laravel backend server...
echo.
echo Make sure PHP is in your PATH or run this from Laragon/XAMPP
echo.
cd /d "%~dp0"
php artisan serve
pause

