# Safe directory consolidation script
# Stops processes first, then consolidates

Write-Host "=== Directory Consolidation Script ===" -ForegroundColor Cyan
Write-Host ""

$sandboxPath = "D:\Sandbox\Rent_V2"
$laragonPath = "C:\laragon\www\Rent_V2"

# Step 1: Stop processes
Write-Host "Step 1: Stopping processes that might be using files..." -ForegroundColor Yellow

$phpProcesses = Get-Process -Name "php" -ErrorAction SilentlyContinue
if ($phpProcesses) {
    Write-Host "  Stopping $($phpProcesses.Count) PHP process(es)..." -ForegroundColor Yellow
    $phpProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

$webProcesses = Get-Process -Name "httpd","apache*","nginx" -ErrorAction SilentlyContinue
if ($webProcesses) {
    Write-Host "  Stopping web server process(es)..." -ForegroundColor Yellow
    $webProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

Write-Host "  Processes stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Check directories
Write-Host "Step 2: Checking directories..." -ForegroundColor Yellow
$sandboxExists = Test-Path $sandboxPath
$laragonExists = Test-Path $laragonPath

Write-Host "  D:\Sandbox\Rent_V2 exists: $sandboxExists" -ForegroundColor $(if ($sandboxExists) { "Green" } else { "Red" })
Write-Host "  C:\laragon\www\Rent_V2 exists: $laragonExists" -ForegroundColor $(if ($laragonExists) { "Green" } else { "Red" })
Write-Host ""

if (-not $sandboxExists) {
    Write-Host "ERROR: D:\Sandbox\Rent_V2 not found!" -ForegroundColor Red
    exit 1
}

# Check if already a junction
if ($laragonExists) {
    try {
        $item = Get-Item $laragonPath -ErrorAction Stop
        if ($item.LinkType) {
            Write-Host "SUCCESS: C:\laragon\www\Rent_V2 is already a $($item.LinkType)" -ForegroundColor Green
            Write-Host "  Target: $($item.Target)" -ForegroundColor Yellow
            exit 0
        }
    } catch {
        # Continue if we can't check
    }
}

# Step 3: Confirm
Write-Host "Step 3: This will:" -ForegroundColor Yellow
Write-Host "  1. Delete C:\laragon\www\Rent_V2 (if it exists)" -ForegroundColor White
Write-Host "  2. Create a junction pointing to D:\Sandbox\Rent_V2" -ForegroundColor White
Write-Host ""
Write-Host "Press Y to continue, N to cancel:" -ForegroundColor Cyan
$confirm = Read-Host

if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "Cancelled" -ForegroundColor Red
    exit 0
}

# Step 4: Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host "  Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Step 5: Remove directory with retries
if ($laragonExists) {
    Write-Host ""
    Write-Host "Step 4: Removing C:\laragon\www\Rent_V2..." -ForegroundColor Yellow
    
    $maxRetries = 5
    $retryCount = 0
    $removed = $false
    
    while ($retryCount -lt $maxRetries -and -not $removed) {
        try {
            # Try to remove
            Remove-Item -Recurse -Force $laragonPath -ErrorAction Stop
            $removed = $true
            Write-Host "  Removed successfully" -ForegroundColor Green
        } catch {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                Write-Host "  Attempt $retryCount failed. Waiting 2 seconds and retrying..." -ForegroundColor Yellow
                Start-Sleep -Seconds 2
                
                # Try to stop more processes
                Get-Process | Where-Object { $_.Path -like "*Rent_V2*" } | Stop-Process -Force -ErrorAction SilentlyContinue
            } else {
                Write-Host ""
                Write-Host "ERROR: Could not remove directory after $maxRetries attempts." -ForegroundColor Red
                Write-Host "  The directory might be locked by:" -ForegroundColor Yellow
                Write-Host "    - Laragon web server (stop it from Laragon)" -ForegroundColor White
                Write-Host "    - PHP processes (close any running PHP scripts)" -ForegroundColor White
                Write-Host "    - File Explorer (close any windows showing this folder)" -ForegroundColor White
                Write-Host "    - Other applications" -ForegroundColor White
                Write-Host ""
                Write-Host "  Try manually:" -ForegroundColor Yellow
                Write-Host "    1. Stop Laragon completely" -ForegroundColor White
                Write-Host "    2. Close all file explorer windows" -ForegroundColor White
                Write-Host "    3. Run this script again" -ForegroundColor White
                exit 1
            }
        }
    }
}

# Step 6: Create junction
Write-Host ""
Write-Host "Step 5: Creating junction..." -ForegroundColor Yellow
try {
    New-Item -ItemType Junction -Path $laragonPath -Target $sandboxPath -ErrorAction Stop | Out-Null
    Write-Host "  Junction created successfully!" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Could not create junction: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 7: Verify
Write-Host ""
Write-Host "Step 6: Verifying..." -ForegroundColor Yellow
$testBackend = Test-Path "$laragonPath\backend"
$testFrontend = Test-Path "$laragonPath\frontend"
$testGit = Test-Path "$laragonPath\.git"

Write-Host "  Backend exists: $testBackend" -ForegroundColor $(if ($testBackend) { "Green" } else { "Red" })
Write-Host "  Frontend exists: $testFrontend" -ForegroundColor $(if ($testFrontend) { "Green" } else { "Red" })
Write-Host "  Git exists: $testGit" -ForegroundColor $(if ($testGit) { "Green" } else { "Red" })

if ($testBackend -and $testFrontend -and $testGit) {
    Write-Host ""
    Write-Host "SUCCESS! Directories are now consolidated." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Open Cursor and set workspace to: D:\Sandbox\Rent_V2" -ForegroundColor White
    Write-Host "  2. Laragon can now access the project via: C:\laragon\www\Rent_V2" -ForegroundColor White
    Write-Host "  3. Both paths point to the same files!" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "WARNING: Some files might be missing. Please verify manually." -ForegroundColor Yellow
}

