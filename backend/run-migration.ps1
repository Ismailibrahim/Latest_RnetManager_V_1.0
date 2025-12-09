# PowerShell script to run Laravel migrations
# Usage: .\run-migration.ps1 [migration-file-name]
# Example: .\run-migration.ps1 2025_01_21_000000_add_currency_fields_to_units_table.php
# Or run all: .\run-migration.ps1

param(
    [string]$MigrationFile = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LARAVEL MIGRATION RUNNER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "artisan")) {
    Write-Host "ERROR: artisan file not found!" -ForegroundColor Red
    Write-Host "Please run this script from the backend directory." -ForegroundColor Yellow
    exit 1
}

# Try to find PHP
$phpFound = $false
$phpCommand = "php"

# Check if php is available
try {
    $null = Get-Command php -ErrorAction Stop
    $phpFound = $true
} catch {
    # Try common PHP locations
    $commonPaths = @(
        "C:\php\php.exe",
        "C:\xampp\php\php.exe",
        "C:\wamp64\bin\php\php8.2.0\php.exe",
        "C:\wamp\bin\php\php8.2.0\php.exe",
        "C:\laragon\bin\php\php8.2.0\php.exe",
        "$env:ProgramFiles\PHP\php.exe",
        "$env:ProgramFiles(x86)\PHP\php.exe"
    )
    
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            $phpCommand = $path
            $phpFound = $true
            Write-Host "Found PHP at: $path" -ForegroundColor Green
            break
        }
    }
    
    # Try to find PHP in Laragon/XAMPP/WAMP (latest version)
    $possibleDirs = @(
        "C:\laragon\bin\php",
        "C:\xampp\php",
        "C:\wamp64\bin\php",
        "C:\wamp\bin\php"
    )
    
    foreach ($dir in $possibleDirs) {
        if (Test-Path $dir) {
            $phpVersions = Get-ChildItem -Path $dir -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending
            if ($phpVersions) {
                $phpExe = Join-Path $phpVersions[0].FullName "php.exe"
                if (Test-Path $phpExe) {
                    $phpCommand = $phpExe
                    $phpFound = $true
                    Write-Host "Found PHP at: $phpExe" -ForegroundColor Green
                    break
                }
            }
        }
    }
}

if (-not $phpFound) {
    Write-Host "ERROR: PHP not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please either:" -ForegroundColor Yellow
    Write-Host "1. Add PHP to your PATH, or" -ForegroundColor Yellow
    Write-Host "2. Install PHP and update this script with the correct path" -ForegroundColor Yellow
    exit 1
}

Write-Host "Using PHP: $phpCommand" -ForegroundColor Green
Write-Host ""

# Determine what to run
if ($MigrationFile -eq "") {
    Write-Host "Running all pending migrations..." -ForegroundColor Yellow
    & $phpCommand artisan migrate
} else {
    # Check if migration file exists
    $migrationPath = "database\migrations\$MigrationFile"
    if (-not (Test-Path $migrationPath)) {
        Write-Host "ERROR: Migration file not found: $migrationPath" -ForegroundColor Red
        Write-Host ""
        Write-Host "Available migrations:" -ForegroundColor Yellow
        Get-ChildItem -Path "database\migrations" -Filter "*.php" | ForEach-Object {
            Write-Host "  - $($_.Name)" -ForegroundColor Gray
        }
        exit 1
    }
    
    Write-Host "Running specific migration: $MigrationFile" -ForegroundColor Yellow
    & $phpCommand artisan migrate --path=database/migrations/$MigrationFile
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "⚠️  Migration completed with errors." -ForegroundColor Yellow
    Write-Host "Check the output above for details." -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    exit $LASTEXITCODE
}
