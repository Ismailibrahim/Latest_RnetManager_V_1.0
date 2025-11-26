# Test script to clear all financial data
# This script will:
# 1. First show a dry-run preview
# 2. Then ask for confirmation before actually deleting

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Financial Data Clear Test Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get PHP path
$phpPath = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe"

if (-not (Test-Path $phpPath)) {
    Write-Host "PHP not found at: $phpPath" -ForegroundColor Red
    Write-Host "Please update the PHP path in this script." -ForegroundColor Yellow
    exit 1
}

# Step 1: Show dry-run preview
Write-Host "Step 1: Preview what will be deleted (DRY RUN)" -ForegroundColor Yellow
Write-Host ""
& $phpPath artisan financial:clear --dry-run

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 2: Ask for confirmation
$confirm = Read-Host "Do you want to proceed with deleting all financial data? (yes/no)"

if ($confirm -eq "yes") {
    Write-Host ""
    Write-Host "Deleting all financial data..." -ForegroundColor Red
    Write-Host ""
    & $phpPath artisan financial:clear --force
    Write-Host ""
    Write-Host "✓ Financial data cleared successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Operation cancelled." -ForegroundColor Yellow
}

