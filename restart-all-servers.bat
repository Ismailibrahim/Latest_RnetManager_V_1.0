@echo off
echo ========================================
echo   Restarting All Servers for Mobile
echo ========================================
echo.

REM Stop existing processes
echo [1/3] Stopping existing servers...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM php.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo Done.
echo.

REM Start Backend
echo [2/3] Starting Backend Server...
echo.
cd /d C:\laragon\www\Rent_V2_Backend

REM Find PHP
set PHP_PATH=
for /d %%d in (C:\laragon\bin\php\php-*) do (
    if exist "%%d\php.exe" set PHP_PATH=%%d\php.exe
)

if "%PHP_PATH%"=="" (
    echo ERROR: PHP not found!
    echo Please use Laragon Terminal to start backend:
    echo   cd C:\laragon\www\Rent_V2_Backend
    echo   php artisan serve --host=0.0.0.0 --port=8000
    echo.
) else (
    start "Backend Server (Network)" cmd /k "echo Backend Server - Network Mode && echo Access: http://192.168.1.225:8000 && echo. && "%PHP_PATH%" artisan serve --host=0.0.0.0 --port=8000"
    echo Backend starting in new window...
)
echo.

timeout /t 3 /nobreak >nul

REM Start Frontend
echo [3/3] Starting Frontend Server...
echo.
cd /d D:\Sandbox\Rent_V2\frontend

REM Remove lock file
if exist ".next\dev\lock" del /F /Q ".next\dev\lock" >nul 2>&1

echo Starting Next.js with network access...
echo Frontend will be available at: http://192.168.1.225:3000
echo.
echo Press Ctrl+C to stop
echo.

set HOST=0.0.0.0
call npm run dev

