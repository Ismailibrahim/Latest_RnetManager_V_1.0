@echo off
echo Testing CORS Configuration...
echo.

cd /d %~dp0

REM Try to find PHP in common Laragon locations
set PHP_PATH=
if exist "C:\laragon\bin\php\php-8.3.0\php.exe" set PHP_PATH=C:\laragon\bin\php\php-8.3.0\php.exe
if exist "C:\laragon\bin\php\php-8.2.0\php.exe" set PHP_PATH=C:\laragon\bin\php\php-8.2.0\php.exe
if exist "C:\laragon\bin\php\php-8.1.0\php.exe" set PHP_PATH=C:\laragon\bin\php\php-8.1.0\php.exe

if "%PHP_PATH%"=="" (
    echo Trying to use PHP from PATH...
    where php >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        php test-cors-now.php
    ) else (
        echo.
        echo ERROR: Could not find PHP!
        echo.
        echo Please run this from Laragon terminal, or manually run:
        echo   cd backend
        echo   php test-cors-now.php
        echo.
        pause
        exit /b 1
    )
) else (
    echo Using PHP from: %PHP_PATH%
    "%PHP_PATH%" test-cors-now.php
)

echo.
pause

