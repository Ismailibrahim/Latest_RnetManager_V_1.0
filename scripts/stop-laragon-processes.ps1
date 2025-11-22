# Stop Laragon processes that might be using the directory
# Run this BEFORE consolidating directories

Write-Host "Stopping Laragon processes..." -ForegroundColor Cyan

# Stop PHP processes
$phpProcesses = Get-Process -Name "php" -ErrorAction SilentlyContinue
if ($phpProcesses) {
    Write-Host "Found $($phpProcesses.Count) PHP process(es)" -ForegroundColor Yellow
    $phpProcesses | Stop-Process -Force
    Write-Host "Stopped PHP processes" -ForegroundColor Green
} else {
    Write-Host "No PHP processes found" -ForegroundColor Green
}

# Stop Apache/Nginx if running
$apacheProcesses = Get-Process -Name "httpd","apache*","nginx" -ErrorAction SilentlyContinue
if ($apacheProcesses) {
    Write-Host "Found web server process(es)" -ForegroundColor Yellow
    $apacheProcesses | Stop-Process -Force
    Write-Host "Stopped web server processes" -ForegroundColor Green
} else {
    Write-Host "No web server processes found" -ForegroundColor Green
}

# Wait a moment for processes to fully stop
Start-Sleep -Seconds 2

Write-Host "`nDone! You can now run the consolidate script." -ForegroundColor Green

