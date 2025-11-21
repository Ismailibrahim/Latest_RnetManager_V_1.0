@echo off
echo ========================================
echo Restarting Rent V2 Servers
echo ========================================
echo.

set "BACKEND_PATH=D:\Sandbox\Rent_V2\backend"
set "FRONTEND_PATH=D:\Sandbox\Rent_V2\frontend"

REM Check if paths exist
if not exist "%BACKEND_PATH%" (
    echo ERROR: Backend path not found: %BACKEND_PATH%
    pause
    exit /b 1
)

if not exist "%FRONTEND_PATH%" (
    echo ERROR: Frontend path not found: %FRONTEND_PATH%
    pause
    exit /b 1
)

echo 1. Clearing Laravel caches...
cd "%BACKEND_PATH%"

REM Find PHP executable
set "PHP_EXE=php"
if exist "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe" (
    set "PHP_EXE=C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe"
) else if exist "C:\laragon\bin\php\php-8.3\php.exe" (
    set "PHP_EXE=C:\laragon\bin\php\php-8.3\php.exe"
) else if exist "C:\laragon\bin\php\php-8.2\php.exe" (
    set "PHP_EXE=C:\laragon\bin\php\php-8.2\php.exe"
)

echo    Using PHP: %PHP_EXE%

REM Clear caches
call "%PHP_EXE%" artisan config:clear >nul 2>&1
call "%PHP_EXE%" artisan cache:clear >nul 2>&1
call "%PHP_EXE%" artisan route:clear >nul 2>&1
call "%PHP_EXE%" artisan view:clear >nul 2>&1

echo    Caches cleared
echo.

echo 2. Backend (Laravel) should be running via Laragon
echo    Backend URL: http://localhost:8000
echo    If not running, start it in Laragon
echo.

echo 3. Starting Frontend (Next.js)...
cd "%FRONTEND_PATH%"

REM Check if node_modules exists
if not exist "node_modules" (
    echo    Installing dependencies...
    call npm install
)

echo    Starting Next.js development server...
echo    Frontend URL: http://localhost:3000
echo.
echo    Press Ctrl+C to stop the frontend server
echo.

REM Start Next.js
call npm run dev

