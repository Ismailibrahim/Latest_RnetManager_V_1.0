# Fix PowerShell output encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "PowerShell output encoding configured!" -ForegroundColor Green
Write-Host "Run: .\check-currency.ps1" -ForegroundColor Yellow
