@echo off
setlocal enabledelayedexpansion
echo ========================================
echo   Finding Your Laptop's IP Address
echo ========================================
echo.
echo This is the IP address you need to access
echo your app from your phone:
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set LOCAL_IP=%%a
    set LOCAL_IP=!LOCAL_IP:~1!
    echo.
    echo Your IP Address: !LOCAL_IP!
    echo.
    echo Frontend URL: http://!LOCAL_IP!:3000
    echo Backend URL: http://!LOCAL_IP!:8000
    echo.
    goto :found
)

:found
echo ========================================
echo.
echo Copy this IP address and use it on your phone!
echo Make sure both devices are on the same Wi-Fi.
echo.
pause

