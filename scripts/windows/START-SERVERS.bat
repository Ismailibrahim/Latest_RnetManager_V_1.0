@echo off
echo Starting Rent V2 Application Servers...
echo.

REM Check if Laragon is running (basic check)
tasklist /FI "IMAGENAME eq laragon.exe" 2>NUL | find /I /N "laragon.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Laragon is running
) else (
    echo WARNING: Laragon may not be running. Please start Laragon first!
    echo.
)

echo.
echo Backend (Laravel) should be running via Laragon
echo Backend URL: http://localhost:8000
echo.

REM Start Frontend
echo Starting Frontend (Next.js)...
cd /d "D:\Sandbox\Rent_V2\frontend"

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo.
echo Starting Next.js development server...
echo Frontend URL: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev
