@echo off
echo ========================================
echo   Fix CORS and Start Backend Server
echo ========================================
echo.

REM Update CORS in backend .env
echo [1/3] Updating CORS configuration...
echo.

set BACKEND_ENV=C:\laragon\www\Rent_V2_Backend\.env

if not exist "%BACKEND_ENV%" (
    echo ERROR: Backend .env file not found at %BACKEND_ENV%
    echo.
    pause
    exit /b 1
)

REM Use PowerShell to update the file properly
powershell -Command "$content = Get-Content '%BACKEND_ENV%'; $newContent = $content | ForEach-Object { if ($_ -match '^CORS_ALLOWED_ORIGINS=') { 'CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost,http://127.0.0.1' } else { $_ } }; Set-Content -Path '%BACKEND_ENV%' -Value $newContent"

if %ERRORLEVEL% EQU 0 (
    echo ✓ CORS configuration updated
) else (
    echo ✗ Failed to update CORS configuration
    echo Continuing anyway...
)

echo.

REM Verify CORS was updated
echo [2/3] Verifying CORS configuration...
findstr /C:"CORS_ALLOWED_ORIGINS" "%BACKEND_ENV%"
echo.

REM Start backend server
echo [3/3] Starting Backend Server...
echo.
echo Opening backend server window...
echo This window will show the server logs.
echo.
echo Server will be available at: http://localhost:8000
echo.
echo Press Ctrl+C in the server window to stop it.
echo.

cd /d "C:\laragon\www\Rent_V2_Backend"
start "Backend Server - Laravel (Port 8000)" cmd /k "php artisan serve"

echo.
echo ========================================
echo   Backend server is starting!
echo ========================================
echo.
echo Wait a few seconds for the server to start...
echo Then refresh your frontend page.
echo.
timeout /t 5

