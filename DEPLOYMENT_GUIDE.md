# 🚀 Comprehensive Deployment Guide - Rent V2

**Complete, step-by-step guide for deploying Rent V2 application to production**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Server Configuration](#server-configuration)
5. [Application Setup](#application-setup)
6. [Database Setup](#database-setup)
7. [Web Server Configuration](#web-server-configuration)
8. [Automated Deployment](#automated-deployment)
9. [Background Services](#background-services)
10. [SSL/HTTPS Setup](#sslhttps-setup)
11. [Post-Deployment](#post-deployment)
12. [Monitoring & Maintenance](#monitoring--maintenance)
13. [Troubleshooting](#troubleshooting)
14. [Quick Reference](#quick-reference)

---

## Prerequisites

Before starting, ensure you have:

- ✅ **VPS Server** (DigitalOcean, AWS EC2, Linode, etc.)
  - Minimum: 2GB RAM, 1 CPU core, 20GB storage
  - Recommended: 4GB RAM, 2 CPU cores, 40GB storage
- ✅ **Domain Name** (optional but recommended)
- ✅ **SSH Access** to your server
- ✅ **GitHub Repository** with your code
- ✅ **Basic Terminal/SSH Knowledge**

### Server Requirements

- **OS:** Ubuntu 20.04+ or CentOS 8+ (Ubuntu recommended)
- **PHP:** 8.2 or 8.3 with extensions: `mysql`, `xml`, `mbstring`, `curl`, `zip`, `gd`, `bcmath`
- **Node.js:** 18.x or 20.x
- **MySQL:** 8.0+
- **Nginx:** Latest stable version
- **Composer:** Latest version
- **Git:** Latest version

---

## Quick Start

**For experienced users who want to get started quickly:**

```bash
# 1. Connect to server
ssh root@YOUR_SERVER_IP

# 2. Run server setup script (if available)
cd /tmp
wget https://raw.githubusercontent.com/YOUR_USERNAME/RentApplicaiton/main/scripts/server-setup.sh
chmod +x server-setup.sh
sudo ./server-setup.sh

# 3. Clone repository
sudo mkdir -p /var/www/webapp
sudo chown -R $USER:$USER /var/www/webapp
cd /var/www/webapp
git clone https://github.com/YOUR_USERNAME/RentApplicaiton.git .

# 4. Run deployment script
chmod +x deploy.sh
./deploy.sh
```

**For detailed step-by-step instructions, continue reading below.**

---

## Detailed Setup

### Step 1: Connect to Your Server

#### On Windows:
1. Download **PuTTY** from https://www.putty.org/
2. Open PuTTY
3. Enter your server IP address
4. Port: `22`
5. Connection type: SSH
6. Click "Open"
7. Login with username (usually `root` or `ubuntu`) and password

#### On Mac/Linux:
```bash
ssh root@YOUR_SERVER_IP
# or
ssh ubuntu@YOUR_SERVER_IP
```

Replace `YOUR_SERVER_IP` with your actual server IP address.

---

### Step 2: Update Server

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Or on CentOS/RHEL:
sudo yum update -y && sudo yum upgrade -y
```

---

### Step 3: Install Required Software

#### 3.1 Install Basic Tools

```bash
# Ubuntu/Debian
sudo apt install -y git curl wget unzip software-properties-common

# CentOS/RHEL
sudo yum install -y git curl wget unzip
```

#### 3.2 Install PHP 8.2/8.3

**Ubuntu/Debian:**
```bash
# Add PHP repository
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# Install PHP 8.3 and extensions
sudo apt install -y php8.3 php8.3-fpm php8.3-mysql php8.3-xml \
    php8.3-mbstring php8.3-curl php8.3-zip php8.3-gd php8.3-bcmath \
    php8.3-intl php8.3-cli
```

**CentOS/RHEL:**
```bash
# Enable Remi repository
sudo yum install -y https://rpms.remirepo.net/enterprise/remi-release-8.rpm
sudo yum module reset -y php
sudo yum module enable -y php:remi-8.3

# Install PHP 8.3 and extensions
sudo yum install -y php php-fpm php-mysqlnd php-xml php-mbstring \
    php-curl php-zip php-gd php-bcmath php-intl
```

**Verify PHP installation:**
```bash
php -v  # Should show PHP 8.2.x or 8.3.x
```

#### 3.3 Install Composer

```bash
# Download and install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer

# Verify
composer --version
```

#### 3.4 Install Node.js 20

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**CentOS/RHEL:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

**Verify:**
```bash
node -v  # Should show v20.x.x
npm -v   # Should show npm version
```

#### 3.5 Install Nginx

**Ubuntu/Debian:**
```bash
sudo apt install -y nginx
```

**CentOS/RHEL:**
```bash
sudo yum install -y nginx
```

**Start and enable Nginx:**
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 3.6 Install MySQL

**Ubuntu/Debian:**
```bash
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

**CentOS/RHEL:**
```bash
sudo yum install -y mysql-server
sudo systemctl start mysqld
sudo systemctl enable mysqld
```

**Secure MySQL installation:**
```bash
sudo mysql_secure_installation
```

Follow the prompts:
- Set root password: **Yes** (choose a strong password)
- Remove anonymous users: **Yes**
- Disallow root login remotely: **Yes**
- Remove test database: **Yes**
- Reload privilege tables: **Yes**

---

## Application Setup

### Step 4: Create Application Directory

```bash
# Create directory
sudo mkdir -p /var/www/webapp

# Set ownership
sudo chown -R $USER:$USER /var/www/webapp

# Set permissions
sudo chmod -R 755 /var/www/webapp

# Navigate to directory
cd /var/www/webapp
```

### Step 5: Clone Repository

```bash
cd /var/www/webapp

# Clone your repository
git clone https://github.com/YOUR_USERNAME/RentApplicaiton.git .

# Or if repository is private, use SSH:
# git clone git@github.com:YOUR_USERNAME/RentApplicaiton.git .
```

**Replace `YOUR_USERNAME` and `RentApplicaiton` with your actual GitHub username and repository name.**

### Step 6: Configure Backend

```bash
cd /var/www/webapp/backend

# Copy environment file
cp .env.example .env
# Or if .env.example doesn't exist:
# cp ../env/backend.env.example .env

# Edit .env file
nano .env
```

**Update these critical values in `.env`:**

```env
APP_NAME=RentApplication
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com
# Or if using IP: APP_URL=http://YOUR_SERVER_IP

# Database Configuration
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=rentapp_production
DB_USERNAME=rentapp_user
DB_PASSWORD=your_secure_password_here

# Frontend URL
FRONTEND_URL=https://yourdomain.com
# Or: FRONTEND_URL=http://YOUR_SERVER_IP

# CORS Configuration (for production)
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Sanctum Configuration
SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com

# Mail Configuration (update with your SMTP settings)
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host.com
MAIL_PORT=587
MAIL_USERNAME=your-email@domain.com
MAIL_PASSWORD=your-email-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="${APP_NAME}"

# Queue Configuration
QUEUE_CONNECTION=database
# Or for better performance: QUEUE_CONNECTION=redis

# Cache Configuration
CACHE_DRIVER=file
# Or for better performance: CACHE_DRIVER=redis
```

**Save and exit:** `Ctrl + X`, then `Y`, then `Enter`

**Generate application key:**
```bash
php artisan key:generate
```

**Install dependencies:**
```bash
composer install --no-dev --optimize-autoloader --no-interaction
```

**Set permissions:**
```bash
sudo chmod -R 775 storage bootstrap/cache
sudo chown -R www-data:www-data storage bootstrap/cache
```

**Create storage link:**
```bash
php artisan storage:link
```

### Step 7: Configure Frontend

```bash
cd /var/www/webapp/frontend

# Copy environment file
cp .env.example .env.local
# Or if .env.example doesn't exist:
# cp ../env/frontend.env.example .env.local

# Edit .env.local file
nano .env.local
```

**Update these values:**

```env
NEXT_PUBLIC_APP_NAME=RentApplication
NEXT_PUBLIC_APP_ENV=production

# API URL - Use relative path when behind reverse proxy
NEXT_PUBLIC_API_URL=/api/v1

# Or if accessing API directly:
# NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1

# Currency Configuration
NEXT_PUBLIC_PRIMARY_CURRENCY=MVR
NEXT_PUBLIC_SECONDARY_CURRENCY=USD
```

**Save and exit:** `Ctrl + X`, then `Y`, then `Enter`

**Install dependencies:**
```bash
npm ci
```

**Build for production:**
```bash
npm run build
```

---

## Database Setup

### Step 8: Create Database and User

```bash
# Log into MySQL
sudo mysql -u root -p
```

**Enter your MySQL root password when prompted.**

**Inside MySQL, run these commands:**

```sql
-- Create database
CREATE DATABASE rentapp_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (replace 'your_secure_password' with a strong password)
CREATE USER 'rentapp_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON rentapp_production.* TO 'rentapp_user'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

**Important:** Use the same password you set in your `.env` file!

### Step 9: Run Database Migrations

```bash
cd /var/www/webapp/backend

# Run migrations
php artisan migrate --force

# Seed database (optional - only if you have seeders)
# php artisan db:seed --force
```

**Verify migrations:**
```bash
php artisan migrate:status
```

---

## Web Server Configuration

### Step 10: Configure Nginx

**Create Nginx configuration file:**

```bash
sudo nano /etc/nginx/sites-available/rentapp
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    # Or if using IP: server_name YOUR_SERVER_IP;

    # Increase upload size limit
    client_max_body_size 20M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/rss+xml
        font/truetype
        font/opentype
        application/vnd.ms-fontobject
        image/svg+xml;

    # Proxy API calls to Laravel backend (PHP-FPM)
    location /api/ {
        try_files $uri $uri/ /index.php?$query_string;
        
        # PHP handling via PHP-FPM
        location ~ \.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/run/php/php8.3-fpm.sock;
            # Or for PHP 8.2: fastcgi_pass unix:/run/php/php8.2-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
            include fastcgi_params;
        }
    }

    # Serve Laravel storage files
    location /storage {
        alias /var/www/webapp/backend/storage/app/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Proxy everything else to Next.js frontend (PM2 on port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_intercept_errors on;
        proxy_connect_timeout 60s;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_buffering off;
    }

    # Serve Next.js static files directly
    location /_next/static {
        alias /var/www/webapp/frontend/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Block access to sensitive files
    location ~ /\.(?!well-known) {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Block access to .env files
    location ~ \.env$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

**Important:** 
- Replace `yourdomain.com` with your actual domain
- Replace `php8.3-fpm.sock` with `php8.2-fpm.sock` if using PHP 8.2
- If using IP address, replace `server_name` with your IP

**Save and exit:** `Ctrl + X`, then `Y`, then `Enter`

**Enable the site:**
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/rentapp /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t
```

**If test passes, reload Nginx:**
```bash
sudo systemctl reload nginx
```

**Start PHP-FPM:**
```bash
# For PHP 8.3
sudo systemctl start php8.3-fpm
sudo systemctl enable php8.3-fpm

# Or for PHP 8.2
sudo systemctl start php8.2-fpm
sudo systemctl enable php8.2-fpm
```

---

## Automated Deployment

### Step 11: Set Up GitHub Actions Deployment

#### 11.1 Generate SSH Key (On Your Local Computer)

**Windows (PowerShell):**
```powershell
ssh-keygen -t ed25519 -C "github-actions-deploy" -f $env:USERPROFILE\.ssh\github_actions_deploy
# Press Enter when asked for passphrase (leave empty)
```

**Mac/Linux:**
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy
# Press Enter when asked for passphrase (leave empty)
```

#### 11.2 Add Public Key to Server

**Display public key:**

**Windows:**
```powershell
Get-Content $env:USERPROFILE\.ssh\github_actions_deploy.pub
```

**Mac/Linux:**
```bash
cat ~/.ssh/github_actions_deploy.pub
```

**Copy the entire output** (starts with `ssh-ed25519`)

**On your server:**
```bash
# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add public key
nano ~/.ssh/authorized_keys
```

**Paste the public key at the end of the file, save and exit.**

```bash
# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
```

#### 11.3 Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

**Add these secrets:**

1. **SSH_PRIVATE_KEY**
   - Name: `SSH_PRIVATE_KEY`
   - Value: Copy your **private** key:
     - Windows: `Get-Content $env:USERPROFILE\.ssh\github_actions_deploy`
     - Mac/Linux: `cat ~/.ssh/github_actions_deploy`
   - Include everything from `-----BEGIN OPENSSH PRIVATE KEY-----` to `-----END OPENSSH PRIVATE KEY-----`

2. **SSH_USER**
   - Name: `SSH_USER`
   - Value: Your server username (usually `root` or `ubuntu`)

3. **SSH_HOST**
   - Name: `SSH_HOST`
   - Value: Your server IP address or domain name

4. **APP_DIRECTORY** (Optional)
   - Name: `APP_DIRECTORY`
   - Value: `/var/www/webapp`

#### 11.4 Make Deployment Script Executable

```bash
cd /var/www/webapp
chmod +x deploy.sh
```

**Test deployment script:**
```bash
./deploy.sh
```

---

## Background Services

### Step 12: Set Up Queue Workers

**Install Supervisor (if not already installed):**

```bash
# Ubuntu/Debian
sudo apt install -y supervisor

# CentOS/RHEL
sudo yum install -y supervisor
```

**Create Supervisor configuration:**

```bash
sudo nano /etc/supervisor/conf.d/rentapp-queue-worker.conf
```

**Paste this configuration:**

```ini
[program:rentapp-queue-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/webapp/backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/webapp/backend/storage/logs/queue-worker.log
stopwaitsecs=3600
```

**Save and exit, then:**

```bash
# Reload Supervisor
sudo supervisorctl reread
sudo supervisorctl update

# Start queue workers
sudo supervisorctl start rentapp-queue-worker:*

# Check status
sudo supervisorctl status rentapp-queue-worker:*
```

### Step 13: Set Up PM2 for Frontend

**Install PM2 globally:**

```bash
sudo npm install -g pm2
```

**Start frontend with PM2:**

```bash
cd /var/www/webapp
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Follow the command PM2 outputs to enable startup on boot.**

**Check PM2 status:**
```bash
pm2 status
pm2 logs rentapp-frontend
```

### Step 14: Set Up Scheduled Tasks

```bash
# Open crontab
sudo crontab -e
```

**Add this line:**

```
* * * * * cd /var/www/webapp/backend && php artisan schedule:run >> /dev/null 2>&1
```

**Save and exit.**

**Verify scheduled tasks:**
```bash
cd /var/www/webapp/backend
php artisan schedule:list
```

---

## SSL/HTTPS Setup

### Step 15: Install SSL Certificate

**Install Certbot:**

```bash
# Ubuntu/Debian
sudo apt install -y certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install -y certbot python3-certbot-nginx
```

**Get SSL certificate:**

```bash
# Replace yourdomain.com with your actual domain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Follow the prompts:**
- Enter your email address
- Agree to terms (type `A` and press Enter)
- Choose whether to share email (type `Y` or `N`)
- Certbot will automatically configure Nginx!

**Test auto-renewal:**

```bash
sudo certbot renew --dry-run
```

**Certbot automatically sets up renewal, so certificates will renew automatically.**

---

## Post-Deployment

### Step 16: Optimize Laravel

```bash
cd /var/www/webapp/backend

# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache

# Optimize
php artisan optimize
```

### Step 17: Test Your Application

**1. Test API health endpoint:**
```bash
curl http://localhost/api/v1/health
# Or: curl https://yourdomain.com/api/v1/health
```

**2. Test frontend:**
- Open browser: `https://yourdomain.com`
- You should see your application

**3. Test login:**
- Try logging in with your credentials
- Create a test user if needed

**4. Check services:**
```bash
# Check Nginx
sudo systemctl status nginx

# Check PHP-FPM
sudo systemctl status php8.3-fpm
# Or: sudo systemctl status php8.2-fpm

# Check MySQL
sudo systemctl status mysql
# Or: sudo systemctl status mysqld

# Check queue workers
sudo supervisorctl status rentapp-queue-worker:*

# Check PM2
pm2 status
```

---

## Monitoring & Maintenance

### Step 18: Set Up Monitoring

**View logs:**

```bash
# Laravel logs
tail -f /var/www/webapp/backend/storage/logs/laravel.log

# Queue worker logs
tail -f /var/www/webapp/backend/storage/logs/queue-worker.log

# PM2 logs
pm2 logs rentapp-frontend

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

**Set up automated backups:**

```bash
# Create backup script
nano /var/www/webapp/scripts/backup-database.sh
```

**Paste:**

```bash
#!/bin/bash
BACKUP_DIR="/var/www/webapp/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u rentapp_user -p'YOUR_PASSWORD' rentapp_production > $BACKUP_DIR/backup_$DATE.sql
# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

**Make executable:**
```bash
chmod +x /var/www/webapp/scripts/backup-database.sh
```

**Add to crontab (daily at 2 AM):**
```bash
sudo crontab -e
# Add: 0 2 * * * /var/www/webapp/scripts/backup-database.sh
```

---

## Troubleshooting

### Common Issues

#### Issue: "502 Bad Gateway"

**Solution:**
```bash
# Check PHP-FPM status
sudo systemctl status php8.3-fpm

# Restart PHP-FPM
sudo systemctl restart php8.3-fpm

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

#### Issue: "Permission denied" errors

**Solution:**
```bash
sudo chown -R www-data:www-data /var/www/webapp/backend/storage
sudo chown -R www-data:www-data /var/www/webapp/backend/bootstrap/cache
sudo chmod -R 775 /var/www/webapp/backend/storage
sudo chmod -R 775 /var/www/webapp/backend/bootstrap/cache
```

#### Issue: Database connection error

**Solution:**
```bash
# Test database connection
mysql -u rentapp_user -p rentapp_production

# Check .env file
cat /var/www/webapp/backend/.env | grep DB_

# Verify database exists
mysql -u root -p -e "SHOW DATABASES;"
```

#### Issue: Frontend not loading

**Solution:**
```bash
# Check PM2 status
pm2 status

# Restart PM2
pm2 restart rentapp-frontend

# Check PM2 logs
pm2 logs rentapp-frontend

# Rebuild frontend
cd /var/www/webapp/frontend
npm run build
pm2 restart rentapp-frontend
```

#### Issue: Queue workers not processing

**Solution:**
```bash
# Check Supervisor status
sudo supervisorctl status rentapp-queue-worker:*

# Restart workers
sudo supervisorctl restart rentapp-queue-worker:*

# Check logs
tail -f /var/www/webapp/backend/storage/logs/queue-worker.log
```

#### Issue: GitHub Actions deployment fails

**Solution:**
1. Check GitHub Actions logs for specific error
2. Verify SSH keys are set up correctly
3. Test SSH connection manually:
   ```bash
   ssh -i ~/.ssh/github_actions_deploy root@YOUR_SERVER_IP
   ```
4. Verify all GitHub secrets are added correctly

---

## Quick Reference

### Important File Locations

- **App directory:** `/var/www/webapp`
- **Backend .env:** `/var/www/webapp/backend/.env`
- **Frontend .env:** `/var/www/webapp/frontend/.env.local`
- **Deploy script:** `/var/www/webapp/deploy.sh`
- **Nginx config:** `/etc/nginx/sites-available/rentapp`
- **Supervisor config:** `/etc/supervisor/conf.d/rentapp-queue-worker.conf`
- **PM2 config:** `/var/www/webapp/ecosystem.config.js`

### Common Commands

```bash
# Navigate to app
cd /var/www/webapp

# Manual deployment
./deploy.sh

# Backend commands
cd backend
php artisan migrate --force
php artisan optimize
php artisan cache:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Frontend commands
cd frontend
npm run build
pm2 restart rentapp-frontend

# Service management
sudo systemctl restart nginx
sudo systemctl restart php8.3-fpm
sudo supervisorctl restart rentapp-queue-worker:*
pm2 restart rentapp-frontend

# View logs
tail -f backend/storage/logs/laravel.log
pm2 logs rentapp-frontend
sudo tail -f /var/log/nginx/error.log
```

### Health Check Endpoints

- **API Health:** `https://yourdomain.com/api/v1/health`
- **Frontend:** `https://yourdomain.com`

---

## Deployment Checklist

Before considering deployment complete:

- [ ] Server updated and all software installed
- [ ] Application cloned and configured
- [ ] Database created and migrations run
- [ ] Backend .env configured correctly
- [ ] Frontend .env.local configured correctly
- [ ] Nginx configured and running
- [ ] PHP-FPM running
- [ ] Frontend built and running (PM2)
- [ ] Queue workers running (Supervisor)
- [ ] Scheduled tasks configured (Cron)
- [ ] SSL certificate installed (if using domain)
- [ ] GitHub Actions deployment working
- [ ] Website accessible in browser
- [ ] API health check working
- [ ] Can log in to application
- [ ] File uploads working
- [ ] Automated backups configured

---

## Support & Resources

- **GitHub Repository:** [Your Repository URL]
- **Documentation:** See `README.md` and `docs/` directory
- **Issues:** Check GitHub Issues for known problems
- **Logs:** Always check logs first when troubleshooting

---

## Security Best Practices

1. **Keep server updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Use strong passwords** for database and SSH

3. **Configure firewall:**
   ```bash
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   ```

4. **Disable root login** (recommended):
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Set: PermitRootLogin no
   sudo systemctl restart sshd
   ```

5. **Regular backups** (automated daily)

6. **Monitor logs** regularly

7. **Keep dependencies updated:**
   ```bash
   cd /var/www/webapp/backend
   composer update --no-dev
   
   cd ../frontend
   npm update
   ```

---

**Last Updated:** January 2025  
**Version:** 2.0  
**Maintained by:** Development Team

---

**🎉 Congratulations! Your Rent V2 application should now be deployed and running in production!**

