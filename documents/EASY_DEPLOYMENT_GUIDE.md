# 🚀 Easy Deployment Guide - Complete Step-by-Step

**For Non-Technical Users - Just Copy and Paste!**

This guide will help you deploy RentApplication to a server, even if you've never done it before. Just follow each step and copy-paste the commands exactly as shown.

---

## 📋 Table of Contents

1. [What You Need Before Starting](#what-you-need-before-starting)
2. [Step 1: Connect to Your Server](#step-1-connect-to-your-server)
3. [Step 2: Install Required Software](#step-2-install-required-software)
4. [Step 3: Set Up Your Application](#step-3-set-up-your-application)
5. [Step 4: Configure Database](#step-4-configure-database)
6. [Step 5: Set Up Web Server](#step-5-set-up-web-server)
7. [Step 6: Set Up Automated Deployment](#step-6-set-up-automated-deployment)
8. [Step 7: Set Up Background Workers](#step-7-set-up-background-workers)
9. [Step 8: Set Up Scheduled Tasks](#step-8-set-up-scheduled-tasks)
10. [Step 9: Set Up SSL (HTTPS)](#step-9-set-up-ssl-https)
11. [Step 10: Test Everything](#step-10-test-everything)
12. [Troubleshooting](#troubleshooting)

---

## What You Need Before Starting

Before you begin, make sure you have:

- ✅ A server (VPS) - DigitalOcean, AWS, Linode, etc.
- ✅ Your server's IP address
- ✅ Username and password to access your server (usually `root` or `ubuntu`)
- ✅ A way to connect to your server (we'll use SSH)
- ✅ Your GitHub repository URL
- ✅ A domain name (optional but recommended)

**Don't worry if you don't understand these terms - we'll explain everything!**

---

## Step 1: Connect to Your Server

### On Windows:

1. **Download PuTTY** (if you don't have it):
   - Go to: https://www.putty.org/
   - Download and install PuTTY

2. **Open PuTTY** and enter:
   - **Host Name:** Your server IP address (e.g., `123.45.67.89`)
   - **Port:** `22`
   - **Connection Type:** SSH
   - Click **Open**

3. **Login:**
   - When asked for username, type: `root` (or `ubuntu` if that's your username)
   - Press Enter
   - When asked for password, type your password (you won't see it as you type - that's normal)
   - Press Enter

### On Mac or Linux:

1. **Open Terminal** (search for "Terminal" in Applications)

2. **Connect to your server:**
   ```bash
   ssh root@YOUR_SERVER_IP
   ```
   Replace `YOUR_SERVER_IP` with your actual server IP address.

3. **Enter your password** when prompted

---

## Step 2: Install Required Software

**What we're doing:** Installing all the software your application needs to run.

**Just copy and paste these commands one by one:**

```bash
# Update your server (this might take a few minutes)
sudo yum update -y && sudo yum upgrade -y
```

```bash
# Install basic tools
sudo yum install -y git curl wget unzip
```

```bash
# Enable Remi repository to get PHP 8.2 packages
sudo yum install -y https://rpms.remirepo.net/enterprise/remi-release-8.rpm
sudo yum module reset -y php
sudo yum module enable -y php:remi-8.2

# Install PHP 8.2 and required extensions
sudo yum install -y php php-fpm php-mysqlnd php-xml php-mbstring php-curl php-zip php-gd php-bcmath php-intl
```

```bash
# Install Composer (PHP package manager)
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer
```

```bash
# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

```bash
# Install Nginx (web server)
sudo yum install -y nginx
```

```bash
# Install MySQL (database)
sudo yum install -y mysql-server
```

**Wait for each command to finish before running the next one!**

**Verify everything installed correctly:**
```bash
php -v
composer -v
node -v
nginx -v
mysql --version
```

You should see version numbers for each. If you see errors, let me know what they say.

---

## Step 3: Set Up Your Application

**What we're doing:** Downloading your code and setting it up on the server.

### 3.1: Create Application Directory

```bash
# Create the folder where your app will live
sudo mkdir -p /var/www/webapp

# Give yourself permission to use this folder
sudo chown -R $USER:$USER /var/www/webapp

# Go into the folder
cd /var/www/webapp
```

### 3.2: Download Your Code from GitHub

**Option A: If your repository is public:**

```bash
# Replace YOUR_USERNAME and YOUR_REPO_NAME with your actual GitHub details
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git .
```

**Example:** If your repo is `https://github.com/john/rentapp`, use:
```bash
git clone https://github.com/john/rentapp.git .
```

**Option B: If your repository is private:**

You'll need to set up SSH keys. For now, let's use HTTPS with a personal access token:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with `repo` permission
3. Copy the token
4. Use it like this:

```bash
git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO_NAME.git .
```

### 3.3: Set Up Backend

```bash
# Go to backend folder
cd /var/www/webapp/backend

# Copy the example environment file
cp .env.example .env

# If .env.example doesn't exist, use this instead:
cp ../env/backend.env.example .env
```

**Now edit the .env file:**

```bash
# Open the file for editing
nano .env
```

**In the editor, find and change these lines:**

```
APP_NAME=RentApplicaiton
APP_ENV=production
APP_DEBUG=false
APP_URL=http://YOUR_SERVER_IP
```

Replace `YOUR_SERVER_IP` with your actual server IP (or domain name if you have one).

**Also update the database section (we'll create the database in the next step):**

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=rentapp_production
DB_USERNAME=rentapp_user
DB_PASSWORD=your_secure_password_here
```

**To save in nano:**
- Press `Ctrl + X`
- Press `Y` (for Yes)
- Press `Enter`

**Continue with backend setup:**

```bash
# Install PHP packages
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

# Generate application key
php artisan key:generate

# Set proper permissions
sudo chmod -R 775 storage bootstrap/cache
sudo chown -R www-data:www-data storage bootstrap/cache

# Create storage link (for file uploads)
php artisan storage:link
```

### 3.4: Set Up Frontend

```bash
# Go to frontend folder
cd /var/www/webapp/frontend

# Copy environment file
cp .env.example .env.local

# If .env.example doesn't exist, use this instead:
cp ../env/frontend.env.example .env.local
```

**Edit the frontend environment file:**

```bash
nano .env.local
```

**Make sure it has:**

```
NEXT_PUBLIC_APP_NAME=RentApplicaiton
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_URL=/api/v1
```

**Save and exit (Ctrl+X, Y, Enter)**

**Install and build frontend:**

```bash
# Install Node packages
npm ci

# Build for production
npm run build
```

---

## Step 4: Configure Database

**What we're doing:** Creating a database for your application to store data.

### 4.1: Secure MySQL Installation

```bash
# Run MySQL security script
sudo mysql_secure_installation
```

**Answer the questions:**
- Enter password for root user: Press Enter (if no password set) or enter your MySQL root password
- Set root password? Type `Y` and enter a strong password (write it down!)
- Remove anonymous users? Type `Y`
- Disallow root login remotely? Type `Y`
- Remove test database? Type `Y`
- Reload privilege tables? Type `Y`

### 4.2: Create Database and User

```bash
# Log into MySQL
sudo mysql -u root -p
```

Enter your MySQL root password when prompted.

**Inside MySQL, copy and paste these commands (replace the password):**

```sql
CREATE DATABASE rentapp_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'rentapp_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';

GRANT ALL PRIVILEGES ON rentapp_production.* TO 'rentapp_user'@'localhost';

FLUSH PRIVILEGES;

EXIT;
```

**Important:** Replace `your_secure_password_here` with a strong password. Use the same password you put in your `.env` file!

### 4.3: Run Database Migrations

```bash
# Go to backend folder
cd /var/www/webapp/backend

# Run migrations (this creates all the database tables)
php artisan migrate --force
```

**If you see errors, check:**
1. Database name matches in `.env` and MySQL
2. Username matches
3. Password matches
4. Database was created successfully

---

## Step 5: Set Up Web Server (Nginx)

**What we're doing:** Configuring Nginx to serve your application.

### 5.1: Create Nginx Configuration (PHP-FPM)

We will configure Nginx to serve Laravel directly via PHP-FPM (the correct way for production). You can host the Next.js frontend separately (for example on a different domain or port). If you want to serve Next.js from the same server, add another server block later for the frontend.

```bash
# Create configuration file
sudo nano /etc/nginx/sites-available/rentapp
```

**Copy and paste this entire configuration:**

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP_OR_DOMAIN;

    # Increase upload size
    client_max_body_size 20M;

    root /var/www/webapp/backend/public;
    index index.php index.html;

    # Laravel routes
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP handling via PHP-FPM
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny access to sensitive files (.env, etc.)
    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Storage (public) files
    location /storage {
        alias /var/www/webapp/backend/storage/app/public;
        expires 30d;
        add_header Cache-Control "public";
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

> **Important:** Laravel is now served by PHP-FPM. Do **not** run `php artisan serve` in production. If you need to expose the Next.js frontend from the same server, create another Nginx server block that proxies to `127.0.0.1:3000` or deploy the frontend to a service like Vercel/Netlify.

**Important:** Replace `YOUR_SERVER_IP_OR_DOMAIN` with your server IP or domain name.

**Save and exit:** Ctrl+X, Y, Enter

### 5.2: Enable the Site

```bash
# Create link to enable the site
sudo ln -s /etc/nginx/sites-available/rentapp /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t
```

**You should see:** `syntax is ok` and `test is successful`

**If you see errors, check:**
- Did you replace `YOUR_SERVER_IP_OR_DOMAIN`?
- Are there any typos in the configuration?

### 5.3: Start Services

```bash
# Start Nginx
sudo systemctl start nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Start PHP-FPM (CentOS service name is php-fpm)
sudo systemctl start php-fpm

# Enable PHP-FPM to start on boot
sudo systemctl enable php-fpm

# Check status
sudo systemctl status nginx
sudo systemctl status php-fpm
```

**Press `q` to exit the status view.**

### 5.4: Start Your Application

PHP-FPM runs as a service, so Laravel is already handled by systemd (no need for `php artisan serve`). Simply restart PHP-FPM and Nginx after deployment:

```bash
sudo systemctl restart php8.2-fpm
sudo systemctl restart nginx
```

For the Next.js frontend you have two options:

1. **Host separately** (recommended) — deploy to Vercel/Netlify and point it to your API URL.
2. **Host on the same server** — run `npm start` (or `npm run start`) and add another Nginx server block that proxies to `127.0.0.1:3000`. If you do this, use Supervisor to keep the Node process alive (instructions later in this guide).

**Check Laravel health endpoint:**

```bash
curl http://127.0.0.1/api/health
```

You should see a JSON response with `"status": "healthy"`.

---

## Step 6: Set Up Automated Deployment

**What we're doing:** Making it so when you push code to GitHub, it automatically deploys.

### 6.1: Make Deployment Script Executable

```bash
# Copy deployment script to app directory
cp /var/www/webapp/config/deploy/deploy.sh /var/www/webapp/deploy.sh

# Make it executable
chmod +x /var/www/webapp/deploy.sh
```

### 6.2: Set Up SSH Key for GitHub Actions

**On your local computer (Windows):**

1. Open PowerShell
2. Run:
```powershell
ssh-keygen -t ed25519 -C "github-actions-deploy" -f $env:USERPROFILE\.ssh\github_actions_deploy
```
3. When asked for passphrase, just press Enter (leave it empty)
4. Display the public key:
```powershell
Get-Content $env:USERPROFILE\.ssh\github_actions_deploy.pub
```
5. **Copy the entire output** (starts with `ssh-ed25519`)

**On your local computer (Mac/Linux):**

1. Open Terminal
2. Run:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy
```
3. When asked for passphrase, just press Enter
4. Display the public key:
```bash
cat ~/.ssh/github_actions_deploy.pub
```
5. **Copy the entire output**

### 6.3: Add SSH Key to Server

**Back on your server, run:**

```bash
# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add the public key
nano ~/.ssh/authorized_keys
```

**Paste your public key at the end of the file, then save (Ctrl+X, Y, Enter)**

```bash
# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
```

### 6.4: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**

**Add these 3 secrets:**

**Secret 1: SSH_PRIVATE_KEY**
- Name: `SSH_PRIVATE_KEY`
- Value: Copy your **private** key:
  - Windows: `Get-Content $env:USERPROFILE\.ssh\github_actions_deploy`
  - Mac/Linux: `cat ~/.ssh/github_actions_deploy`
- Click **Add secret**

**Secret 2: SSH_USER**
- Name: `SSH_USER`
- Value: `root` (or `ubuntu` if that's your username)
- Click **Add secret**

**Secret 3: SSH_HOST**
- Name: `SSH_HOST`
- Value: Your server IP address (e.g., `123.45.67.89`)
- Click **Add secret**

**Optional Secret 4: APP_DIRECTORY**
- Name: `APP_DIRECTORY`
- Value: `/var/www/webapp`
- Click **Add secret**

---

## Step 7: Set Up Background Workers

**What we're doing:** Setting up workers to process emails, SMS, and background tasks.

```bash
# Make the script executable
chmod +x /var/www/webapp/scripts/setup-queue-worker.sh

# Run the setup script
sudo /var/www/webapp/scripts/setup-queue-worker.sh
```

**Verify it's working:**

```bash
sudo supervisorctl status rentapp-queue-worker:*
```

**You should see workers running!**

---

## Step 8: Set Up Scheduled Tasks

**What we're doing:** Setting up automatic tasks (like generating invoices daily).

```bash
# Open crontab editor
sudo crontab -e
```

**If asked to choose an editor, type `1` and press Enter (for nano)**

**Add this line at the end of the file:**

```
* * * * * cd /var/www/webapp/backend && php artisan schedule:run >> /dev/null 2>&1
```

**Save and exit:** Ctrl+X, Y, Enter

**Verify it's set up:**

```bash
cd /var/www/webapp/backend
php artisan schedule:list
```

**You should see scheduled tasks listed!**

---

## Step 9: Set Up SSL (HTTPS)

**What we're doing:** Making your site secure with HTTPS (the padlock icon).

### 9.1: Install Certbot

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx
```

### 9.2: Get SSL Certificate

**If you have a domain name:**

```bash
# Replace yourdomain.com with your actual domain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Follow the prompts:**
- Enter your email address
- Agree to terms (type `A` and press Enter)
- Choose whether to share email (type `Y` or `N`)
- Certbot will automatically configure Nginx!

**If you only have an IP address:**

You can't get a free SSL certificate for an IP address. You'll need a domain name first.

### 9.3: Auto-Renewal (Already Set Up)

Certbot automatically sets up renewal. Test it:

```bash
sudo certbot renew --dry-run
```

---

## Step 10: Test Everything

### 10.1: Test Your Website

**Open your browser and go to:**
- `http://YOUR_SERVER_IP` (or `https://yourdomain.com` if you set up SSL)

**You should see your application!**

### 10.2: Test API

**In your browser, go to:**
- `http://YOUR_SERVER_IP/api/health`

**You should see:** `{"status":"healthy",...}`

### 10.3: Test Login

1. Go to your website
2. Try to log in (you'll need to create a user first or use existing credentials)

### 10.4: Check Services

```bash
# Check Nginx
sudo systemctl status nginx

# Check PHP-FPM
sudo systemctl status php8.2-fpm

# Check MySQL
sudo systemctl status mysql

# Check queue workers
sudo supervisorctl status rentapp-queue-worker:*

# Check if backend is running
curl http://127.0.0.1:8000/api/health

# Check if frontend is running
curl http://127.0.0.1:3000
```

**Everything should show as "active" or return responses!**

---

## Troubleshooting

### Problem: "Permission denied" errors

**Solution:**
```bash
sudo chown -R $USER:$USER /var/www/webapp
sudo chmod -R 775 /var/www/webapp/backend/storage
sudo chmod -R 775 /var/www/webapp/backend/bootstrap/cache
```

### Problem: Website shows "502 Bad Gateway"

**Check if services are running:**
```bash
# Backend (Laravel via PHP-FPM)
sudo systemctl status php8.2-fpm

# Restart if needed
sudo systemctl restart php8.2-fpm

# Web server
sudo systemctl status nginx
sudo systemctl restart nginx

# Frontend (if hosted on same server)
curl http://127.0.0.1:3000
cd /var/www/webapp/frontend
nohup npm start > /dev/null 2>&1 &
```

### Problem: Database connection error

**Check database:**
```bash
# Test connection
mysql -u rentapp_user -p rentapp_production
```

**If it doesn't work:**
1. Check `.env` file has correct database credentials
2. Make sure database was created
3. Make sure user has permissions

### Problem: "File not found" or uploads don't work

**Solution:**
```bash
cd /var/www/webapp/backend
php artisan storage:link
sudo chmod -R 775 storage
sudo chown -R www-data:www-data storage
```

### Problem: Can't access the website

**Check firewall:**
```bash
# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Check firewall status
sudo ufw status
```

### Problem: Services stop after disconnecting

PHP-FPM and Nginx are managed by systemd, so they automatically restart. If you are running the Next.js frontend on the same server, use Supervisor to keep the Node process alive:

Create frontend supervisor config:
```bash
sudo nano /etc/supervisor/conf.d/rentapp-frontend.conf
```

Paste:
```ini
[program:rentapp-frontend]
command=npm start
directory=/var/www/webapp/frontend
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/webapp/frontend/.next/frontend.log
environment=NODE_ENV="production"
```

Reload supervisor:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start rentapp-backend
sudo supervisorctl start rentapp-frontend
```

### Problem: GitHub Actions deployment fails

**Check:**
1. SSH keys are set up correctly
2. All GitHub secrets are added
3. Server is accessible via SSH
4. Test SSH connection manually:
   ```bash
   ssh -i ~/.ssh/github_actions_deploy root@YOUR_SERVER_IP
   ```

### Problem: Queue workers not processing jobs

**Check status:**
```bash
sudo supervisorctl status rentapp-queue-worker:*
```

**Restart if needed:**
```bash
sudo supervisorctl restart rentapp-queue-worker:*
```

**Check logs:**
```bash
tail -f /var/www/webapp/backend/storage/logs/queue-worker.log
```

---

## Quick Reference Commands

**Check application status:**
```bash
cd /var/www/webapp/backend
php artisan about
```

**View logs:**
```bash
# Application logs
tail -f /var/www/webapp/backend/storage/logs/laravel.log

# Queue worker logs
tail -f /var/www/webapp/backend/storage/logs/queue-worker.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

**Restart services:**
```bash
# Restart Nginx
sudo systemctl restart nginx

# Restart PHP-FPM
sudo systemctl restart php8.2-fpm

# Restart queue workers
sudo supervisorctl restart rentapp-queue-worker:*

# Restart backend (if using supervisor)
sudo supervisorctl restart rentapp-backend

# Restart frontend (if using supervisor)
sudo supervisorctl restart rentapp-frontend
```

**Manual deployment:**
```bash
cd /var/www/webapp
./deploy.sh
```

**Clear cache:**
```bash
cd /var/www/webapp/backend
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan optimize
```

---

## What to Do After Deployment

1. **Create your first admin user** (if not already created)
2. **Configure email settings** in the admin panel
3. **Set up SMS** (if you want SMS notifications)
4. **Test all features:**
   - Create a property
   - Add a tenant
   - Generate an invoice
   - Send a notification
5. **Set up monitoring** (optional but recommended):
   - Use UptimeRobot (free) to monitor your site
   - Set up alerts for downtime
6. **Set up backups:**
   ```bash
   # Add to crontab for daily backups at 2 AM
   sudo crontab -e
   # Add this line:
   0 2 * * * /var/www/webapp/scripts/backup-database.sh
   ```

---

## Need Help?

If you get stuck:

1. **Check the logs** (see Quick Reference above)
2. **Check service status** (see Quick Reference above)
3. **Review the troubleshooting section** above
4. **Check error messages** - they usually tell you what's wrong
5. **Make sure you copied commands exactly** - even small typos can cause issues

---

## Success Checklist

Before considering deployment complete, verify:

- [ ] Website loads in browser
- [ ] API health check works (`/api/health`)
- [ ] Can log in to the application
- [ ] Database connection works
- [ ] File uploads work
- [ ] Queue workers are running
- [ ] Scheduled tasks are set up
- [ ] SSL certificate is installed (if using domain)
- [ ] GitHub Actions deployment works (if set up)
- [ ] All services start automatically on server reboot

---

**Congratulations! Your application should now be deployed and running! 🎉**

If you followed all steps, your RentApplication should be live and accessible. Remember to keep your server updated and monitor it regularly.

---

**Last Updated:** Generated for easy deployment  
**Difficulty Level:** Beginner-friendly with copy-paste commands

