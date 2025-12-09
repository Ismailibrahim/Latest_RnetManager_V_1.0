@echo off
echo Starting Laravel Backend Server...
echo.
cd /d %~dp0
php artisan serve --host=127.0.0.1 --port=8000
pause
