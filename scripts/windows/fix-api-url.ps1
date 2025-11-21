# Fix API URL in frontend .env.local
$ip = "192.168.1.225"
$envFile = "frontend\.env.local"

Write-Host "Fixing API URL in $envFile..." -ForegroundColor Yellow

if (Test-Path $envFile) {
    $content = Get-Content $envFile
    $newContent = @()
    
    foreach ($line in $content) {
        if ($line -match '^NEXT_PUBLIC_API_URL=') {
            $newContent += "NEXT_PUBLIC_API_URL=http://$ip:8000/api/v1"
        } else {
            $newContent += $line
        }
    }
    
    Set-Content -Path $envFile -Value $newContent
    Write-Host "Fixed! API URL set to: http://$ip:8000/api/v1" -ForegroundColor Green
} else {
    Write-Host "Creating new .env.local file..." -ForegroundColor Yellow
    $content = @"
# API URL for mobile access
NEXT_PUBLIC_API_URL=http://$ip:8000/api/v1
"@
    Set-Content -Path $envFile -Value $content
    Write-Host "Created! API URL set to: http://$ip:8000/api/v1" -ForegroundColor Green
}

Write-Host ""
Write-Host "IMPORTANT: Restart the frontend server for changes to take effect!" -ForegroundColor Yellow
Write-Host "  cd frontend" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Cyan

