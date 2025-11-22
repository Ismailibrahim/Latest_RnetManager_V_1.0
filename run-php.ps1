# Helper script to run PHP commands
# Usage: .\run-php.ps1 artisan migrate:fresh

$phpPath = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe"

if (Test-Path $phpPath) {
    & $phpPath $args
} else {
    Write-Error "PHP not found at: $phpPath"
    exit 1
}

