@echo off
echo Starting Laravel Backend Server...
echo.
cd /d "%~dp0backend"
echo Current directory: %CD%
echo.
echo Starting server on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
php artisan serve --host=0.0.0.0 --port=8000
pause
