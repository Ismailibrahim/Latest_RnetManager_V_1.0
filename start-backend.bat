@echo off
echo Starting Laravel Backend Server...
echo.

REM Try to find PHP in Laragon
set PHP_PATH=

if exist "C:\laragon\bin\php\php-8.3\php.exe" (
    set PHP_PATH=C:\laragon\bin\php\php-8.3\php.exe
    goto found
)
if exist "C:\laragon\bin\php\php-8.2\php.exe" (
    set PHP_PATH=C:\laragon\bin\php\php-8.2\php.exe
    goto found
)
if exist "C:\laragon\bin\php\php-8.1\php.exe" (
    set PHP_PATH=C:\laragon\bin\php\php-8.1\php.exe
    goto found
)
if exist "C:\laragon\bin\php\php-8.0\php.exe" (
    set PHP_PATH=C:\laragon\bin\php\php-8.0\php.exe
    goto found
)

REM Try PHP from PATH
where php >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set PHP_PATH=php
    goto found
)

echo ERROR: PHP not found!
echo Please start this from Laragon Terminal or ensure PHP is installed.
echo.
echo To start manually:
echo 1. Open Laragon Terminal
echo 2. Run: cd D:\Sandbox\Rent_V2\backend
echo 3. Run: php artisan serve
pause
exit /b 1

:found
echo Found PHP: %PHP_PATH%
echo.

REM Check backend directory
if exist "D:\Sandbox\Rent_V2\backend\artisan" (
    cd /d "D:\Sandbox\Rent_V2\backend"
) else if exist "C:\laragon\www\Rent_V2_Backend\artisan" (
    cd /d "C:\laragon\www\Rent_V2_Backend"
) else (
    echo ERROR: Backend directory not found!
    pause
    exit /b 1
)

echo Backend directory: %CD%
echo.
echo Starting Laravel development server on http://localhost:8000...
echo Press Ctrl+C to stop the server
echo.

%PHP_PATH% artisan serve

pause

