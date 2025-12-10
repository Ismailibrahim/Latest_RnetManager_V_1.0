#!/bin/bash

# Update Server Script for RentApplicaiton
# This script pulls latest changes from Git and updates the server

set -e  # Exit on error

echo "🚀 Starting server update..."

# Navigate to application directory
cd /var/www/rentapplicaiton

echo "📥 Pulling latest changes from Git..."
git pull origin main

echo "📦 Updating backend dependencies..."
cd backend
composer install --no-dev --optimize-autoloader --no-interaction

echo "🔄 Running database migrations..."
php artisan migrate --force

echo "🧹 Clearing caches..."
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

echo "⚡ Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize

echo "📦 Updating frontend dependencies..."
cd ../frontend
npm ci

echo "🏗️ Building frontend..."
npm run build

echo "🔄 Restarting services..."
# Restart PHP-FPM
sudo systemctl restart php8.3-fpm || sudo systemctl restart php8.2-fpm

# Restart queue workers
sudo supervisorctl restart rentapp-queue-worker:*

# Restart PM2 frontend
pm2 restart rentapp-frontend || pm2 start npm --name rentapp-frontend -- start

echo "✅ Server update completed successfully!"
echo "📊 Checking service status..."

# Check services
echo "Nginx status:"
sudo systemctl status nginx --no-pager -l | head -3

echo "PHP-FPM status:"
sudo systemctl status php8.3-fpm --no-pager -l | head -3 || sudo systemctl status php8.2-fpm --no-pager -l | head -3

echo "Queue workers status:"
sudo supervisorctl status rentapp-queue-worker:*

echo "PM2 status:"
pm2 status

echo "🎉 All done! Your server has been updated."

