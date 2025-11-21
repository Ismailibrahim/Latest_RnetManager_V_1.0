@echo off
title Restart Backend Server
color 0A

echo ========================================
echo   Restarting Backend Server
echo ========================================
echo.

REM Find and stop processes on port 8000
echo [1/3] Stopping existing server...
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo Stopping process %%a...
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

REM Check if port is free
netstat -aon | findstr :8000 >nul
if %ERRORLEVEL% EQU 0 (
    echo Warning: Port 8000 still in use. Trying to stop all PHP processes...
    taskkill /F /IM php.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

echo ✓ Server stopped
echo.

REM Start new server
echo [2/3] Starting new server...
echo.

cd /d C:\laragon\www\Rent_V2_Backend

start "Backend Server - Laravel (Port 8000)" cmd /k "cd /d C:\laragon\www\Rent_V2_Backend && echo. && echo === Backend Server === && echo. && php artisan serve"

timeout /t 3 /nobreak >nul

echo [3/3] Verifying server...
echo.

timeout /t 2 /nobreak >nul

curl.exe -s http://localhost:8000/api/v1 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ Backend server restarted successfully!
    echo.
    echo Server URL: http://localhost:8000
    echo API Status: http://localhost:8000/api/v1
    echo.
) else (
    echo Server is starting... may need a few more seconds
    echo Check the server window to see if it's running.
    echo.
)

echo ========================================
echo   Restart Complete
echo ========================================
echo.
echo The backend server window should be open.
echo Keep it open while using the application.
echo.
pause

