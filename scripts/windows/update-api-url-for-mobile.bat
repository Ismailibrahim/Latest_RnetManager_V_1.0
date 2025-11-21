@echo off
echo ========================================
echo   Updating API URL for Mobile Access
echo ========================================
echo.

REM Get IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr "192.168"') do (
    set LOCAL_IP=%%a
    set LOCAL_IP=!LOCAL_IP:~1!
    goto :found_ip
)
:found_ip

echo Your IP Address: %LOCAL_IP%
echo.

set "ENV_FILE=frontend\.env.local"
set "NEW_API_URL=http://%LOCAL_IP%:8000/api/v1"

echo Updating %ENV_FILE%...
echo.

REM Check if file exists
if not exist "%ENV_FILE%" (
    echo Creating new .env.local file...
    (
        echo # API URL for mobile access
        echo NEXT_PUBLIC_API_URL=%NEW_API_URL%
    ) > "%ENV_FILE%"
    echo ✓ File created!
) else (
    echo File exists. Updating API URL...
    
    REM Create temp file with updated content
    (
        for /f "usebackq delims=" %%a in ("%ENV_FILE%") do (
            set "line=%%a"
            setlocal enabledelayedexpansion
            if "!line!"=="NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" (
                echo NEXT_PUBLIC_API_URL=%NEW_API_URL%
            ) else if "!line!"=="NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1" (
                echo NEXT_PUBLIC_API_URL=%NEW_API_URL%
            ) else (
                echo !line!
            )
            endlocal
        )
    ) > "%ENV_FILE%.tmp"
    
    REM Replace original with updated
    move /y "%ENV_FILE%.tmp" "%ENV_FILE%" >nul
    echo ✓ File updated!
)

echo.
echo ========================================
echo   Update Complete!
echo ========================================
echo.
echo API URL set to: %NEW_API_URL%
echo.
echo IMPORTANT: You must restart the frontend server!
echo.
echo 1. Stop current server (Ctrl+C)
echo 2. Restart: cd frontend ^&^& npm run dev
echo.
pause

