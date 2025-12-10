# 🚀 Server Update Commands

## Quick Update (All-in-One Script)

**Option 1: Use the update script (recommended)**

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Navigate to application directory
cd /var/www/rentapplicaiton

# Make script executable (first time only)
chmod +x update-server.sh

# Run the update script
./update-server.sh
```

## Manual Update (Step-by-Step)

**If you prefer to run commands manually:**

```bash
# 1. SSH into your server
ssh root@YOUR_SERVER_IP

# 2. Navigate to application directory
cd /var/www/rentapplicaiton

# 3. Pull latest changes from Git
git pull origin main

# 4. Update backend dependencies
cd backend
composer install --no-dev --optimize-autoloader --no-interaction

# 5. Run database migrations
php artisan migrate --force

# 6. Clear all caches
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

# 7. Optimize application
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize

# 8. Update frontend dependencies
cd ../frontend
npm ci

# 9. Build frontend
npm run build

# 10. Restart services
sudo systemctl restart php8.3-fpm  # or php8.2-fpm
sudo supervisorctl restart rentapp-queue-worker:*
pm2 restart rentapp-frontend

# 11. Check status
sudo systemctl status nginx
sudo systemctl status php8.3-fpm  # or php8.2-fpm
sudo supervisorctl status rentapp-queue-worker:*
pm2 status
```

## Quick Copy-Paste Commands

**For quick updates, copy and paste this entire block:**

```bash
cd /var/www/rentapplicaiton && \
git pull origin main && \
cd backend && \
composer install --no-dev --optimize-autoloader --no-interaction && \
php artisan migrate --force && \
php artisan config:clear && \
php artisan route:clear && \
php artisan view:clear && \
php artisan cache:clear && \
php artisan config:cache && \
php artisan route:cache && \
php artisan view:cache && \
php artisan optimize && \
cd ../frontend && \
npm ci && \
npm run build && \
sudo systemctl restart php8.3-fpm && \
sudo supervisorctl restart rentapp-queue-worker:* && \
pm2 restart rentapp-frontend && \
echo "✅ Update completed!"
```

## Troubleshooting

**If git pull fails:**
```bash
# Check git status
git status

# If there are local changes, stash them
git stash

# Then pull again
git pull origin main
```

**If composer fails:**
```bash
# Clear composer cache
composer clear-cache

# Try again
composer install --no-dev --optimize-autoloader --no-interaction
```

**If migrations fail:**
```bash
# Check migration status
php artisan migrate:status

# Rollback if needed (be careful!)
# php artisan migrate:rollback --step=1
```

**If npm build fails:**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm ci
npm run build
```

**If services won't restart:**
```bash
# Check service logs
sudo journalctl -u php8.3-fpm -n 50
sudo journalctl -u nginx -n 50
pm2 logs rentapp-frontend --lines 50
```

## Notes

- Replace `php8.3-fpm` with `php8.2-fpm` if you're using PHP 8.2
- Make sure you're logged in as a user with sudo privileges
- The `--force` flag on migrations skips the confirmation prompt (safe for production)
- Always backup your database before running migrations in production

