@echo off
echo ========================================
echo CORS Configuration Test
echo ========================================
echo.

cd /d %~dp0

echo Checking if PHP is available...
where php >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: PHP is not in PATH!
    echo.
    echo If you're using Laragon, PHP should be at:
    echo C:\laragon\bin\php\php-8.x.x\php.exe
    echo.
    echo Please run this from Laragon terminal, or add PHP to PATH.
    echo.
    pause
    exit /b 1
)

echo PHP found! Running test...
echo.

php test-cors-now.php

echo.
echo ========================================
echo Test Complete
echo ========================================
echo.
pause

