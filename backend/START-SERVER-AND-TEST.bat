@echo off
echo ========================================
echo Backend Server Setup and Test
echo ========================================
echo.

echo Step 1: Stopping existing PHP processes...
taskkill /F /IM php.exe 2>nul
timeout /t 2 /nobreak >nul
echo.

echo Step 2: Clearing all caches...
cd /d "%~dp0"
REM Use PHP from PATH or set PHP_PATH environment variable
where php >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set PHP_CMD=php
) else (
    if defined PHP_PATH (
        set PHP_CMD=%PHP_PATH%
    ) else (
        set PHP_CMD=C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe
    )
)
%PHP_CMD% artisan route:clear
%PHP_CMD% artisan config:clear
%PHP_CMD% artisan cache:clear
%PHP_CMD% artisan optimize:clear
echo.

echo Step 3: Deleting cache files...
del /F /Q bootstrap\cache\*.php 2>nul
rmdir /S /Q storage\framework\cache 2>nul
echo.

echo Step 4: Starting server...
echo Server will start in a new window.
echo Keep it running and then run test-all-endpoints.php in another terminal.
echo.
start "Laravel Server" %PHP_CMD% artisan serve

timeout /t 5 /nobreak >nul

echo.
echo Step 5: Running API tests...
%PHP_CMD% test-all-endpoints.php

echo.
echo ========================================
echo Done! Check results above.
echo ========================================
pause

