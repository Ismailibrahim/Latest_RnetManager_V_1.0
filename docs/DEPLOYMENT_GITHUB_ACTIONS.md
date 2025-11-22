# GitHub Actions Deployment Guide for RentApplication

This guide walks you through setting up automated deployment from GitHub to your VPS server using GitHub Actions.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Server Setup](#initial-server-setup)
3. [GitHub Secrets Configuration](#github-secrets-configuration)
4. [First Deployment](#first-deployment)
5. [Troubleshooting](#troubleshooting)
6. [Maintenance](#maintenance)

---

## Prerequisites

Before starting, ensure you have:

- [ ] A VPS server (Ubuntu 20.04+ or Debian 11+ recommended)
- [ ] SSH access to your VPS (root or sudo user)
- [ ] A GitHub repository with your code
- [ ] Domain name (optional, IP address works too)
- [ ] Basic knowledge of Linux commands

---

## Initial Server Setup

### Step 1: Connect to Your VPS

```bash
ssh your-username@your-server-ip
```

### Step 2: Run the Server Setup Script

The easiest way to set up your server is to use the automated setup script:

```bash
# Clone your repository (if not already cloned)
cd /tmp
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO

# Make the script executable
chmod +x scripts/setup-server.sh

# Run the setup script
./scripts/setup-server.sh
```

The script will:
- Install PHP 8.2+, Node.js 20+, MySQL, Nginx, Composer, and PM2
- Create the application directory (`/var/www/webapp`)
- Set up basic configurations
- Prompt you for database setup

### Step 3: Manual Server Setup (Alternative)

If you prefer to set up manually:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PHP 8.2 and extensions
sudo apt install -y php8.2 php8.2-fpm php8.2-mysql php8.2-xml \
    php8.2-mbstring php8.2-curl php8.2-zip php8.2-gd php8.2-bcmath

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2
pm2 startup systemd -u $USER --hp $HOME

# Install Nginx
sudo apt install -y nginx

# Install MySQL
sudo apt install -y mysql-server
```

### Step 4: Clone Your Repository

```bash
sudo mkdir -p /var/www/webapp
sudo chown -R $USER:$USER /var/www/webapp
cd /var/www/webapp
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git .
```

### Step 5: Configure Backend Environment

```bash
cd /var/www/webapp/backend
cp .env.example .env
nano .env
```

Update these key values:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=http://your-domain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=rentapp_production
DB_USERNAME=rentapp_user
DB_PASSWORD=your_strong_password

FRONTEND_URL=http://your-domain.com
```

Generate application key:

```bash
php artisan key:generate
```

### Step 6: Set Up Database

```bash
sudo mysql -u root -p
```

In MySQL:

```sql
CREATE DATABASE rentapp_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rentapp_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON rentapp_production.* TO 'rentapp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Run migrations:

```bash
cd /var/www/webapp/backend
php artisan migrate --force
```

### Step 7: Configure Frontend Environment

```bash
cd /var/www/webapp/frontend
cp .env.example .env.local
nano .env.local
```

Update:

```env
NEXT_PUBLIC_API_URL=http://your-domain.com/api/v1
NEXT_PUBLIC_APP_ENV=production
```

### Step 8: Install Dependencies and Build

```bash
# Backend
cd /var/www/webapp/backend
composer install --no-dev --optimize-autoloader
php artisan optimize

# Frontend
cd /var/www/webapp/frontend
npm ci
npm run build
```

### Step 9: Set Up PM2

```bash
cd /var/www/webapp
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 10: Configure Nginx

```bash
sudo cp /var/www/webapp/config/nginx/rentapp-site.conf /etc/nginx/sites-available/rentapp
sudo nano /etc/nginx/sites-available/rentapp
```

Replace `YOUR_DOMAIN_OR_IP` with your actual domain or IP address.

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/rentapp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Step 11: Set File Permissions

```bash
cd /var/www/webapp
sudo chown -R $USER:www-data backend/storage backend/bootstrap/cache
sudo chmod -R 775 backend/storage backend/bootstrap/cache
```

### Step 12: Set Up SSH Key for GitHub Actions

On your **local machine** (not the server):

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# Display public key
cat ~/.ssh/github_actions_deploy.pub
```

Copy the public key and add it to your VPS:

```bash
# On your VPS
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Paste the public key, save and exit
chmod 600 ~/.ssh/authorized_keys
```

---

## GitHub Secrets Configuration

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

### Required Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `SSH_PRIVATE_KEY` | Your private SSH key (entire content including `-----BEGIN` and `-----END`) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SSH_USER` | VPS username | `ubuntu` or `root` |
| `SSH_HOST` | VPS IP address or domain | `123.45.67.89` or `app.example.com` |

### Optional Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `APP_URL` | Full URL of your application | `https://app.example.com` |
| `APP_DIRECTORY` | Custom app directory path | `/var/www/webapp` |

### How to Get SSH_PRIVATE_KEY

On your local machine:

```bash
# Windows (PowerShell)
Get-Content $env:USERPROFILE\.ssh\github_actions_deploy

# Mac/Linux
cat ~/.ssh/github_actions_deploy
```

Copy the **entire output** including the `-----BEGIN` and `-----END` lines.

---

## First Deployment

### Test SSH Connection

On your local machine:

```bash
ssh -i ~/.ssh/github_actions_deploy your-username@your-server-ip
```

If it connects without a password, you're good!

### Trigger Deployment

1. Make a small change to your code (or just update README)
2. Commit and push to `main` branch:

```bash
git add .
git commit -m "Initial deployment setup"
git push origin main
```

3. Go to your GitHub repository → **Actions** tab
4. Watch the deployment workflow run
5. Check the logs for any errors

### Verify Deployment

```bash
# SSH into your VPS
ssh your-username@your-server-ip

# Check PM2 status
pm2 list

# Check Nginx status
sudo systemctl status nginx

# Check PHP-FPM status
sudo systemctl status php8.2-fpm

# Check application logs
pm2 logs rentapp-frontend
tail -f /var/www/webapp/backend/storage/logs/laravel.log
```

Visit your application in a browser to verify it's working.

---

## Troubleshooting

### Deployment Fails with "Permission Denied"

**Problem:** SSH connection fails

**Solution:**
- Verify SSH key is correct in GitHub Secrets
- Check `~/.ssh/authorized_keys` permissions (should be 600)
- Test SSH connection manually

### PM2 Process Not Starting

**Problem:** Frontend not accessible

**Solution:**
```bash
cd /var/www/webapp
pm2 delete rentapp-frontend
pm2 start ecosystem.config.js
pm2 save
```

### Nginx 502 Bad Gateway

**Problem:** Backend or frontend not responding

**Solution:**
```bash
# Check if services are running
pm2 list
sudo systemctl status php8.2-fpm

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart services
sudo systemctl restart nginx
sudo systemctl restart php8.2-fpm
pm2 restart rentapp-frontend
```

### Database Connection Errors

**Problem:** Laravel can't connect to database

**Solution:**
```bash
# Test database connection
mysql -u rentapp_user -p rentapp_production

# Check .env file
cat /var/www/webapp/backend/.env | grep DB_

# Verify database exists
sudo mysql -e "SHOW DATABASES;"
```

### Frontend Build Fails

**Problem:** `npm run build` fails during deployment

**Solution:**
```bash
cd /var/www/webapp/frontend
rm -rf node_modules .next
npm ci
npm run build
```

### Out of Memory During Build

**Problem:** Build process runs out of memory

**Solution:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build
```

Or add to your deployment script.

---

## Maintenance

### Manual Deployment

If you need to deploy manually:

```bash
cd /var/www/webapp
./deploy.sh
```

### View Logs

```bash
# PM2 logs (frontend)
pm2 logs rentapp-frontend

# Laravel logs (backend)
tail -f /var/www/webapp/backend/storage/logs/laravel.log

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Restart Services

```bash
# Restart all services
sudo systemctl restart nginx
sudo systemctl restart php8.2-fpm
pm2 restart rentapp-frontend

# Or restart everything via PM2
pm2 restart all
```

### Update Dependencies

```bash
# Backend
cd /var/www/webapp/backend
composer update --no-dev

# Frontend
cd /var/www/webapp/frontend
npm update
npm run build
pm2 restart rentapp-frontend
```

### Rollback Deployment

If something goes wrong:

```bash
cd /var/www/webapp
git log  # Find the previous commit hash
git reset --hard <previous-commit-hash>
./deploy.sh
```

Or use a backup:

```bash
cd /var/www/webapp
ls backups/  # List available backups
tar -xzf backups/backup_YYYYMMDD_HHMMSS.tar.gz
```

---

## Security Best Practices

1. **Keep dependencies updated:**
   ```bash
   composer update --no-dev
   npm update
   ```

2. **Set up SSL/HTTPS** (Let's Encrypt):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

3. **Configure firewall:**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

4. **Regular backups:**
   - Database backups
   - File backups
   - Configuration backups

5. **Monitor logs regularly:**
   - Check for suspicious activity
   - Monitor error rates
   - Review access logs

---

## Next Steps

- [ ] Set up SSL certificate (Let's Encrypt)
- [ ] Configure domain name DNS
- [ ] Set up monitoring (optional)
- [ ] Configure automated backups
- [ ] Set up staging environment (optional)

---

## Support

If you encounter issues:

1. Check GitHub Actions logs
2. Check server logs (see Maintenance section)
3. Verify all secrets are set correctly
4. Ensure all services are running
5. Review this guide for common issues

---

**Last Updated:** November 21, 2025

