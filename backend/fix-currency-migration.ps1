# PowerShell script to fix currency migration
# This script finds PHP and runs the fix

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FIXING CURRENCY MIGRATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Try to find PHP
$phpPath = $null

# Check common PHP locations
$phpLocations = @(
    "php",
    "C:\php\php.exe",
    "C:\xampp\php\php.exe",
    "C:\wamp\bin\php\php*\php.exe",
    "C:\laragon\bin\php\php*\php.exe",
    "$env:ProgramFiles\PHP\php.exe",
    "$env:ProgramFiles(x86)\PHP\php.exe"
)

foreach ($location in $phpLocations) {
    try {
        if ($location -like "*\*") {
            # Handle wildcards
            $found = Get-ChildItem -Path $location -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) {
                $phpPath = $found.FullName
                break
            }
        } else {
            $result = Get-Command $location -ErrorAction SilentlyContinue
            if ($result) {
                $phpPath = $result.Source
                break
            }
        }
    } catch {
        continue
    }
}

if (-not $phpPath) {
    Write-Host "ERROR: PHP not found!" -ForegroundColor Red
    Write-Host "Please ensure PHP is installed and in your PATH, or" -ForegroundColor Yellow
    Write-Host "run this using artisan instead:" -ForegroundColor Yellow
    Write-Host "  php artisan migrate --path=database/migrations/2025_01_21_000000_add_currency_fields_to_units_table.php" -ForegroundColor Green
    exit 1
}

Write-Host "Found PHP at: $phpPath" -ForegroundColor Green
Write-Host ""

# Run the fix script
& $phpPath fix-migration-properly.php

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Fix completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Fix completed with warnings." -ForegroundColor Yellow
    Write-Host "Check the output above for details." -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
}
