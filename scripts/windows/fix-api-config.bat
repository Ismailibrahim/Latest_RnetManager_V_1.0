@echo off
echo ========================================
echo   Fixing API Configuration
echo ========================================
echo.

set BACKEND_ENV=C:\laragon\www\Rent_V2_Backend\.env

if not exist "%BACKEND_ENV%" (
    echo ERROR: Backend .env file not found!
    pause
    exit /b 1
)

echo Current CORS configuration:
findstr /C:"CORS_ALLOWED_ORIGINS" "%BACKEND_ENV%"
echo.
echo Current FRONTEND_URL:
findstr /C:"FRONTEND_URL" "%BACKEND_ENV%" | findstr /V "#"
echo.
echo Current SANCTUM_STATEFUL_DOMAINS:
findstr /C:"SANCTUM_STATEFUL_DOMAINS" "%BACKEND_ENV%" | findstr /V "#"
echo.

echo Updating configuration...
echo.

REM Use PowerShell to update the file
powershell -Command "$envPath = '%BACKEND_ENV%'; $content = Get-Content $envPath; $newContent = $content | ForEach-Object { if ($_ -match '^CORS_ALLOWED_ORIGINS=') { 'CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost,http://127.0.0.1' } elseif ($_ -match '^FRONTEND_URL=' -and $_ -notmatch '#') { 'FRONTEND_URL=http://localhost:3000' } elseif ($_ -match '^SANCTUM_STATEFUL_DOMAINS=') { 'SANCTUM_STATEFUL_DOMAINS=localhost,localhost:3000,127.0.0.1,127.0.0.1:8000' } else { $_ } }; Set-Content -Path $envPath -Value $newContent"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Configuration updated successfully!
    echo.
    echo Updated CORS configuration:
    findstr /C:"CORS_ALLOWED_ORIGINS" "%BACKEND_ENV%"
    echo.
    echo Updated FRONTEND_URL:
    findstr /C:"FRONTEND_URL" "%BACKEND_ENV%" | findstr /V "#"
    echo.
    echo Updated SANCTUM_STATEFUL_DOMAINS:
    findstr /C:"SANCTUM_STATEFUL_DOMAINS" "%BACKEND_ENV%" | findstr /V "#"
    echo.
    echo.
    echo ⚠️ IMPORTANT: Restart the backend server for changes to take effect!
    echo   1. Press Ctrl+C in the backend server terminal
    echo   2. Run: php artisan serve
    echo.
) else (
    echo.
    echo ✗ Failed to update configuration
    echo.
)

pause

