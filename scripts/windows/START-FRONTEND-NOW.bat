@echo off
cd /d "%~dp0frontend"
echo ========================================
echo   Starting Frontend Server
echo ========================================
echo.
echo Access from phone: http://192.168.1.225:3000/login
echo.
set HOST=0.0.0.0
npm run dev

