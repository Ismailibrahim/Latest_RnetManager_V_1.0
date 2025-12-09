# PowerShell script to fix currency columns
# Run this from the backend directory: .\fix-currency.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FIXING CURRENCY COLUMNS" -ForegroundColor Cyan
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
    
    # Try to find PHP in Laragon/XAMPP/WAMP
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
    Write-Host "2. Run the SQL directly in your database:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "ALTER TABLE `units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`;" -ForegroundColor Green
    Write-Host "ALTER TABLE `units` ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`;" -ForegroundColor Green
    exit 1
}

Write-Host "Using PHP: $phpCommand" -ForegroundColor Green
Write-Host ""

# Run the artisan command
Write-Host "Running migration fix..." -ForegroundColor Yellow
& $phpCommand artisan fix:currency-columns

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Fix completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "⚠️  Check the output above for details." -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
}
