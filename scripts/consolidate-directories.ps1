# PowerShell script to consolidate directories
# Run as Administrator

Write-Host "Checking directories..." -ForegroundColor Cyan

$sandboxPath = "D:\Sandbox\Rent_V2"
$laragonPath = "C:\laragon\www\Rent_V2"

# Check if directories exist
$sandboxExists = Test-Path $sandboxPath
$laragonExists = Test-Path $laragonPath

Write-Host "`nD:\Sandbox\Rent_V2 exists: $sandboxExists" -ForegroundColor $(if ($sandboxExists) { "Green" } else { "Red" })
Write-Host "C:\laragon\www\Rent_V2 exists: $laragonExists" -ForegroundColor $(if ($laragonExists) { "Green" } else { "Red" })

if (-not $sandboxExists) {
    Write-Host "`nERROR: D:\Sandbox\Rent_V2 not found!" -ForegroundColor Red
    exit 1
}

# Check if Laragon path is a junction/symlink
if ($laragonExists) {
    $item = Get-Item $laragonPath -ErrorAction SilentlyContinue
    if ($item.LinkType) {
        Write-Host "`nSUCCESS: C:\laragon\www\Rent_V2 is already a $($item.LinkType)" -ForegroundColor Green
        Write-Host "   Target: $($item.Target)" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "`nWARNING: This will:" -ForegroundColor Yellow
Write-Host "   1. Delete C:\laragon\www\Rent_V2 (if it exists)" -ForegroundColor Yellow
Write-Host "   2. Create a junction pointing to D:\Sandbox\Rent_V2" -ForegroundColor Yellow
Write-Host "`nPress Y to continue, N to cancel:" -ForegroundColor Cyan
$confirm = Read-Host

if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "`nCancelled" -ForegroundColor Red
    exit 0
}

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "`nERROR: This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

try {
    # Remove existing Laragon directory
    if ($laragonExists) {
        Write-Host "`nRemoving C:\laragon\www\Rent_V2..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $laragonPath -ErrorAction Stop
        Write-Host "Removed" -ForegroundColor Green
    }

    # Create junction
    Write-Host "`nCreating junction..." -ForegroundColor Yellow
    New-Item -ItemType Junction -Path $laragonPath -Target $sandboxPath -ErrorAction Stop | Out-Null
    Write-Host "Junction created!" -ForegroundColor Green

    # Verify
    Write-Host "`nVerifying..." -ForegroundColor Cyan
    $testBackend = Test-Path "$laragonPath\backend"
    $testFrontend = Test-Path "$laragonPath\frontend"
    $testGit = Test-Path "$laragonPath\.git"

    Write-Host "   Backend exists: $testBackend" -ForegroundColor $(if ($testBackend) { "Green" } else { "Red" })
    Write-Host "   Frontend exists: $testFrontend" -ForegroundColor $(if ($testFrontend) { "Green" } else { "Red" })
    Write-Host "   Git exists: $testGit" -ForegroundColor $(if ($testGit) { "Green" } else { "Red" })

    if ($testBackend -and $testFrontend -and $testGit) {
        Write-Host "`nSUCCESS! Directories are now consolidated." -ForegroundColor Green
        Write-Host "`nNext steps:" -ForegroundColor Cyan
        Write-Host "   1. Open Cursor and set workspace to: D:\Sandbox\Rent_V2" -ForegroundColor White
        Write-Host "   2. Laragon can now access the project via: C:\laragon\www\Rent_V2" -ForegroundColor White
        Write-Host "   3. Both paths point to the same files!" -ForegroundColor White
    } else {
        Write-Host "`nWARNING: Some files might be missing. Please verify manually." -ForegroundColor Yellow
    }

} catch {
    Write-Host "`nERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

