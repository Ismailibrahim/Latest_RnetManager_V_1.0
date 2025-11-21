@echo off
echo ========================================
echo   Updating Backend CORS Configuration
echo ========================================
echo.

set BACKEND_ENV=C:\laragon\www\Rent_V2_Backend\.env
set IP=192.168.1.225

if not exist "%BACKEND_ENV%" (
    echo ERROR: Backend .env file not found!
    echo Expected location: %BACKEND_ENV%
    echo.
    pause
    exit /b 1
)

echo Updating CORS configuration...
echo Adding: http://%IP%:3000 to allowed origins
echo.

REM Use PowerShell to update the file
powershell -Command "$envPath = '%BACKEND_ENV%'; $content = Get-Content $envPath -Raw; $corsLine = 'CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://%IP%:3000'; if ($content -match 'CORS_ALLOWED_ORIGINS=') { $content = $content -replace 'CORS_ALLOWED_ORIGINS=.*', $corsLine } else { $content += \"`n$corsLine`n\" }; Set-Content -Path $envPath -Value $content -NoNewline"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS - CORS configuration updated!
    echo.
    echo Updated CORS_ALLOWED_ORIGINS:
    findstr /C:"CORS_ALLOWED_ORIGINS" "%BACKEND_ENV%"
    echo.
    echo IMPORTANT: Restart the backend server for changes to take effect!
    echo.
    echo In Laragon Terminal, run:
    echo   cd C:\laragon\www\Rent_V2_Backend
    echo   php artisan serve --host=0.0.0.0 --port=8000
    echo.
) else (
    echo.
    echo ERROR - Failed to update CORS configuration
    echo Please update manually:
    echo.
    echo Open: %BACKEND_ENV%
    echo Add or update: CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://%IP%:3000
    echo.
)

pause

