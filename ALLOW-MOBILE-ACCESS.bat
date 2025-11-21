@echo off
echo ========================================
echo   Configuring Firewall for Mobile Access
echo ========================================
echo.
echo This will allow your phone to access the servers.
echo You need to run this as Administrator!
echo.
pause

REM Check for admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo.
echo Adding firewall rules...
echo.

REM Add rule for Next.js (port 3000)
netsh advfirewall firewall delete rule name="Next.js Dev Server" >nul 2>&1
netsh advfirewall firewall add rule name="Next.js Dev Server" dir=in action=allow protocol=TCP localport=3000
if %errorLevel% equ 0 (
    echo [OK] Port 3000 (Frontend) allowed
) else (
    echo [ERROR] Failed to allow port 3000
)

REM Add rule for Laravel (port 8000)
netsh advfirewall firewall delete rule name="Laravel Backend" >nul 2>&1
netsh advfirewall firewall add rule name="Laravel Backend" dir=in action=allow protocol=TCP localport=8000
if %errorLevel% equ 0 (
    echo [OK] Port 8000 (Backend) allowed
) else (
    echo [ERROR] Failed to allow port 8000
)

echo.
echo ========================================
echo   Firewall Configuration Complete!
echo ========================================
echo.
echo You can now access your app from your phone.
echo Make sure to use START-SERVERS-NETWORK.bat to start servers.
echo.
pause

