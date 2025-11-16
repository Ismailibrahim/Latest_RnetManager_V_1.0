# Laragon PHP PATH Setup Script
# This script adds Laragon's PHP to your current PowerShell session PATH

# Common Laragon installation paths
$laragonPaths = @(
    "C:\laragon\bin\php",
    "D:\laragon\bin\php",
    "$env:USERPROFILE\laragon\bin\php"
)

$phpPath = $null
$composerPath = $null

# Find Laragon PHP installation
foreach ($basePath in $laragonPaths) {
    if (Test-Path $basePath) {
        # Get the latest PHP version directory
        $phpDirs = Get-ChildItem -Path $basePath -Directory | Sort-Object Name -Descending
        if ($phpDirs) {
            $phpPath = $phpDirs[0].FullName
            Write-Host "Found PHP at: $phpPath" -ForegroundColor Green
            break
        }
    }
}

# Find Composer
$composerPaths = @(
    "C:\laragon\bin\composer",
    "D:\laragon\bin\composer",
    "$env:USERPROFILE\laragon\bin\composer"
)

foreach ($path in $composerPaths) {
    if (Test-Path $path) {
        $composerPath = $path
        Write-Host "Found Composer at: $composerPath" -ForegroundColor Green
        break
    }
}

# Add to PATH for current session
if ($phpPath) {
    $env:Path = "$phpPath;$env:Path"
    Write-Host "PHP added to PATH for this session" -ForegroundColor Green
} else {
    Write-Host "Laragon PHP not found. Please:" -ForegroundColor Yellow
    Write-Host "1. Open Laragon and use its built-in Terminal, OR" -ForegroundColor Yellow
    Write-Host "2. Manually add your Laragon PHP path to PATH" -ForegroundColor Yellow
    Write-Host "   Example: `$env:Path += ';C:\laragon\bin\php\php-8.3.0-Win32-vs16-x64'" -ForegroundColor Yellow
}

if ($composerPath) {
    $env:Path = "$composerPath;$env:Path"
    Write-Host "Composer added to PATH for this session" -ForegroundColor Green
}

# Verify PHP is available
Write-Host "`nVerifying PHP installation..." -ForegroundColor Cyan
try {
    $phpVersion = php -v 2>&1 | Select-Object -First 1
    Write-Host $phpVersion -ForegroundColor Green
} catch {
    Write-Host "PHP command not available. Please check your Laragon installation." -ForegroundColor Red
}

