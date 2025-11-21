@echo off
echo ========================================
echo   Testing App on Laptop
echo ========================================
echo.

echo Checking server status...
echo.

REM Check Frontend
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Frontend is running
    echo      Access at: http://localhost:3000
) else (
    echo [ERROR] Frontend is NOT running
    echo         Start it: cd frontend ^&^& npm run dev
)

REM Check Backend
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend is running
    echo      Access at: http://localhost:8000/api/v1
) else (
    echo [ERROR] Backend is NOT running
    echo         Start it: cd C:\laragon\www\Rent_V2_Backend ^&^& php artisan serve --host=0.0.0.0 --port=8000
)

echo.
echo ========================================
echo   Quick Access URLs
echo ========================================
echo.
echo For Laptop Testing:
echo   Frontend: http://localhost:3000
echo   Login:    http://localhost:3000/login
echo   Backend:  http://localhost:8000/api/v1
echo.
echo For Mobile Testing:
echo   Frontend: http://192.168.1.225:3000
echo   Login:    http://192.168.1.225:3000/login
echo.
echo Both work at the same time!
echo.
pause

