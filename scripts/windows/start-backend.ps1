# Start Laravel Backend Server
# Run this script in PowerShell or double-click it

Write-Host "Starting Laravel Backend Server..." -ForegroundColor Green
Write-Host ""

# Try to find PHP in Laragon
$phpPaths = @(
    "C:\laragon\bin\php\php-8.3\php.exe",
    "C:\laragon\bin\php\php-8.2\php.exe",
    "C:\laragon\bin\php\php-8.1\php.exe",
    "C:\laragon\bin\php\php-8.0\php.exe"
)

$phpPath = $null
foreach ($path in $phpPaths) {
    if (Test-Path $path) {
        $phpPath = $path
        Write-Host "Found PHP at: $path" -ForegroundColor Cyan
        break
    }
}

# If not found, try to find PHP in PATH
if (-not $phpPath) {
    try {
        $phpPath = (Get-Command php -ErrorAction Stop).Source
        Write-Host "Found PHP in PATH: $phpPath" -ForegroundColor Cyan
    } catch {
        Write-Host "ERROR: PHP not found!" -ForegroundColor Red
        Write-Host "Please start this from Laragon Terminal or ensure PHP is in your PATH." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To start manually:" -ForegroundColor Yellow
        Write-Host "1. Open Laragon Terminal" -ForegroundColor Yellow
        Write-Host "2. Run: cd D:\Sandbox\Rent_V2\backend" -ForegroundColor Yellow
        Write-Host "3. Run: php artisan serve" -ForegroundColor Yellow
        pause
        exit
    }
}

# Check if backend directory exists
$backendDir = "D:\Sandbox\Rent_V2\backend"
if (-not (Test-Path $backendDir)) {
    $backendDir = "C:\laragon\www\Rent_V2_Backend"
    if (-not (Test-Path $backendDir)) {
        Write-Host "ERROR: Backend directory not found!" -ForegroundColor Red
        pause
        exit
    }
}

Write-Host "Backend directory: $backendDir" -ForegroundColor Cyan
Write-Host ""

# Change to backend directory and start server
Set-Location $backendDir

Write-Host "Starting Laravel development server on http://localhost:8000..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

& $phpPath artisan serve

