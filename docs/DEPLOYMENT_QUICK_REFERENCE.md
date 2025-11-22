# Deployment Quick Reference

Quick reference guide for RentApplication deployment.

## GitHub Actions Deployment

### Required GitHub Secrets

- `SSH_PRIVATE_KEY` - Private SSH key for VPS access
- `SSH_USER` - VPS username (e.g., `ubuntu`, `root`)
- `SSH_HOST` - VPS IP or domain

### Optional GitHub Secrets

- `APP_URL` - Full application URL
- `APP_DIRECTORY` - Custom app directory (default: `/var/www/webapp`)

## Server Commands

### Check Service Status

```bash
# PM2 (Frontend)
pm2 list
pm2 status rentapp-frontend
pm2 logs rentapp-frontend

# PHP-FPM (Backend)
sudo systemctl status php8.2-fpm

# Nginx
sudo systemctl status nginx

# MySQL
sudo systemctl status mysql
```

### Restart Services

```bash
# Restart all
sudo systemctl restart nginx
sudo systemctl restart php8.2-fpm
pm2 restart rentapp-frontend

# Or via PM2
pm2 restart all
```

### View Logs

```bash
# Frontend (PM2)
pm2 logs rentapp-frontend

# Backend (Laravel)
tail -f /var/www/webapp/backend/storage/logs/laravel.log

# Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# PM2 logs
tail -f /var/www/webapp/logs/pm2-*.log
```

### Manual Deployment

```bash
cd /var/www/webapp
./deploy.sh
```

### Update Dependencies

```bash
# Backend
cd /var/www/webapp/backend
composer update --no-dev
php artisan optimize

# Frontend
cd /var/www/webapp/frontend
npm update
npm run build
pm2 restart rentapp-frontend
```

## File Locations

- **App Directory:** `/var/www/webapp`
- **Backend .env:** `/var/www/webapp/backend/.env`
- **Frontend .env:** `/var/www/webapp/frontend/.env.local`
- **Deploy Script:** `/var/www/webapp/deploy.sh`
- **PM2 Config:** `/var/www/webapp/ecosystem.config.js`
- **Nginx Config:** `/etc/nginx/sites-available/rentapp`
- **Logs:** `/var/www/webapp/logs/`

## Common Issues

### PM2 Not Running

```bash
cd /var/www/webapp
pm2 start ecosystem.config.js
pm2 save
```

### Nginx 502 Error

```bash
# Check if services are running
pm2 list
sudo systemctl status php8.2-fpm

# Restart services
sudo systemctl restart nginx
sudo systemctl restart php8.2-fpm
pm2 restart rentapp-frontend
```

### Permission Errors

```bash
cd /var/www/webapp
sudo chown -R $USER:www-data backend/storage backend/bootstrap/cache
sudo chmod -R 775 backend/storage backend/bootstrap/cache
```

### Database Connection Issues

```bash
# Test connection
mysql -u rentapp_user -p rentapp_production

# Check .env
cat /var/www/webapp/backend/.env | grep DB_
```

## Rollback

```bash
cd /var/www/webapp
git log  # Find previous commit
git reset --hard <commit-hash>
./deploy.sh
```

Or restore from backup:

```bash
cd /var/www/webapp
tar -xzf backups/backup_YYYYMMDD_HHMMSS.tar.gz
```

## Environment Variables

### Backend (.env)

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=http://your-domain.com
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=rentapp_production
DB_USERNAME=rentapp_user
DB_PASSWORD=your_password
FRONTEND_URL=http://your-domain.com
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://your-domain.com/api/v1
NEXT_PUBLIC_APP_ENV=production
```

---

**For detailed instructions, see:** `docs/DEPLOYMENT_GITHUB_ACTIONS.md`

