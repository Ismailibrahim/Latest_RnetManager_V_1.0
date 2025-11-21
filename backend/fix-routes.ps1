# PowerShell script to fix route registration issues
Write-Host "Clearing Laravel caches..." -ForegroundColor Yellow

# Clear all caches
php artisan route:clear
php artisan config:clear
php artisan cache:clear
php artisan view:clear
php artisan optimize:clear

Write-Host "`nChecking routes file syntax..." -ForegroundColor Yellow
php -l routes/api.php

Write-Host "`nChecking if CurrencyController exists..." -ForegroundColor Yellow
php -r "require 'vendor/autoload.php'; echo class_exists('App\Http\Controllers\Api\V1\CurrencyController') ? 'CurrencyController: OK' : 'CurrencyController: NOT FOUND'; echo PHP_EOL;"

Write-Host "`nListing currency routes..." -ForegroundColor Yellow
php artisan route:list --name=currencies

Write-Host "`nDone! If routes are listed above, they should work now." -ForegroundColor Green
Write-Host "Make sure to restart your Laravel server (php artisan serve)" -ForegroundColor Cyan

