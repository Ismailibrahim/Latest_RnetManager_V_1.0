# PowerShell script to start Laravel backend server
Write-Host "Starting Laravel Backend Server..." -ForegroundColor Green
Write-Host ""

# Get the script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $scriptPath "backend"

# Change to backend directory
Set-Location $backendPath

# Check if vendor folder exists
if (-not (Test-Path "vendor\autoload.php")) {
    Write-Host "ERROR: vendor folder not found!" -ForegroundColor Red
    Write-Host "Please run: composer install" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "WARNING: .env file not found!" -ForegroundColor Yellow
    Write-Host "Please create .env file from .env.example" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting Laravel development server on http://localhost:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start Laravel server
php artisan serve --host=0.0.0.0 --port=8000

