@echo off
echo Clearing Laravel caches...
php artisan route:clear
php artisan config:clear
php artisan cache:clear
php artisan view:clear
php artisan optimize:clear

echo.
echo Checking routes file syntax...
php -l routes/api.php

echo.
echo Checking if CurrencyController exists...
php -r "require 'vendor/autoload.php'; echo class_exists('App\Http\Controllers\Api\V1\CurrencyController') ? 'CurrencyController: OK' : 'CurrencyController: NOT FOUND'; echo PHP_EOL;"

echo.
echo Listing currency routes...
php artisan route:list --name=currencies

echo.
echo Done! If routes are listed above, they should work now.
echo Make sure to restart your Laravel server (php artisan serve)
pause

