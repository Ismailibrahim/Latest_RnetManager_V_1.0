# 🚀 Deployment Quick Start Guide

This guide provides a quick reference for deploying RentApplication. For detailed instructions, see [DEPLOYMENT_STEP_BY_STEP.md](./DEPLOYMENT_STEP_BY_STEP.md).

## Quick Deployment Options

### Option 1: Automated GitHub Actions (Recommended)

**One-command deployment:**
```bash
git push origin main
```

**Prerequisites:**
1. Set up GitHub Secrets:
   - `SSH_PRIVATE_KEY` - Your SSH private key
   - `SSH_USER` - VPS username (e.g., `root` or `ubuntu`)
   - `SSH_HOST` - VPS IP or domain
   - `APP_DIRECTORY` (optional) - Default: `/var/www/webapp`

2. First-time server setup:
   ```bash
   # On your VPS
   ./scripts/setup-server.sh
   ```

### Option 2: Docker Compose

**Development:**
```bash
docker-compose up -d
```

**Production:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Option 3: Manual Deployment

**On your VPS:**
```bash
cd /var/www/webapp
./deploy.sh
```

## First-Time Server Setup

### Automated Setup (Recommended)

```bash
# On your VPS
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh
```

This script will:
- Install PHP 8.2, Node.js 20, Nginx, MySQL
- Install Composer
- Create application directory
- Clone repository (if provided)
- Set up basic configuration

### Manual Setup

1. **Install dependencies:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y git php8.2 php8.2-fpm php8.2-mysql php8.2-xml \
       php8.2-mbstring php8.2-curl php8.2-zip nginx mysql-server
   
   # Install Composer
   curl -sS https://getcomposer.org/installer | php
   sudo mv composer.phar /usr/local/bin/composer
   
   # Install Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

2. **Clone repository:**
   ```bash
   sudo mkdir -p /var/www/webapp
   sudo chown -R $USER:$USER /var/www/webapp
   cd /var/www/webapp
   git clone https://github.com/YOUR-USERNAME/RentApplicaiton.git .
   ```

3. **Configure backend:**
   ```bash
   cd backend
   cp .env.example .env
   nano .env  # Update with your settings
   composer install --no-dev
   php artisan key:generate
   php artisan migrate --force
   ```

4. **Configure frontend:**
   ```bash
   cd ../frontend
   cp .env.example .env.local
   nano .env.local  # Update API URL
   npm ci
   npm run build
   ```

5. **Set up Nginx:**
   ```bash
   sudo cp config/nginx/rentapp.conf /etc/nginx/sites-available/rentapp
   sudo ln -s /etc/nginx/sites-available/rentapp /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Environment Configuration

### Backend (.env)

**Required variables:**
```env
APP_NAME=RentApplicaiton
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=rentapp_production
DB_USERNAME=rentapp_user
DB_PASSWORD=your_secure_password

CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com
```

### Frontend (.env.local)

**Required variables:**
```env
NEXT_PUBLIC_APP_NAME=RentApplicaiton
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_URL=/api/v1
```

## Pre-Deployment Validation

Before deploying, run the validation script:

```bash
chmod +x scripts/pre-deploy-check.sh
./scripts/pre-deploy-check.sh
```

This checks:
- Required commands are installed
- PHP version and extensions
- Node.js version
- Disk space
- Environment files
- Database connectivity
- File permissions

## Deployment Workflow

### Regular Deployment

1. **Make changes locally**
2. **Commit and push:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. **GitHub Actions automatically deploys** (if configured)

### Manual Deployment

```bash
cd /var/www/webapp
./deploy.sh
```

## Health Checks

**Check application health:**
```bash
curl http://yourdomain.com/api/health
curl http://yourdomain.com/api/v1/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "database": "connected"
}
```

## Rollback

If something goes wrong, rollback to a previous version:

```bash
chmod +x scripts/rollback.sh
./scripts/rollback.sh
```

This will:
1. List available backups
2. Let you select a backup to restore
3. Create a backup of current state
4. Restore selected backup
5. Run post-rollback tasks

## Troubleshooting

### Deployment fails

1. **Check logs:**
   ```bash
   tail -f /var/www/webapp/backend/storage/logs/laravel.log
   ```

2. **Run pre-deployment check:**
   ```bash
   ./scripts/pre-deploy-check.sh
   ```

3. **Check services:**
   ```bash
   sudo systemctl status nginx
   sudo systemctl status php8.2-fpm
   ```

### Database connection fails

1. **Test connection:**
   ```bash
   mysql -u rentapp_user -p rentapp_production
   ```

2. **Check .env file:**
   ```bash
   cat /var/www/webapp/backend/.env | grep DB_
   ```

### Frontend build fails

1. **Clear cache:**
   ```bash
   cd /var/www/webapp/frontend
   rm -rf node_modules .next
   npm ci
   npm run build
   ```

### Permission issues

```bash
cd /var/www/webapp/backend
sudo chmod -R 775 storage bootstrap/cache
sudo chown -R www-data:www-data storage bootstrap/cache
```

## Common Commands

### Backend
```bash
cd /var/www/webapp/backend

# Run migrations
php artisan migrate --force

# Clear cache
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Optimize
php artisan optimize

# Check routes
php artisan route:list
```

### Frontend
```bash
cd /var/www/webapp/frontend

# Install dependencies
npm ci

# Build for production
npm run build

# Start development server
npm run dev
```

### Services
```bash
# Restart Nginx
sudo systemctl restart nginx

# Restart PHP-FPM
sudo systemctl restart php8.2-fpm

# Check service status
sudo systemctl status nginx
sudo systemctl status php8.2-fpm
```

## SSL/HTTPS Setup

**Using Let's Encrypt (Certbot):**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will automatically configure Nginx for HTTPS.

## Monitoring

**Health endpoint:** `https://yourdomain.com/api/health`

**Detailed diagnostics:** `https://yourdomain.com/api/v1/health/diagnostics` (requires authentication)

## Support

For detailed documentation:
- [Complete Deployment Guide](./DEPLOYMENT_STEP_BY_STEP.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [API Documentation](./API_DOCUMENTATION.md)

## Quick Reference

| Task | Command |
|------|---------|
| Deploy | `git push origin main` (auto) or `./deploy.sh` (manual) |
| Validate | `./scripts/pre-deploy-check.sh` |
| Rollback | `./scripts/rollback.sh` |
| Health Check | `curl https://yourdomain.com/api/health` |
| Setup Server | `./scripts/setup-server.sh` |
| Docker Dev | `docker-compose up -d` |
| Docker Prod | `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d` |

---

**That's it! Your deployment should be a breeze now! 🎉**

