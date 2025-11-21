@echo off
setlocal enabledelayedexpansion
echo ========================================
echo   Starting Rent V2 Servers (Network Mode)
echo   This allows access from your phone!
echo ========================================
echo.

REM Get local IP address
echo Finding your laptop's IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set LOCAL_IP=%%a
    set LOCAL_IP=!LOCAL_IP:~1!
    goto :found_ip
)
:found_ip

echo.
echo Your laptop IP address: !LOCAL_IP!
echo.
echo Frontend will be available at: http://!LOCAL_IP!:3000
echo Backend will be available at: http://!LOCAL_IP!:8000
echo.
echo Make sure your phone is on the same Wi-Fi network!
echo.
pause

REM Check if Laragon is running
tasklist /FI "IMAGENAME eq laragon.exe" 2>NUL | find /I /N "laragon.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Laragon is running
) else (
    echo WARNING: Laragon may not be running. Please start Laragon first!
    echo.
)

echo.
echo Backend (Laravel) should be running via Laragon
echo Starting backend with network access...
echo.

REM Start Backend with network binding
start "Backend Server (Network)" cmd /k "cd /d C:\laragon\www\Rent_V2_Backend && echo Backend Server - Network Mode && echo. && php artisan serve --host=0.0.0.0 --port=8000"

timeout /t 3 /nobreak >nul

REM Start Frontend
echo Starting Frontend (Next.js) with network access...
cd /d "D:\Sandbox\Rent_V2\frontend"

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo.
echo Starting Next.js development server (Network Mode)...
echo Frontend URL (Local): http://localhost:3000
echo Frontend URL (Network): http://!LOCAL_IP!:3000
echo.
echo Use the Network URL on your phone!
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start Next.js with network binding
call npm run dev -- -H 0.0.0.0

