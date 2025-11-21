@echo off
title RentApplication - Start Servers
color 0A

echo ========================================
echo   RentApplication - Starting Servers
echo ========================================
echo.

REM Start Backend Server
echo [1/2] Starting Backend Server (Laravel)...
echo.
start "Backend Server (Laravel)" cmd /k "cd /d C:\laragon\www\Rent_V2_Backend && php artisan serve"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend Server
echo [2/2] Starting Frontend Server (Next.js)...
echo.
start "Frontend Server (Next.js)" cmd /k "cd /d D:\Sandbox\Rent_V2\frontend && npm run dev"

echo.
echo ========================================
echo   Both servers are starting!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Server windows will open separately.
echo Close this window when done.
echo.
timeout /t 5

