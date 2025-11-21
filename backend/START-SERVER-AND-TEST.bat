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
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan route:clear
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan config:clear
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan cache:clear
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan optimize:clear
echo.

echo Step 3: Deleting cache files...
del /F /Q bootstrap\cache\*.php 2>nul
rmdir /S /Q storage\framework\cache 2>nul
echo.

echo Step 4: Starting server...
echo Server will start in a new window.
echo Keep it running and then run test-all-endpoints.php in another terminal.
echo.
start "Laravel Server" C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan serve

timeout /t 5 /nobreak >nul

echo.
echo Step 5: Running API tests...
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe test-all-endpoints.php

echo.
echo ========================================
echo Done! Check results above.
echo ========================================
pause

