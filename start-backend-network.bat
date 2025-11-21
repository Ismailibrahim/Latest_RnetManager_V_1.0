@echo off
echo ========================================
echo   Starting Backend with Network Access
echo ========================================
echo.
echo This allows access from your phone!
echo.

cd /d C:\laragon\www\Rent_V2_Backend

REM Find PHP in Laragon
set PHP_PATH=
if exist "C:\laragon\bin\php\php-8.3.0\php.exe" set PHP_PATH=C:\laragon\bin\php\php-8.3.0\php.exe
if exist "C:\laragon\bin\php\php-8.2.0\php.exe" set PHP_PATH=C:\laragon\bin\php\php-8.2.0\php.exe
if exist "C:\laragon\bin\php\php-8.1.0\php.exe" set PHP_PATH=C:\laragon\bin\php\php-8.1.0\php.exe
if exist "C:\laragon\bin\php\php-8.0.0\php.exe" set PHP_PATH=C:\laragon\bin\php\php-8.0.0\php.exe

REM Try to find any PHP version
if "%PHP_PATH%"=="" (
    for /d %%d in (C:\laragon\bin\php\php-*) do (
        if exist "%%d\php.exe" set PHP_PATH=%%d\php.exe
    )
)

if "%PHP_PATH%"=="" (
    echo ERROR: Could not find PHP in Laragon!
    echo.
    echo Please use Laragon Terminal instead:
    echo 1. Open Laragon
    echo 2. Click "Terminal" button (or press Ctrl+Alt+T)
    echo 3. Run: php artisan serve --host=0.0.0.0 --port=8000
    echo.
    pause
    exit /b 1
)

echo Using PHP: %PHP_PATH%
echo.
echo Starting backend server...
echo Backend will be accessible at: http://192.168.1.225:8000
echo.
echo Press Ctrl+C to stop
echo.

"%PHP_PATH%" artisan serve --host=0.0.0.0 --port=8000
