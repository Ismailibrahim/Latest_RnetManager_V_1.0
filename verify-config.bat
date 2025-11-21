@echo off
echo ========================================
echo   Verifying Configuration
echo ========================================
echo.

echo [1/4] Frontend API URL:
findstr /C:"NEXT_PUBLIC_API_URL=http://192.168.1.225:8000/api/v1" frontend\.env.local >nul
if %ERRORLEVEL% EQU 0 (
    echo   OK - Correct
) else (
    echo   ERROR - Needs fix
)
echo.

echo [2/4] Backend CORS:
findstr /C:"192.168.1.225" "C:\laragon\www\Rent_V2_Backend\.env" >nul
if %ERRORLEVEL% EQU 0 (
    echo   OK - Includes IP
) else (
    echo   ERROR - Missing IP
)
echo.

echo [3/4] Backend Server:
netstat -ano | findstr ":8000" | findstr "LISTENING" | findstr "0.0.0.0" >nul
if %ERRORLEVEL% EQU 0 (
    echo   OK - Running on network
) else (
    echo   Checking...
    netstat -ano | findstr ":8000" | findstr "LISTENING" >nul
    if %ERRORLEVEL% EQU 0 (
        echo   WARNING - May not be network accessible
    ) else (
        echo   ERROR - Not running
    )
)
echo.

echo [4/4] Frontend Server:
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %ERRORLEVEL% EQU 0 (
    echo   OK - Running
) else (
    echo   Starting...
)
echo.

echo ========================================
echo   Configuration Summary
echo ========================================
echo.
echo   Frontend API URL: http://192.168.1.225:8000/api/v1
echo   Backend CORS: Includes 192.168.1.225
echo.
echo   On your phone, go to:
echo     http://192.168.1.225:3000/login
echo.
pause

