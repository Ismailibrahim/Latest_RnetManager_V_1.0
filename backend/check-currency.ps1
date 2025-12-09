# PowerShell script to check currency columns with proper output handling
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Set-Location $PSScriptRoot

# Find PHP executable
$phpPath = $null

# Default PHP path (update this if your PHP is in a different location)
$defaultPhpPath = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe"
if (Test-Path $defaultPhpPath) {
    $phpPath = $defaultPhpPath
}

# Method 1: Check if PHP is in PATH
try {
    $phpCheck = Get-Command php -ErrorAction Stop
    $phpPath = $phpCheck.Source
} catch {
    # PHP not in PATH, continue searching
}

# Method 2: Search common installation directories
if (-not $phpPath) {
    $searchPaths = @(
        "C:\php",
        "C:\xampp\php",
        "C:\wamp\bin\php",
        "C:\laragon\bin\php",
        "C:\Program Files\PHP",
        "C:\Program Files (x86)\PHP",
        "$env:ProgramFiles\PHP",
        "${env:ProgramFiles(x86)}\PHP"
    )
    
    foreach ($basePath in $searchPaths) {
        if (Test-Path $basePath) {
            # Check for php.exe directly
            $directPath = Join-Path $basePath "php.exe"
            if (Test-Path $directPath) {
                $phpPath = $directPath
                break
            }
            
            # Search in subdirectories (for versioned installations like Laragon)
            $phpExe = Get-ChildItem -Path $basePath -Filter "php.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($phpExe) {
                $phpPath = $phpExe.FullName
                break
            }
        }
    }
}

# Method 3: Check for Laragon (common Windows Laravel dev environment)
if (-not $phpPath) {
    $laragonPaths = @(
        "C:\laragon\bin\php",
        "$env:USERPROFILE\laragon\bin\php"
    )
    
    foreach ($laragonPath in $laragonPaths) {
        if (Test-Path $laragonPath) {
            # First try the specific version path
            $specificPath = Join-Path $laragonPath "php-8.3.26-Win32-vs16-x64\php.exe"
            if (Test-Path $specificPath) {
                $phpPath = $specificPath
                break
            }
            
            # Fallback: search for any PHP version
            $phpVersions = Get-ChildItem -Path $laragonPath -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending
            foreach ($version in $phpVersions) {
                $phpExe = Join-Path $version.FullName "php.exe"
                if (Test-Path $phpExe) {
                    $phpPath = $phpExe
                    break
                }
            }
            if ($phpPath) { break }
        }
    }
}

# Method 4: Check for XAMPP
if (-not $phpPath) {
    $xamppPaths = @(
        "C:\xampp\php\php.exe",
        "C:\xampp64\php\php.exe"
    )
    
    foreach ($xamppPath in $xamppPaths) {
        if (Test-Path $xamppPath) {
            $phpPath = $xamppPath
            break
        }
    }
}

# Method 5: Check registry for installed PHP (if available)
if (-not $phpPath) {
    try {
        $regPath = "HKLM:\SOFTWARE\PHP"
        if (Test-Path $regPath) {
            $installPath = (Get-ItemProperty -Path $regPath -Name "IniFilePath" -ErrorAction SilentlyContinue).IniFilePath
            if ($installPath) {
                $phpExe = Join-Path (Split-Path $installPath) "php.exe"
                if (Test-Path $phpExe) {
                    $phpPath = $phpExe
                }
            }
        }
    } catch {
        # Registry access might fail, continue
    }
}

if (-not $phpPath) {
    Write-Host "ERROR: PHP not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please do one of the following:" -ForegroundColor Yellow
    Write-Host "  1. Add PHP to your system PATH" -ForegroundColor Gray
    Write-Host "  2. Edit this script and set `$phpPath manually" -ForegroundColor Gray
    Write-Host "  3. Install PHP from https://windows.php.net/download/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To manually set PHP path, edit check-currency.ps1 and add:" -ForegroundColor Cyan
    Write-Host '  $phpPath = "C:\path\to\php.exe"' -ForegroundColor White
    Write-Host ""
    
    # Ask user if they want to manually specify
    $manualPath = Read-Host "Enter PHP path manually (or press Enter to exit)"
    if ($manualPath -and (Test-Path $manualPath)) {
        $phpPath = $manualPath
    } else {
        exit 1
    }
}

Write-Host "Using PHP: $phpPath" -ForegroundColor Green
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Step 1: Adding Currency Columns" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Run migration script first
$migrationOutput = & $phpPath add-currency-columns-direct.php 2>&1
$migrationOutput | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Step 2: Verifying Currency Columns" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Run direct PHP script
$checkOutput = & $phpPath check-currency-direct.php 2>&1
$checkOutput | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Step 3: Using Artisan Command" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$artisanOutput = & $phpPath artisan db:check-currency 2>&1
$artisanOutput | ForEach-Object { Write-Host $_ }